/**
 * File Tree Generator
 *
 * Produces a structured listing of workspace contents,
 * excluding noise directories (node_modules, .git, snapshots, logs).
 */

import fs from "fs/promises";
import path from "path";

export interface FileTreeEntry {
  path: string;
  type: "file" | "directory";
  sizeBytes?: number;
  children?: FileTreeEntry[];
}

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".pnpm",
  "snapshots",
  "logs",
  "dist",
  ".next",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
]);

/**
 * Build a file tree starting at `rootDir`.
 *
 * @param rootDir       Absolute path to scan.
 * @param recursive     If true, descend into subdirectories.
 * @param relativeTo    If provided, paths in results are relative to this base.
 * @param depth         Internal recursion limit (default 10).
 */
export async function buildFileTree(
  rootDir: string,
  recursive: boolean = true,
  relativeTo?: string,
  depth: number = 10,
): Promise<FileTreeEntry[]> {
  if (depth <= 0) return [];

  let entries: { name: string; isDirectory(): boolean; isFile(): boolean }[];
  try {
    const raw = await fs.readdir(rootDir, {
      withFileTypes: true,
      encoding: "utf-8",
    });
    entries = raw as typeof entries;
  } catch {
    return [];
  }

  const results: FileTreeEntry[] = [];

  for (const entry of entries) {
    const name = String(entry.name);
    if (EXCLUDED_DIRS.has(name)) continue;
    if (name.startsWith(".") && name !== ".env") continue;

    const absPath = path.join(rootDir, name);
    const displayPath = relativeTo
      ? path.relative(relativeTo, absPath)
      : absPath;

    if (entry.isDirectory()) {
      const children = recursive
        ? await buildFileTree(absPath, true, relativeTo, depth - 1)
        : undefined;
      results.push({ path: displayPath, type: "directory", children });
    } else if (entry.isFile()) {
      let sizeBytes: number | undefined;
      try {
        const stat = await fs.stat(absPath);
        sizeBytes = stat.size;
      } catch {
        /* ignore */
      }
      results.push({ path: displayPath, type: "file", sizeBytes });
    }
  }

  return results.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
}

/**
 * Flatten a file tree into a list of file paths only.
 */
export function flattenFileTree(tree: FileTreeEntry[]): string[] {
  const result: string[] = [];
  for (const entry of tree) {
    if (entry.type === "file") result.push(entry.path);
    if (entry.children) result.push(...flattenFileTree(entry.children));
  }
  return result;
}

/**
 * Format a file tree as a compact text summary for AI context.
 */
export function formatFileTreeSummary(
  tree: FileTreeEntry[],
  indent = 0,
): string {
  const lines: string[] = [];
  for (const entry of tree) {
    const prefix = "  ".repeat(indent);
    const icon = entry.type === "directory" ? "📁" : "📄";
    const size =
      entry.sizeBytes !== undefined ? ` (${formatBytes(entry.sizeBytes)})` : "";
    lines.push(`${prefix}${icon} ${path.basename(entry.path)}${size}`);
    if (entry.children) {
      lines.push(formatFileTreeSummary(entry.children, indent + 1));
    }
  }
  return lines.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
