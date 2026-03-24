import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable, projectFilesTable } from "@workspace/db";

const router = Router({ mergeParams: true });

router.post("/:id/fork", async (req, res) => {
  const projectId = Number(req.params.id);
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [source] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!source) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [forked] = await db
    .insert(projectsTable)
    .values({
      title: `Fork of ${source.title}`,
      description: source.description,
      type: source.type,
      stack: source.stack,
      userMode: source.userMode,
      previewHtml: source.previewHtml,
      userId,
    })
    .returning();

  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));
  if (files.length > 0) {
    await db.insert(projectFilesTable).values(
      files.map((f) => ({
        projectId: forked.id,
        path: f.path,
        content: f.content,
        language: f.language,
        isEntrypoint: f.isEntrypoint,
      })),
    );
  }

  res.status(201).json({ project: forked });
});

export default router;
