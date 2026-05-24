import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";
import { resolvePath } from "./utils.js";

export const parameters = z.object({
  patchText: z.string().describe("Patch text in the stripped-down patch format"),
});

type HunkLine =
  | { type: "context"; text: string }
  | { type: "remove"; text: string }
  | { type: "add"; text: string };

interface Hunk {
  context?: string;
  lines: HunkLine[];
}

type PatchOp =
  | { type: "add"; path: string; content: string }
  | { type: "delete"; path: string }
  | { type: "update"; path: string; moveTo?: string; hunks: Hunk[] };

function isDirective(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("*** Add File:") ||
    t.startsWith("*** Update File:") ||
    t.startsWith("*** Delete File:") ||
    t.startsWith("*** End Patch") ||
    t.startsWith("*** End of File")
  );
}

function parsePatch(patchText: string): PatchOp[] {
  const lines = patchText.split(/\r?\n/);
  let i = 0;

  while (i < lines.length && !lines[i].trim().startsWith("*** Begin Patch")) {
    i++;
  }
  if (i >= lines.length) {
    throw new Error("Missing *** Begin Patch marker");
  }
  i++;

  const ops: PatchOp[] = [];

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith("*** End Patch")) {
      i++;
      break;
    }

    if (trimmed.startsWith("*** Add File:")) {
      const filePath = trimmed.slice("*** Add File:".length).trim();
      i++;
      const contentLines: string[] = [];
      while (i < lines.length && !isDirective(lines[i])) {
        const raw = lines[i];
        if (!raw.startsWith("+")) {
          throw new Error(`Invalid Add File line (missing '+'): ${raw}`);
        }
        contentLines.push(raw.slice(1));
        i++;
      }
      ops.push({ type: "add", path: filePath, content: contentLines.join("\n") });
      continue;
    }

    if (trimmed.startsWith("*** Delete File:")) {
      const filePath = trimmed.slice("*** Delete File:".length).trim();
      i++;
      ops.push({ type: "delete", path: filePath });
      continue;
    }

    if (trimmed.startsWith("*** Update File:")) {
      const filePath = trimmed.slice("*** Update File:".length).trim();
      i++;

      let moveTo: string | undefined;
      if (i < lines.length && lines[i].trim().startsWith("*** Move to:")) {
        moveTo = lines[i].trim().slice("*** Move to:".length).trim();
        i++;
      }

      const hunks: Hunk[] = [];

      while (i < lines.length && !isDirective(lines[i])) {
        const hunkTrimmed = lines[i].trim();

        if (hunkTrimmed.startsWith("@@")) {
          const context = hunkTrimmed.slice(2).trim();
          i++;

          const hunkLines: HunkLine[] = [];
          while (i < lines.length && !isDirective(lines[i]) && !lines[i].trim().startsWith("@@")) {
            const raw = lines[i];
            if (raw.startsWith("-")) {
              hunkLines.push({ type: "remove", text: raw.slice(1) });
            } else if (raw.startsWith("+")) {
              hunkLines.push({ type: "add", text: raw.slice(1) });
            } else if (raw.startsWith(" ")) {
              hunkLines.push({ type: "context", text: raw.slice(1) });
            } else {
              hunkLines.push({ type: "context", text: raw });
            }
            i++;
          }

          hunks.push({ context, lines: hunkLines });
        } else if (hunkTrimmed === "") {
          i++;
        } else {
          throw new Error(`Unexpected line in update section: ${lines[i]}`);
        }
      }

      ops.push({ type: "update", path: filePath, moveTo, hunks });
      continue;
    }

    if (trimmed === "") {
      i++;
      continue;
    }

    throw new Error(`Unknown patch directive: ${lines[i]}`);
  }

  return ops;
}

function applyHunk(content: string, hunk: Hunk): string {
  const searchLines: string[] = [];
  const replaceLines: string[] = [];

  for (const line of hunk.lines) {
    if (line.type === "remove") {
      searchLines.push(line.text);
    } else if (line.type === "add") {
      replaceLines.push(line.text);
    } else {
      searchLines.push(line.text);
      replaceLines.push(line.text);
    }
  }

  const search = searchLines.join("\n");
  const replace = replaceLines.join("\n");

  const idx = content.indexOf(search);
  if (idx === -1) {
    throw new Error(`Could not find patch context:\n${search}`);
  }

  return content.slice(0, idx) + replace + content.slice(idx + search.length);
}

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "apply_patch",
  description: "Apply a stripped-down patch to add, update, move, or delete files.",
  parameters,
  async execute(params, ctx) {
    const ops = parsePatch(params.patchText);
    const results: string[] = [];

    for (const op of ops) {
      if (op.type === "add") {
        const target = resolvePath(op.path, ctx.workingDir);

        let exists = false;
        try {
          await fs.access(target);
          exists = true;
        } catch {
          exists = false;
        }
        if (exists) {
          throw new Error(`Add File Error - file already exists: ${op.path}`);
        }

        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, op.content, "utf-8");
        results.push(`Added ${op.path}`);
        ctx.logger.info({ path: op.path }, "patch add");
      } else if (op.type === "delete") {
        const target = resolvePath(op.path, ctx.workingDir);
        await fs.unlink(target);
        results.push(`Deleted ${op.path}`);
        ctx.logger.info({ path: op.path }, "patch delete");
      } else if (op.type === "update") {
        const target = resolvePath(op.path, ctx.workingDir);
        let content = await fs.readFile(target, "utf-8");

        for (const hunk of op.hunks) {
          content = applyHunk(content, hunk);
        }

        if (op.moveTo) {
          const newTarget = resolvePath(op.moveTo, ctx.workingDir);
          await fs.mkdir(path.dirname(newTarget), { recursive: true });
          await fs.writeFile(newTarget, content, "utf-8");
          await fs.unlink(target);
          results.push(`Updated and moved ${op.path} -> ${op.moveTo}`);
          ctx.logger.info({ oldPath: op.path, newPath: op.moveTo }, "patch update+move");
        } else {
          await fs.writeFile(target, content, "utf-8");
          results.push(`Updated ${op.path}`);
          ctx.logger.info({ path: op.path }, "patch update");
        }
      }
    }

    return results.join("\n");
  },
};
