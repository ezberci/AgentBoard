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
