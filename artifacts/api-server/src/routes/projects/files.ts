import { Router } from "express";
import { eq, asc, and } from "drizzle-orm";
import { db, projectFilesTable } from "@workspace/db";

const router = Router({ mergeParams: true });

router.get("/:id/files", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, id))
    .orderBy(asc(projectFilesTable.path));
  res.json({ files });
});

router.get("/:id/files/:fileId", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const fileId = parseInt(req.params.fileId);
  if (isNaN(projectId) || isNaN(fileId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const file = await db
    .select()
    .from(projectFilesTable)
    .where(
      and(
        eq(projectFilesTable.id, fileId),
        eq(projectFilesTable.projectId, projectId),
      ),
    )
    .then((r) => r[0]);
  if (!file) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ file });
});

router.post("/:id/files", async (req, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const {
    path,
    content = "",
    language,
    isEntrypoint = false,
  } = req.body as {
    path: string;
    content?: string;
    language?: string;
    isEntrypoint?: boolean;
  };
  if (!path) {
    res.status(400).json({ error: "path required" });
    return;
  }
  const lang = language ?? path.split(".").pop() ?? "txt";
  const [file] = await db
    .insert(projectFilesTable)
    .values({ projectId, path, content, language: lang, isEntrypoint })
    .onConflictDoUpdate({
      target: [projectFilesTable.projectId, projectFilesTable.path],
      set: { content, language: lang, isEntrypoint, updatedAt: new Date() },
    })
    .returning();
  res.json({ file });
});

router.put("/:id/files/:fileId", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const fileId = parseInt(req.params.fileId);
  if (isNaN(projectId) || isNaN(fileId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { content, language, isEntrypoint } = req.body as {
    content?: string;
    language?: string;
    isEntrypoint?: boolean;
  };
  const updates: Partial<typeof projectFilesTable.$inferInsert> & {
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (content !== undefined) updates.content = content;
  if (language !== undefined) updates.language = language;
  if (isEntrypoint !== undefined) updates.isEntrypoint = isEntrypoint;
  const [file] = await db
    .update(projectFilesTable)
    .set(updates)
    .where(
      and(
        eq(projectFilesTable.id, fileId),
        eq(projectFilesTable.projectId, projectId),
      ),
    )
    .returning();
  if (!file) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ file });
});

router.delete("/:id/files/:fileId", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const fileId = parseInt(req.params.fileId);
  if (isNaN(projectId) || isNaN(fileId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(projectFilesTable)
    .where(
      and(
        eq(projectFilesTable.id, fileId),
        eq(projectFilesTable.projectId, projectId),
      ),
    );
  res.json({ ok: true });
});

export default router;
