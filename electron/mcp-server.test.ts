import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMcpService, type McpService, type McpSettings } from "./mcp-server";

let userDataDir = "";

vi.mock("electron", () => ({
  app: { getName: () => "matko", getPath: () => userDataDir },
  dialog: { showOpenDialog: vi.fn() },
}));

process.env.APP_ROOT = process.cwd();

let settings: McpSettings;
let service: McpService;

beforeEach(async () => {
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "matko-mcp-server-"));
  // Port 0: the OS picks a free one, so tests never fight over the default.
  settings = { enabled: false, port: 0, token: null };
  service = createMcpService({
    appVersion: "test",
    store: { read: () => settings, write: (next) => (settings = next) },
    tools: { changed: () => {}, ownCourseEntry: async () => Promise.reject(new Error("unused")) },
  });
});

afterEach(async () => {
  await service.stop();
  await fs.rm(userDataDir, { force: true, recursive: true });
});

const initialize = {
  id: 1,
  jsonrpc: "2.0",
  method: "initialize",
  params: { capabilities: {}, clientInfo: { name: "test", version: "1" }, protocolVersion: "2025-06-18" },
};

function post(url: string, headers: Record<string, string>) {
  return fetch(url, {
    body: JSON.stringify(initialize),
    headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json", ...headers },
    method: "POST",
  });
}

// A request naming another host (a web page's DNS rebinding): fetch can't set
// Host, so plain http.
function statusWithHost(url: string, host: string, token: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      url,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Host: host }, method: "POST" },
      (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      },
    );
    request.on("error", reject);
    request.end(JSON.stringify(initialize));
  });
}

describe("the MCP server", () => {
  it("is off until turned on, then makes a token and listens on this computer only", async () => {
    expect(service.status()).toMatchObject({ enabled: false, running: false, url: null });

    const status = await service.setEnabled(true);

    expect(status).toMatchObject({ enabled: true, running: true });
    expect(status.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
    expect(status.token).toMatch(/^[\w-]{32}$/);
    expect(settings.port).not.toBe(0);

    await service.setEnabled(false);
    expect(service.status()).toMatchObject({ enabled: false, running: false });
  });

  it("refuses a missing or wrong token, and requests from web pages", async () => {
    const { token, url } = await service.setEnabled(true);

    expect((await post(url!, {})).status).toBe(401);
    expect((await post(url!, { Authorization: "Bearer wrong" })).status).toBe(401);
    expect((await post(url!, { Authorization: `Bearer ${token}`, Origin: "https://example.com" })).status).toBe(403);
    expect(await statusWithHost(url!, "attacker.example", token!)).toBe(403);
    expect((await post(url!, { Authorization: `Bearer ${token}` })).status).toBe(200);
  });

  it("serves an MCP client with the token, and a new token cuts the old one off", async () => {
    const { token, url } = await service.setEnabled(true);
    const connect = async (bearer: string) => {
      const client = new Client({ name: "test", version: "1" });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(url!), { requestInit: { headers: { Authorization: `Bearer ${bearer}` } } }),
      );
      return client;
    };

    const client = await connect(token!);
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain("create_course");
    expect(await client.callTool({ arguments: {}, name: "list_courses" })).toMatchObject({ content: [{ text: "[]" }] });
    await client.close();

    const { token: newToken } = service.regenerateToken();
    expect(newToken).not.toBe(token);
    await expect(connect(token!)).rejects.toThrow();
    await (await connect(newToken!)).close();
  });

  it("takes another port when its own is taken, and keeps it", async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", () => resolve()));
    const taken = (blocker.address() as net.AddressInfo).port;
    settings = { ...settings, port: taken };

    const { url } = await service.setEnabled(true);

    expect(url).not.toContain(`:${taken}/`);
    expect(settings.port).not.toBe(taken);
    await new Promise((resolve) => blocker.close(resolve));
  });
});
