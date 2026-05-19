import type { BaseExecutor } from "./base.js";
import { DeepSeekExecutor } from "./deepseek.js";

const executors: Record<string, () => BaseExecutor> = {
  deepseek: () => new DeepSeekExecutor(),
};

export function getExecutor(provider: string): BaseExecutor {
  const factory = executors[provider];
  if (!factory) {
    throw new Error(`Unknown executor provider: ${provider}`);
  }
  return factory();
}

export function registerExecutor(provider: string, factory: () => BaseExecutor): void {
  executors[provider] = factory;
}
