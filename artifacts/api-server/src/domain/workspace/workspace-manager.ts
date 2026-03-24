/**
 * Workspace Manager
 *
 * Each project has a dedicated filesystem workspace at:
 *   WORKSPACES_BASE_DIR/{projectId}/
 *
 * All file operations are path-safe and checked against the sandbox policy.
 * The workspace is the source of truth for executable project contents.
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  WORKSPACES_BASE_DIR,
  safeWorkspacePath,
  assertWithinBase,
  validateFileExtension,
  SandboxError,
} from "../sandbox/sandbox-policy.js";
import { buildFileTree, type FileTreeEntry } from "./file-tree.js";
import {
  readMetadata,
  writeMetadata,
  type WorkspaceMetadata,
} from "./metadata.js";

// ── Public API ────────────────────────────────────────────────────────────────

export interface WorkspaceInfo {
  projectId: number;
  workspacePath: string;
  exists: boolean;
  metadata: WorkspaceMetadata | null;
  fileTree: FileTreeEntry[];
}

/**
 * Get or create a workspace for the given project.
 * Returns the absolute path to the workspace directory.
 */
export async function ensureWorkspace(projectId: number): Promise<string> {
  const workspacePath = getWorkspacePath(projectId);
  assertWithinBase(workspacePath);
  await fs.mkdir(workspacePath, { recursive: true });
  await fs.mkdir(path.join(workspacePath, "src"), { recursive: true });
  await fs.mkdir(path.join(workspacePath, "logs"), { recursive: true });
  await fs.mkdir(path.join(workspacePath, "snapshots"), { recursive: true });

  const meta = await readMetadata(workspacePath);
  if (!meta) {
    await writeMetadata(workspacePath, {
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileCount: 0,
      lastSnapshotAt: null,
    });
  }

  return workspacePath;
}

/**
 * Return info about a workspace without creating it.
 */
export async function getWorkspaceInfo(
  projectId: number,
): Promise<WorkspaceInfo> {
  const workspacePath = getWorkspacePath(projectId);
  let exists = false;
  let metadata: WorkspaceMetadata | null = null;
  let fileTree: FileTreeEntry[] = [];

  try {
    await fs.access(workspacePath);
    exists = true;
    metadata = await readMetadata(workspacePath);
    fileTree = await buildFileTree(workspacePath);
  } catch {
    /* workspace does not exist yet */
  }

  return { projectId, workspacePath, exists, metadata, fileTree };
}

/**
 * Read a file from the project workspace.
 * Returns null if file does not exist.
 */
export async function readWorkspaceFile(
  projectId: number,
  relativePath: string,
): Promise<string | null> {
  const workspacePath = getWorkspacePath(projectId);
  const absPath = safeWorkspacePath(workspacePath, relativePath);
  try {
    return await fs.readFile(absPath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Write a file to the project workspace.
 * Creates intermediate directories as needed.
 * Validates path safety and file extension.
 */
export async function writeWorkspaceFile(
  projectId: number,
  relativePath: string,
  content: string,
  opts: { overwrite?: boolean } = {},
): Promise<void> {
  const workspacePath = getWorkspacePath(projectId);
  const absPath = safeWorkspacePath(workspacePath, relativePath);
  validateFileExtension(relativePath);

  if (!opts.overwrite) {
    try {
      await fs.access(absPath);
      throw new SandboxError(
        "workspace_error",
        `File already exists: ${relativePath}. Use overwrite=true to replace it.`,
      );
    } catch (err) {
      if (err instanceof SandboxError) throw err;
      /* file doesn't exist — OK to create */
    }
  }

  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, "utf-8");
  await touchMetadata(workspacePath);
}

/**
 * Delete a file from the project workspace.
 */
export async function deleteWorkspaceFile(
  projectId: number,
  relativePath: string,
): Promise<void> {
  const workspacePath = getWorkspacePath(projectId);
  const absPath = safeWorkspacePath(workspacePath, relativePath);

  try {
    await fs.unlink(absPath);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new SandboxError(
        "workspace_error",
        `File not found: ${relativePath}`,
      );
    }
    throw err;
  }
  await touchMetadata(workspacePath);
}

/**
 * Create a directory inside the project workspace.
 */
export async function ensureWorkspaceDirectory(
  projectId: number,
  relativePath: string,
): Promise<void> {
  const workspacePath = getWorkspacePath(projectId);
  const absPath = safeWorkspacePath(workspacePath, relativePath);
  await fs.mkdir(absPath, { recursive: true });
}

/**
 * List files in a directory (non-recursive by default).
 */
export async function listWorkspaceFiles(
  projectId: number,
  relativeDir: string = ".",
  recursive: boolean = false,
): Promise<FileTreeEntry[]> {
  const workspacePath = getWorkspacePath(projectId);
  const absDir = safeWorkspacePath(workspacePath, relativeDir);
  return buildFileTree(absDir, recursive, workspacePath);
}

/**
 * Snapshot the workspace before a destructive mutation.
 * Returns the snapshot directory path.
 */
export async function snapshotWorkspace(
  projectId: number,
  label?: string,
): Promise<string> {
  const workspacePath = getWorkspacePath(projectId);
  const snapshotDir = path.join(
    workspacePath,
    "snapshots",
    `${Date.now()}${label ? "_" + label.replace(/[^a-zA-Z0-9-]/g, "_") : ""}`,
  );
  await fs.mkdir(snapshotDir, { recursive: true });

  const sourceDir = path.join(workspacePath, "src");
  try {
    await copyDir(sourceDir, path.join(snapshotDir, "src"));
  } catch {
    /* no src dir yet — snapshot is empty */
  }

  const meta = await readMetadata(workspacePath);
  await writeMetadata(snapshotDir, {
    ...(meta ?? {}),
    projectId,
    snapshotLabel: label ?? null,
    snapshotAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileCount: meta?.fileCount ?? 0,
    lastSnapshotAt: new Date().toISOString(),
  });

  if (meta) {
    await writeMetadata(workspacePath, {
      ...meta,
      lastSnapshotAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return snapshotDir;
}

/**
 * Restore workspace src from a snapshot directory.
 */
export async function restoreSnapshot(
  projectId: number,
  snapshotPath: string,
): Promise<void> {
  assertWithinBase(snapshotPath);
  const workspacePath = getWorkspacePath(projectId);
  const srcPath = path.join(workspacePath, "src");
  const snapshotSrc = path.join(snapshotPath, "src");

  await fs.rm(srcPath, { recursive: true, force: true });
  await fs.mkdir(srcPath, { recursive: true });
  await copyDir(snapshotSrc, srcPath);
  await touchMetadata(workspacePath);
}

/**
 * Purge a project workspace entirely.
 * Called only on project deletion.
 */
export async function purgeWorkspace(projectId: number): Promise<void> {
  const workspacePath = getWorkspacePath(projectId);
  assertWithinBase(workspacePath);
  await fs.rm(workspacePath, { recursive: true, force: true });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

export function getWorkspacePath(projectId: number): string {
  return path.join(WORKSPACES_BASE_DIR, String(projectId));
}

async function touchMetadata(workspacePath: string): Promise<void> {
  const meta = await readMetadata(workspacePath);
  if (meta) {
    await writeMetadata(workspacePath, {
      ...meta,
      updatedAt: new Date().toISOString(),
    });
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcEntry = path.join(src, entry.name);
    const destEntry = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcEntry, destEntry);
    } else {
      await fs.copyFile(srcEntry, destEntry);
    }
  }
}
