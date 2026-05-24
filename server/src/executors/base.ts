import type { ToolDefinition } from "../tools/types.js";

export interface SkillContext {
  name: string;
  instructions?: string | null;
  allowed_tools?: string | null;
}

export interface ExecutorContext {
  systemPrompt?: string;
  skills?: SkillContext[];
  tools?: ToolDefinition[];
}

export interface BaseExecutor {
  run(prompt: string, modelConfig: Record<string, unknown>, context?: ExecutorContext): AsyncIterable<string>;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolCallResult {
  id: string;
  name: string;
  output: string;
}
