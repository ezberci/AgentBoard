import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  path: z.string().min(1),
});

const KEY_CONFIG_FILES = [
  "package.json",
  "tsconfig.json",
  "Cargo.toml",
  "pyproject.toml",
  "setup.py",
  "requirements.txt",
  "go.mod",
  "Dockerfile",
  "docker-compose.yml",
  "Makefile",
  "README.md",
  "LICENSE",
  ".gitignore",
];

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "repo_overview",
  description: "Summarize a repository's top-level structure, file counts by extension, and key config files.",
  parameters,
  async execute(params, ctx) {
    const repoPath = path.resolve(ctx.workingDir, params.path);
    ctx.logger.info({ repoPath }, "repo_overview: analyzing");

    const entries = await fs.promises.readdir(repoPath, { withFileTypes: true });

    const dirs: string[] = [];
    const files: string[] = [];
    const extensionCounts = new Map<string, number>();
    const foundConfigFiles: string[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      if (entry.isDirectory()) {
        dirs.push(entry.name);
      } else if (entry.isFile()) {
        files.push(entry.name);
        const ext = path.extname(entry.name).toLowerCase();
        extensionCounts.set(ext, (extensionCounts.get(ext) || 0) + 1);
        if (KEY_CONFIG_FILES.includes(entry.name)) {
          foundConfigFiles.push(entry.name);
        }
      }
    }

    const lines: string[] = [];
    lines.push(`Repository: ${repoPath}`);
    lines.push(`Top-level directories (${dirs.length}): ${dirs.join(", ") || "none"}`);
    lines.push(`Top-level files (${files.length}): ${files.join(", ") || "none"}`);

    if (extensionCounts.size > 0) {
      const sorted = Array.from(extensionCounts.entries()).sort((a, b) => b[1] - a[1]);
      lines.push(`File extensions: ${sorted.map(([ext, count]) => `${ext || "(no ext)"}: ${count}`).join(", ")}`);
    }

    if (foundConfigFiles.length > 0) {
      lines.push(`Key config files: ${foundConfigFiles.join(", ")}`);
    }

    ctx.logger.info({ repoPath }, "repo_overview: done");
    return lines.join("\n");
  },
};
