import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  action: z.enum(["list", "add", "update", "delete"]),
  items: z.array(z.string().min(1)).optional(),
  item_id: z.number().int().optional(),
  completed: z.boolean().optional(),
});

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

const todos = new Map<number, TodoItem[]>();

function getNextId(items: TodoItem[]): number {
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "todo",
  description: "Manage a todo list for the current task run. Actions: list, add, update (toggle completion), delete.",
  parameters,
  async execute(params, ctx) {
    const { action } = params;
    const list = todos.get(ctx.taskRunId) ?? [];

    if (action === "list") {
      if (list.length === 0) return "No todos yet.";
      return list
        .map((item) => `${item.completed ? "[x]" : "[ ]"} ${item.id}: ${item.text}`)
        .join("\n");
    }

    if (action === "add") {
      const newItems = params.items ?? [];
      for (const text of newItems) {
        list.push({ id: getNextId(list), text, completed: false });
      }
      todos.set(ctx.taskRunId, list);
      ctx.logger.info({ count: newItems.length }, "todo: added items");
      return `Added ${newItems.length} todo(s).\n\n${list
        .map((item) => `${item.completed ? "[x]" : "[ ]"} ${item.id}: ${item.text}`)
        .join("\n")}`;
    }

    if (action === "update") {
      const id = params.item_id;
      if (id === undefined) throw new Error("item_id is required for update");
      const item = list.find((i) => i.id === id);
      if (!item) throw new Error(`Todo item ${id} not found`);
      item.completed = params.completed ?? !item.completed;
      todos.set(ctx.taskRunId, list);
      return `Updated item ${id}.\n\n${list
        .map((item) => `${item.completed ? "[x]" : "[ ]"} ${item.id}: ${item.text}`)
        .join("\n")}`;
    }

    if (action === "delete") {
      const id = params.item_id;
      if (id === undefined) throw new Error("item_id is required for delete");
      const next = list.filter((i) => i.id !== id);
      if (next.length === list.length) throw new Error(`Todo item ${id} not found`);
      todos.set(ctx.taskRunId, next);
      return `Deleted item ${id}.`;
    }

    return "Unknown action.";
  },
};
