import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, projectsTable, projectMessagesTable } from "@workspace/db";
import { ListProjectMessagesParams } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

// ── Messages list ────────────────────────────────────────────
router.get("/:id/messages", async (req, res) => {
  const params = ListProjectMessagesParams.parse(req.params);

  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((rows) => rows[0]);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const messages = await db
    .select()
    .from(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, params.id))
    .orderBy(asc(projectMessagesTable.createdAt));

  res.json(messages);
});

export default router;
