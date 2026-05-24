import { exec } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  url: z.string().min(1),
  path: z.string().optional(),
});

function execPromise(command: string, options: { cwd?: string; signal?: AbortSignal } = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(command, { cwd: options.cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });

    options.signal?.addEventListener("abort", () => {
      child.kill();
      reject(new Error("Aborted"));
    });
  });
}

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "repo_clone",
  description: "Clone a git repository into the working directory.",
  parameters,
  async execute(params, ctx) {
    const { url, path: targetPath } = params;

    let dest: string;
    if (targetPath) {
      dest = path.resolve(ctx.workingDir, targetPath);
    } else {
      // Derive repo name from URL
      const match = url.match(/\/([^/]+?)(?:\.git)?$/);
      const repoName = match ? match[1] : "repo";
      dest = path.resolve(ctx.workingDir, repoName);
    }

    ctx.logger.info({ url, dest }, "repo_clone: cloning");

    const command = `git clone "${url}" "${dest}"`;
    await execPromise(command, { signal: ctx.abortSignal });

    ctx.logger.info({ url, dest }, "repo_clone: done");
    return `Cloned ${url} to ${dest}`;
  },
};
