export interface SkillContext {
  name: string;
  instructions?: string | null;
  allowed_tools?: string | null;
}

export interface ExecutorContext {
  systemPrompt?: string;
  skills?: SkillContext[];
}

export interface BaseExecutor {
  run(prompt: string, modelConfig: Record<string, unknown>, context?: ExecutorContext): AsyncIterable<string>;
}
