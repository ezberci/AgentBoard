import { exec } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  command: z.string().min(1).describe("The shell command to execute"),
  cwd: z.string().optional().describe("Working directory for the command"),
  timeout: z
    .number()
    .int()
    .min(1)
    .max(3600)
    .optional()
    .describe("Timeout in seconds (default 60)"),
});

const execAsync = promisify(exec);

const DANGEROUS_PATTERNS = [
  /\brm\s+(-[a-z]*r[a-z]*f[a-z]*|-[a-z]*f[a-z]*r[a-z]*)\s+['"]?\/\*?['"]?(\s|$)/i,
  />[ \t]*\/dev\/sda\b/,
  /\bdd\s+.*if=\/dev\/zero\b/,
  /\bmkfs\.?\w*\b/,
  /:\(\)\s*\{[^}]*:\|:[^}]*\}/,
];

function isDangerous(command: string): boolean {
  const normalized = command.trim().toLowerCase();
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "shell",
  description:
    "Execute a shell command and return its output. The command runs synchronously and blocks until completion.",
  parameters,
  async execute(params, ctx) {
    if (isDangerous(params.command)) {
      ctx.logger.warn({ command: params.command }, "Blocked dangerous shell command");
      return { error: "Dangerous command blocked for safety" };
    }

    const cwd = resolve(ctx.workingDir, params.cwd ?? ".");
    const workingDirWithSep = ctx.workingDir.endsWith("/")
      ? ctx.workingDir
      : ctx.workingDir + "/";
    if (cwd !== ctx.workingDir && !cwd.startsWith(workingDirWithSep)) {
      ctx.logger.warn(
        { cwd, workingDir: ctx.workingDir },
        "Blocked path traversal in shell cwd",
      );
      return { error: "Invalid working directory: path traversal detected" };
    }

    const timeoutMs = (params.timeout ?? 60) * 1000;

    ctx.logger.info(
      { command: params.command, cwd, timeoutMs },
      "Executing shell command",
    );

    try {
      const { stdout, stderr } = await execAsync(params.command, {
        cwd,
        timeout: timeoutMs,
        killSignal: "SIGTERM",
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
    } catch (err: unknown) {
      const execErr = err as {
        stdout?: string;
        stderr?: string;
        code?: number;
        killed?: boolean;
        message?: string;
      };

      ctx.logger.warn(
        {
          command: params.command,
          code: execErr.code,
          killed: execErr.killed,
          error: execErr.message,
        },
        "Shell command failed or was killed",
      );

      return {
        error: execErr.message ?? "Command failed",
        stdout: execErr.stdout?.trim() ?? "",
        stderr: execErr.stderr?.trim() ?? "",
        exitCode: execErr.code ?? -1,
      };
    }
  },
};
