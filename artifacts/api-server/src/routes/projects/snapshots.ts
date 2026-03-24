import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectSnapshotsTable,
  projectFilesTable,
} from "@workspace/db";
import { autoCdnInject, VISUAL_EDITOR_SCRIPT } from "../../services/ai/preview";
import { broadcastProjectUpdate } from "../collab";
import { GetProjectParams } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.get("/:id/snapshots", async (req, res) => {
  const params = GetProjectParams.parse(req.params);
  const snapshots = await db
    .select({
      id: projectSnapshotsTable.id,
      label: projectSnapshotsTable.label,
      createdAt: projectSnapshotsTable.createdAt,
      snapshotType: projectSnapshotsTable.snapshotType,
      diffStats: projectSnapshotsTable.diffStats,
    })
    .from(projectSnapshotsTable)
    .where(eq(projectSnapshotsTable.projectId, params.id))
    .orderBy(desc(projectSnapshotsTable.createdAt))
    .limit(30);
  res.json(snapshots);
});

router.get("/:id/snapshots/:snapshotId", async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const snapshotId = parseInt(req.params.snapshotId, 10);
  const snapshot = await db
    .select()
    .from(projectSnapshotsTable)
    .where(
      and(
        eq(projectSnapshotsTable.id, snapshotId),
        eq(projectSnapshotsTable.projectId, projectId),
      ),
    )
    .then((rows) => rows[0]);
  if (!snapshot) {
    res.status(404).json({ error: "Snapshot not found" });
    return;
  }
  res.setHeader("Content-Type", "text/html");
  const html = snapshot.html.includes("</body>")
    ? snapshot.html.replace("</body>", VISUAL_EDITOR_SCRIPT + "\n</body>")
    : snapshot.html + VISUAL_EDITOR_SCRIPT;
  res.send(html);
});

router.get("/:id/snapshots/:snapshotId/raw", async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const snapshotId = parseInt(req.params.snapshotId, 10);
  const snapshot = await db
    .select({ id: projectSnapshotsTable.id, html: projectSnapshotsTable.html, label: projectSnapshotsTable.label, createdAt: projectSnapshotsTable.createdAt })
    .from(projectSnapshotsTable)
    .where(
      and(
        eq(projectSnapshotsTable.id, snapshotId),
        eq(projectSnapshotsTable.projectId, projectId),
      ),
    )
    .then((rows) => rows[0]);
  if (!snapshot) {
    res.status(404).json({ error: "Snapshot not found" });
    return;
  }
  res.json({ id: snapshot.id, html: snapshot.html, label: snapshot.label, createdAt: snapshot.createdAt });
});

router.post("/:id/snapshots/restore/:snapshotId", async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const snapshotId = parseInt(req.params.snapshotId, 10);
  const snapshot = await db
    .select()
    .from(projectSnapshotsTable)
    .where(
      and(
        eq(projectSnapshotsTable.id, snapshotId),
        eq(projectSnapshotsTable.projectId, projectId),
      ),
    )
    .then((rows) => rows[0]);
  if (!snapshot) {
    res.status(404).json({ error: "Snapshot not found" });
    return;
  }
  const restoredHtml = autoCdnInject(snapshot.html);
  await db
    .update(projectsTable)
    .set({ previewHtml: restoredHtml, updatedAt: new Date() })
    .where(eq(projectsTable.id, projectId));
  await db
    .insert(projectFilesTable)
    .values({
      projectId,
      path: "index.html",
      content: restoredHtml,
      language: "html",
      isEntrypoint: true,
    })
    .onConflictDoUpdate({
      target: [projectFilesTable.projectId, projectFilesTable.path],
      set: { content: restoredHtml, updatedAt: new Date() },
    });
  broadcastProjectUpdate(String(projectId), {
    previewUpdated: true,
    restored: true,
  });
  res.json({ ok: true });
});

export default router;
