/**
 * Routes: /api/mcp-info
 *   GET    /mcp-info              - return MCP server connection info
 */
import { Hono } from "hono";

const app = new Hono();

app.get("/mcp-info", (c) => {
  return c.json({
    name: "agent-board",
    transport: "stdio",
    command: "npm run mcp",
  });
});

export default app;
