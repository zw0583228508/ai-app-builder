/**
 * Workspace Metadata
 *
 * Each workspace has a metadata.json at its root tracking creation time,
 * file count, last snapshot time, and any project-specific info.
 */

import fs from "fs/promises";
import path from "path";

export interface WorkspaceMetadata {
  projectId: number;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  lastSnapshotAt: string | null;
  snapshotLabel?: string | null;
  snapshotAt?: string;
  [key: string]: unknown;
}

const METADATA_FILE = "metadata.json";

export async function readMetadata(
  workspacePath: string,
): Promise<WorkspaceMetadata | null> {
  try {
    const raw = await fs.readFile(
      path.join(workspacePath, METADATA_FILE),
      "utf-8",
    );
    return JSON.parse(raw) as WorkspaceMetadata;
  } catch {
    return null;
  }
}

export async function writeMetadata(
  workspacePath: string,
  metadata: WorkspaceMetadata,
): Promise<void> {
  await fs.writeFile(
    path.join(workspacePath, METADATA_FILE),
    JSON.stringify(metadata, null, 2),
    "utf-8",
  );
}
