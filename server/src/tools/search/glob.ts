import { z } from "zod";
import { readdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { minimatch } from "minimatch";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  pattern: z.string().describe("Glob pattern like **/*.ts"),
  path: z.string().optional().describe("Directory to search in, defaults to working directory"),
});

function resolveSearchPath(inputPath: string | undefined, workingDir: string): string {
  const target = inputPath ? resolve(workingDir, inputPath) : workingDir;
  const rel = relative(workingDir, target);
  if (rel.startsWith("..") || rel.startsWith("/")) {
    throw new Error(`Path traversal blocked: ${inputPath ?? "."}`);
  }
  return target;
}

function collectFiles(
  dir: string,
  workingDir: string,
  pattern: string,
  limit: number,
): { paths: string[]; truncated: boolean } {
  const paths: string[] = [];
  let truncated = false;

  function walk(currentDir: string) {
    if (truncated) return;
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (truncated) break;
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = relative(workingDir, fullPath);
        if (minimatch(relPath, pattern, { dot: true, matchBase: true })) {
          paths.push(relPath);
          if (paths.length >= limit) {
            truncated = true;
          }
        }
      }
    }
  }

  walk(dir);
  return { paths, truncated };
}

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "glob",
  description:
    "Find files matching a glob pattern. Searches recursively and returns up to 100 matching file paths.",
  parameters,
  async execute(params, ctx) {
    const searchPath = resolveSearchPath(params.path, ctx.workingDir);
    const { paths, truncated } = collectFiles(searchPath, ctx.workingDir, params.pattern, 100);

    let result = paths.join("\n");
    if (truncated) {
      result += "\n\n(results truncated to 100 files)";
    }

    ctx.logger.debug(
      { tool: "glob", pattern: params.pattern, path: searchPath, count: paths.length },
      "glob executed",
    );
    return result;
  },
};
