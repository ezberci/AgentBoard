import type { Logger } from "pino";

/**
 * Runtime context passed to every tool execution.
 */
export interface ToolContext {
  /** ID of the task run that triggered the tool call. */
  taskRunId: number;

  /** ID of the agent that owns the tool. */
  agentId: number;

  /** Absolute working directory for file-system operations. */
  workingDir: string;

  /** Abort signal for cancellation/timeouts. */
  abortSignal: AbortSignal;

  /** Pino logger instance. */
  logger: Logger;
}
