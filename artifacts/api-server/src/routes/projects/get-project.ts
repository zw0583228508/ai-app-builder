import { Router } from "express";
import { eq, asc, and, isNull } from "drizzle-orm";
import { db, projectsTable, projectMessagesTable } from "@workspace/db";
import { GetProjectParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.json([]);
    return;
  }
  const projects = await db
    .select()
    .from(projectsTable)
    .where(
      and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt)),
    )
    .orderBy(asc(projectsTable.createdAt));
  res.json(projects);
});

router.get("/:id", async (req, res) => {
  const params = GetProjectParams.parse(req.params);
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

  res.json({ ...project, messages });
});

export default router;
