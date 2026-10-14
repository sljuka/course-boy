import { randomBytes, timingSafeEqual } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import type { McpStatus } from "../src/lib/mcp";
import { registerMcpTools, type McpToolDeps } from "./mcp-tools";

// Matko's MCP server (SLJ-68): an agent on this computer (Claude Code, Claude
// Desktop, …) makes courses and programs on the open profile through the
// tools in mcp-tools.ts.
//
// - Off until turned on in Settings, per profile; runs only while Matko does,
//   for the open profile (stopped on a profile switch).
// - HTTP on 127.0.0.1 only, never another interface. Every request needs the
//   profile's token (`Authorization: Bearer <token>`), shown in Settings; a
//   new one can be made there, which cuts off every agent using the old one.
// - Requests from web pages are refused: they carry an `Origin` header, and a
//   `Host` other than this computer (DNS rebinding) is refused too.
// - Stateless: each request gets its own server and transport, so nothing is
//   kept between calls and a restart never strands an agent.

export type McpSettings = { enabled: boolean; port: number | null; token: string | null };

export type McpSettingsStore = {
  read(): McpSettings;
  write(settings: McpSettings): void;
};

// Tried first, so the address agents keep in their settings stays the same;
// another free one when it's taken (and then kept).
export const DEFAULT_MCP_PORT = 47_820;
const MAX_BODY_BYTES = 4 * 1024 * 1024;

export function createMcpToken(): string {
  return randomBytes(24).toString("base64url");
}

function isTokenValid(header: string | undefined, token: string): boolean {
  const match = header?.match(/^Bearer (.+)$/);
  if (!match) return false;
  const given = Buffer.from(match[1]);
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function isLocalHost(host: string | undefined, port: number): boolean {
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
}

function readBody(request: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(chunks.length === 0 ? undefined : JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendError(response: http.ServerResponse, status: number, message: string): void {
  response.writeHead(status, { "Content-Type": "application/json" }).end(
    JSON.stringify({ error: { code: -32_000, message }, id: null, jsonrpc: "2.0" }),
  );
}

export function createMcpService({
  appVersion,
  store,
  tools,
}: {
  appVersion: string;
  store: McpSettingsStore;
  tools: McpToolDeps;
}) {
  let server: http.Server | null = null;
  let port: number | null = null;
  let error: string | null = null;

  async function handle(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
    const { token } = store.read();
    if (request.headers.origin !== undefined || port === null || !isLocalHost(request.headers.host, port)) {
      return sendError(response, 403, "Only agents on this computer can connect");
    }
    if (!token || !isTokenValid(request.headers.authorization, token)) {
      return sendError(response, 401, "Missing or wrong token: copy it from Matko's Settings → Agents");
    }
    if (new URL(request.url ?? "/", "http://127.0.0.1").pathname !== "/mcp") {
      return sendError(response, 404, "Not found: the address is /mcp");
    }
    if (request.method !== "POST") {
      // Stateless: no stream for the server to push on, no session to end.
      return sendError(response, 405, "Method not allowed");
    }

    const mcp = new McpServer({ name: "matko", version: appVersion });
    registerMcpTools(mcp, tools);
    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true, sessionIdGenerator: undefined });
    response.on("close", () => {
      void transport.close();
      void mcp.close();
    });
    await mcp.connect(transport);
    await transport.handleRequest(request, response, await readBody(request));
  }

  function listen(onPort: number): Promise<http.Server> {
    return new Promise((resolve, reject) => {
      const candidate = http.createServer((request, response) => {
        handle(request, response).catch((failure: unknown) => {
          console.error("[mcp] request failed:", failure);
          if (!response.headersSent) sendError(response, 500, "Internal error");
        });
      });
      candidate.once("error", reject);
      candidate.listen(onPort, "127.0.0.1", () => {
        candidate.off("error", reject);
        resolve(candidate);
      });
    });
  }

  async function start(): Promise<void> {
    const settings = store.read();
    if (!settings.enabled || server) return;
    if (!settings.token) store.write({ ...settings, token: createMcpToken() });
    try {
      server = await listen(settings.port ?? DEFAULT_MCP_PORT).catch((failure: NodeJS.ErrnoException) => {
        if (failure.code !== "EADDRINUSE") throw failure;
        return listen(0);
      });
      port = (server.address() as AddressInfo).port;
      store.write({ ...store.read(), port });
      error = null;
    } catch (failure) {
      server = null;
      port = null;
      error = failure instanceof Error ? failure.message : String(failure);
      console.error("[mcp] couldn't start:", failure);
    }
  }

  function stop(): Promise<void> {
    const stopping = server;
    server = null;
    port = null;
    if (!stopping) return Promise.resolve();
    return new Promise((resolve) => {
      stopping.close(() => resolve());
      stopping.closeAllConnections();
    });
  }

  function status(): McpStatus {
    const settings = store.read();
    return {
      enabled: settings.enabled,
      error: settings.enabled ? error : null,
      running: server !== null,
      token: settings.token,
      url: port === null ? null : `http://127.0.0.1:${port}/mcp`,
    };
  }

  return {
    start,
    status,
    stop,

    async setEnabled(enabled: boolean): Promise<McpStatus> {
      store.write({ ...store.read(), enabled });
      if (enabled) await start();
      else await stop();
      return status();
    },

    // A new token: agents using the old one can't connect any more.
    regenerateToken(): McpStatus {
      store.write({ ...store.read(), token: createMcpToken() });
      return status();
    },
  };
}

export type McpService = ReturnType<typeof createMcpService>;
