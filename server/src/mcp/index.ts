import "../lib/config.js";
import { runMcpServer } from "./server.js";

runMcpServer().catch((err) => {
  console.error("MCP server failed:", err);
  process.exit(1);
});
