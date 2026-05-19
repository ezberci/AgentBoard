import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../lib/logger.js";
import * as tools from "./tools.js";

const server = new Server(
  { name: "agent-board", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_context",
      description: "Return current project context with columns and recent tasks.",
      inputSchema: {
        type: "object",
        properties: { project_id: { type: "integer" } },
      },
    },
    {
      name: "list_projects",
      description: "List all projects.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_project",
      description: "Get project detail.",
      inputSchema: {
        type: "object",
        properties: { project_id: { type: "integer" } },
        required: ["project_id"],
      },
    },
    {
      name: "list_tasks",
      description: "List tasks with optional filters.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "integer" },
          status: { type: "string" },
          agent_id: { type: "integer" },
          priority_gte: { type: "integer" },
        },
        required: ["project_id"],
      },
    },
    {
      name: "get_task",
      description: "Get task detail with comments.",
      inputSchema: {
        type: "object",
        properties: { task_id: { type: "integer" } },
        required: ["task_id"],
      },
    },
    {
      name: "create_task",
      description: "Create a new task.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "integer" },
          agent_id: { type: "integer" },
        },
        required: ["project_id", "title"],
      },
    },
    {
      name: "update_task",
      description: "Update task fields.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "integer" },
          description: { type: "string" },
          result: { type: "string" },
          priority: { type: "integer" },
        },
        required: ["task_id"],
      },
    },
    {
      name: "delete_task",
      description: "Delete a task.",
      inputSchema: {
        type: "object",
        properties: { task_id: { type: "integer" } },
        required: ["task_id"],
      },
    },
    {
      name: "list_agents",
      description: "List all agents.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_agent",
      description: "Get agent detail with skills.",
      inputSchema: {
        type: "object",
        properties: { agent_id: { type: "integer" } },
        required: ["agent_id"],
      },
    },
    {
      name: "list_skills",
      description: "List all skills.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_skill",
      description: "Get skill detail.",
      inputSchema: {
        type: "object",
        properties: { skill_id: { type: "integer" } },
        required: ["skill_id"],
      },
    },
    {
      name: "assign_agent_to_task",
      description: "Assign an agent to a task.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "integer" },
          agent_id: { type: "integer" },
        },
        required: ["task_id", "agent_id"],
      },
    },
    {
      name: "unassign_agent",
      description: "Unassign the agent from a task.",
      inputSchema: {
        type: "object",
        properties: { task_id: { type: "integer" } },
        required: ["task_id"],
      },
    },
    {
      name: "claim_next_task",
      description: "Atomically claim the next available task for an agent.",
      inputSchema: {
        type: "object",
        properties: {
          agent_id: { type: "integer" },
          project_id: { type: "integer" },
        },
        required: ["agent_id", "project_id"],
      },
    },
    {
      name: "complete_task",
      description:
        "Complete a task by writing a result and moving it to the terminal column.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "integer" },
          result: { type: "string" },
        },
        required: ["task_id", "result"],
      },
    },
    {
      name: "add_task_comment",
      description: "Add a comment to a task.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "integer" },
          body: { type: "string" },
          author: { type: "string" },
        },
        required: ["task_id", "body"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  let result: unknown;

  try {
    switch (name) {
      case "get_context":
        result = await tools.getContext((args as { project_id?: number }).project_id);
        break;
      case "list_projects":
        result = await tools.listProjects();
        break;
      case "get_project":
        result = await tools.getProject((args as { project_id: number }).project_id);
        break;
      case "list_tasks":
        result = await tools.listTasks(
          (args as { project_id: number }).project_id,
          (args as { status?: string }).status,
          (args as { agent_id?: number }).agent_id,
          (args as { priority_gte?: number }).priority_gte
        );
        break;
      case "get_task":
        result = await tools.getTask((args as { task_id: number }).task_id);
        break;
      case "create_task":
        result = await tools.createTask(
          (args as { project_id: number }).project_id,
          (args as { title: string }).title,
          (args as { description?: string }).description,
          (args as { priority?: number }).priority,
          (args as { agent_id?: number }).agent_id
        );
        break;
      case "update_task":
        result = await tools.updateTask(
          (args as { task_id: number }).task_id,
          (args as { description?: string }).description,
          (args as { result?: string }).result,
          (args as { priority?: number }).priority
        );
        break;
      case "delete_task":
        result = await tools.deleteTask((args as { task_id: number }).task_id);
        break;
      case "list_agents":
        result = await tools.listAgents();
        break;
      case "get_agent":
        result = await tools.getAgent((args as { agent_id: number }).agent_id);
        break;
      case "list_skills":
        result = await tools.listSkills();
        break;
      case "get_skill":
        result = await tools.getSkill((args as { skill_id: number }).skill_id);
        break;
      case "assign_agent_to_task":
        result = await tools.assignAgentToTask(
          (args as { task_id: number }).task_id,
          (args as { agent_id: number }).agent_id
        );
        break;
      case "unassign_agent":
        result = await tools.unassignAgent((args as { task_id: number }).task_id);
        break;
      case "claim_next_task":
        result = await tools.claimNextTask(
          (args as { agent_id: number }).agent_id,
          (args as { project_id: number }).project_id
        );
        break;
      case "complete_task":
        result = await tools.completeTask(
          (args as { task_id: number }).task_id,
          (args as { result: string }).result
        );
        break;
      case "add_task_comment":
        result = await tools.addTaskComment(
          (args as { task_id: number }).task_id,
          (args as { body: string }).body,
          (args as { author?: string }).author
        );
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  } catch (e) {
    logger.error({ err: e, tool: name }, "mcp_tool_error");
    throw e;
  }
});

export async function runMcpServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP server started on stdio");
}
