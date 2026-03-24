import { Router } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectMessagesTable,
  projectFilesTable,
  projectSnapshotsTable,
  projectSecretsTable,
  projectDatabasesTable,
  projectStorageObjectsTable,
  usageLogsTable,
  projectDnaTable,
  analyticsEventsTable,
} from "@workspace/db";
import { DeleteProjectParams } from "@workspace/api-zod";
import { logAudit } from "../../services/audit-log";

const router = Router();

router.delete("/:id", async (req, res) => {
  const params = DeleteProjectParams.parse(req.params);
  const userId = (req as any).user?.id ?? null;

  const existing = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((rows) => rows[0]);

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db
    .update(projectsTable)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projectsTable.id, params.id));

  logAudit({
    action: "project.delete",
    userId,
    projectId: params.id,
    meta: { name: existing.title, soft: true },
  });

  res.status(204).send();
});

router.delete("/:id/purge", async (req, res) => {
  const params = DeleteProjectParams.parse(req.params);

  const existing = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((rows) => rows[0]);

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db
    .delete(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, params.id));
  await db
    .delete(projectFilesTable)
    .where(eq(projectFilesTable.projectId, params.id));
  await db
    .delete(projectSnapshotsTable)
    .where(eq(projectSnapshotsTable.projectId, params.id));
  await db
    .delete(projectDnaTable)
    .where(eq(projectDnaTable.projectId, params.id));
  await db
    .delete(projectSecretsTable)
    .where(eq(projectSecretsTable.projectId, params.id));
  await db
    .delete(projectDatabasesTable)
    .where(eq(projectDatabasesTable.projectId, params.id));
  await db
    .delete(projectStorageObjectsTable)
    .where(eq(projectStorageObjectsTable.projectId, params.id));
  await db
    .delete(usageLogsTable)
    .where(eq(usageLogsTable.projectId, params.id));
  await db
    .delete(analyticsEventsTable)
    .where(eq(analyticsEventsTable.projectId, params.id));
  await db.delete(projectsTable).where(eq(projectsTable.id, params.id));

  logAudit({
    action: "project.delete",
    userId: (req as any).user?.id ?? null,
    projectId: params.id,
    meta: { name: existing.title, soft: false },
  });

  res.status(204).send();
});

export default router;
