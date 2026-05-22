import { getRequestListener } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger as honoLogger } from "hono/logger";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { env } from "./lib/config.js";
import { logger } from "./lib/logger.js";

import { requireAuth } from "./middleware/auth.js";
import agents from "./routes/agents.js";
import columns from "./routes/columns.js";
import mcpInfo from "./routes/mcpInfo.js";
import models from "./routes/models.js";
import projects from "./routes/projects.js";
import skills from "./routes/skills.js";
import tasks from "./routes/tasks.js";
import { manager } from "./ws/manager.js";

export const app = new Hono();

app.use(honoLogger());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "x-api-key"],
    credentials: true,
  })
);

// Public routes
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Protected routes
app.use("/api/*", requireAuth);

// Mount route modules — each module registers its own sub-paths under /api.
// See the JSDoc header in each routes/*.ts file for endpoint listings.
app.route("/api", projects);   // /api/projects
app.route("/api", columns);    // /api/columns, /api/projects/:id/columns
app.route("/api", tasks);      // /api/tasks, /api/projects/:id/tasks
app.route("/api", agents);     // /api/agents
app.route("/api", skills);     // /api/skills
app.route("/api", models);     // /api/models
app.route("/api", mcpInfo);    // /api/mcp-info

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  logger.error({ err }, "Unhandled error");
  return c.json({ error: "Internal server error" }, 500);
});

const server = createServer(getRequestListener(app.fetch));
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "", "http://localhost");
  const pathParts = url.pathname.split("/");
  if (pathParts[1] === "ws" && pathParts[2] === "projects" && pathParts[3]) {
    const projectId = Number(pathParts[3]);
    if (!manager.connectProject(ws, projectId)) return;
    ws.on("close", () => manager.disconnect(ws, projectId));
    ws.on("error", (err) => logger.warn({ err }, "websocket_error"));
  } else if (pathParts[1] === "ws" && pathParts[2] === "global") {
    if (!manager.connectGlobal(ws)) return;
    ws.on("close", () => manager.disconnect(ws));
    ws.on("error", (err) => logger.warn({ err }, "websocket_error"));
  } else {
    ws.close(1002, "Invalid path");
  }
});

const isMain = process.argv[1]?.includes("src/index.ts") ?? false;
if (isMain) {
  server.listen(env.port, () => {
    logger.info(`Server running on http://localhost:${env.port}`);
  });
}
