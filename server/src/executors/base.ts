export interface BaseExecutor {
  run(prompt: string, modelConfig: Record<string, unknown>): AsyncIterable<string>;
}
