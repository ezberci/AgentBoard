import path from "node:path";

/**
 * Resolve a user-provided path relative to the working directory
 * and ensure it does not escape via path traversal.
 */
export function resolvePath(filePath: string, workingDir: string): string {
  const resolved = path.resolve(workingDir, filePath);
  const root = path.resolve(workingDir);

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  return resolved;
}
