// The MCP server's state for Settings → Agents (SLJ-68; electron/mcp-server.ts).
export type McpStatus = {
  enabled: boolean;
  // Why it isn't running although turned on (the port taken, say).
  error: string | null;
  running: boolean;
  // What an agent sends as `Authorization: Bearer <token>`.
  token: string | null;
  // Where agents connect, while it runs.
  url: string | null;
};
