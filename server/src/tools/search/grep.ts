import { z } from "zod";
import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { minimatch } from "minimatch";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  pattern: z.string().describe("Regex pattern to search for"),
  path: z.string().optional().describe("Directory to search in, defaults to working directory"),
  include: z.string().optional().describe("File filter glob like *.ts"),
});

function resolveSearchPath(inputPath: string | undefined, workingDir: string): string {
  const target = inputPath ? resolve(workingDir, inputPath) : workingDir;
  const rel = relative(workingDir, target);
  if (rel.startsWith("..") || rel.startsWith("/")) {
    throw new Error(`Path traversal blocked: ${inputPath ?? "."}`);
  }
  return target;
}

function spawnRg(
  cwd: string,
  pattern: string,
  include: string | undefined,
  limit: number,
): Promise<{ lines: string[]; truncated: boolean; available: boolean }> {
  return new Promise((resolve) => {
    const args = [
      "--line-number",
      "--no-heading",
      "--with-filename",
      "--color=never",
      "--no-binary",
    ];
    if (include) {
      args.push("-g", include);
    }
    args.push(pattern);
    args.push(".");

    const proc = spawn("rg", args, { cwd });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8");
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        resolve({ lines: [], truncated: false, available: false });
      } else {
        resolve({ lines: [], truncated: false, available: true });
      }
    });

    proc.on("close", () => {
      const allLines = stdout
        .split("\n")
      .filter((line) => line.trim() !== "");
      const truncated = allLines.length > limit;
      const lines = allLines.slice(0, limit);
      resolve({ lines, truncated, available: true });
    });
  });
}

function isTextFile(filePath: string): boolean {
  try {
    const buffer = readFileSync(filePath);
    for (let i = 0; i < Math.min(buffer.length, 8192); i++) {
      if (buffer[i] === 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function fallbackGrep(
  dir: string,
  workingDir: string,
  regex: RegExp,
  include: string | undefined,
  limit: number,
): { lines: string[]; truncated: boolean } {
  const lines: string[] = [];
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
        if (include && !minimatch(relPath, include, { dot: true, matchBase: true })) {
          continue;
        }
        if (!isTextFile(fullPath)) continue;

        const content = readFileSync(fullPath, "utf-8");
        const fileLines = content.split("\n");
        for (let i = 0; i < fileLines.length; i++) {
          if (regex.test(fileLines[i])) {
            lines.push(`${relPath}:${i + 1}: ${fileLines[i]}`);
            if (lines.length >= limit) {
              truncated = true;
              return;
            }
          }
        }
      }
    }
  }

  walk(dir);
  return { lines, truncated };
}

function formatRgLine(line: string): string {
  const firstColon = line.indexOf(":");
  if (firstColon === -1) return line;
  const secondColon = line.indexOf(":", firstColon + 1);
  if (secondColon === -1) return line;
  return `${line.slice(0, secondColon)}: ${line.slice(secondColon + 1)}`;
}

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "grep",
  description:
    "Search file contents with a regex pattern. Returns up to 100 matching lines in file:line: content format.",
  parameters,
  async execute(params, ctx) {
    const searchPath = resolveSearchPath(params.path, ctx.workingDir);

    let regex: RegExp;
    try {
      regex = new RegExp(params.pattern);
    } catch {
      return `Invalid regex pattern: ${params.pattern}`;
    }

    const rgResult = await spawnRg(searchPath, params.pattern, params.include, 100);

    if (rgResult.available) {
      const formatted = rgResult.lines.map(formatRgLine);
      let result = formatted.join("\n");
      if (rgResult.truncated) {
        result += "\n\n(results truncated to 100 matches)";
      }
      ctx.logger.debug(
        { tool: "grep", pattern: params.pattern, path: searchPath, count: formatted.length, engine: "rg" },
        "grep executed",
      );
      return result;
    }

    const fallback = fallbackGrep(searchPath, ctx.workingDir, regex, params.include, 100);
    let result = fallback.lines.join("\n");
    if (fallback.truncated) {
      result += "\n\n(results truncated to 100 matches)";
    }
    ctx.logger.debug(
      { tool: "grep", pattern: params.pattern, path: searchPath, count: fallback.lines.length, engine: "fallback" },
      "grep executed",
    );
    return result;
  },
};
