import { eq, desc } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectFilesTable,
  projectSnapshotsTable,
} from "@workspace/db";
import { autoCdnInject } from "../../../services/ai/preview";
import { invalidateBundleCache } from "../bundle";
import type { ChangeSummary } from "../../../services/ai/change-summary";
import type { ExtractedFile } from "../../../services/ai/code-extractor";

export interface SnapshotWriteParams {
  projectId: number;
  stack: string | null;
  extractedHtml: string | null;
  extractedReactFiles: ExtractedFile[];
  changeSummary: ChangeSummary | null | undefined;
  messageCount: number;
}

export interface SnapshotWriteResult {
  previewHtmlUpdate: string | null;
  reactFilesCount: number;
}

/** Returns true if the extracted HTML meets minimum quality for saving. */
export function isHtmlUsable(h: string | null | undefined): h is string {
  if (!h || h.length < 800) return false;
  const lower = h.toLowerCase();
  if (!lower.includes("</html>")) return false;
  if (!lower.includes("<body") && !lower.includes("<html")) return false;
  const closeIdx = lower.lastIndexOf("</html>");
  if (closeIdx < h.length * 0.4) return false;
  return true;
}

/**
 * Atomically writes:
 * 1. HTML file to project_files (for HTML projects)
 * 2. React files to project_files (for React projects)
 * 3. A project snapshot with diffStats
 * 4. Project row update (previewHtml, skillScore, updatedAt)
 *
 * Call this after Claude's response is fully assembled.
 */
export async function writeSnapshot(
  params: SnapshotWriteParams,
  updateData: Record<string, unknown>,
): Promise<SnapshotWriteResult> {
  const {
    projectId,
    stack,
    extractedHtml,
    extractedReactFiles,
    changeSummary,
    messageCount,
  } = params;

  const isReactStack = stack === "react" || stack === "nextjs";
  let previewHtmlUpdate: string | null = null;
  let reactFilesCount = 0;

  if (isHtmlUsable(extractedHtml)) {
    previewHtmlUpdate = autoCdnInject(extractedHtml);
    updateData.previewHtml = previewHtmlUpdate;
  }

  if (extractedReactFiles.length > 0) {
    updateData.previewHtml = null;
    reactFilesCount = extractedReactFiles.length;
  }

  await db.transaction(async (tx) => {
    // ── Save HTML file ────────────────────────────────────────────────────
    if (isHtmlUsable(extractedHtml)) {
      const html = autoCdnInject(extractedHtml);
      await tx
        .insert(projectFilesTable)
        .values({
          projectId,
          path: "index.html",
          content: html,
          language: "html",
          isEntrypoint: true,
        })
        .onConflictDoUpdate({
          target: [projectFilesTable.projectId, projectFilesTable.path],
          set: { content: html, updatedAt: new Date() },
        });
    }

    // ── Save React files ─────────────────────────────────────────────────
    if (extractedReactFiles.length > 0) {
      for (const f of extractedReactFiles) {
        await tx
          .insert(projectFilesTable)
          .values({
            projectId,
            path: f.path,
            content: f.content,
            language: f.language,
            isEntrypoint: f.isEntrypoint,
          })
          .onConflictDoUpdate({
            target: [projectFilesTable.projectId, projectFilesTable.path],
            set: {
              content: f.content,
              language: f.language,
              isEntrypoint: f.isEntrypoint,
              updatedAt: new Date(),
            },
          });
      }
      invalidateBundleCache(projectId);
    }

    // ── Create snapshot ───────────────────────────────────────────────────
    if (isHtmlUsable(extractedHtml)) {
      const snapshotHtml = autoCdnInject(extractedHtml);
      await tx.insert(projectSnapshotsTable).values({
        projectId,
        html: snapshotHtml,
        label: `גרסה ${messageCount}`,
        snapshotType: isReactStack ? "react" : "html",
        diffStats: (changeSummary ?? null) as unknown,
      });

      // Keep at most 30 snapshots per project
      const old = await tx
        .select({ id: projectSnapshotsTable.id })
        .from(projectSnapshotsTable)
        .where(eq(projectSnapshotsTable.projectId, projectId))
        .orderBy(desc(projectSnapshotsTable.createdAt))
        .offset(30);
      for (const o of old) {
        await tx
          .delete(projectSnapshotsTable)
          .where(eq(projectSnapshotsTable.id, o.id));
      }
    }

    // ── Update project row ────────────────────────────────────────────────
    await tx
      .update(projectsTable)
      .set(updateData)
      .where(eq(projectsTable.id, projectId));
  });

  return { previewHtmlUpdate, reactFilesCount };
}
