import { Router, Request, Response } from "express";
import {
  db,
  templatesTable,
  templateFilesTable,
  projectsTable,
  projectFilesTable,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

// GET /api/templates — public templates gallery
router.get("/", async (_req: Request, res: Response) => {
  const templates = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.isPublic, true))
    .orderBy(desc(templatesTable.uses), desc(templatesTable.createdAt))
    .limit(50);
  res.json({ templates });
});

// GET /api/templates/my — current user's templates
router.get("/my", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const templates = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.userId, userId))
    .orderBy(desc(templatesTable.createdAt));
  res.json({ templates });
});

// POST /api/templates — save project as template
router.post("/", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { projectId, title, description, isPublic, tags } = req.body as {
    projectId?: number;
    title?: string;
    description?: string;
    isPublic?: boolean;
    tags?: string[];
  };
  if (!projectId || !title?.trim()) {
    res.status(400).json({ error: "projectId and title are required" });
    return;
  }

  // Verify the caller owns the project
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(
      and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)),
    );
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [template] = await db
    .insert(templatesTable)
    .values({
      userId,
      title: title.trim(),
      description: description?.trim(),
      stack: project.stack ?? "html",
      previewHtml: project.previewHtml,
      isPublic: isPublic ?? false,
      tags: tags ?? [],
    })
    .returning();

  // Copy project files
  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));
  if (files.length > 0) {
    await db
      .insert(templateFilesTable)
      .values(
        files.map((f) => ({
          templateId: template.id,
          path: f.path,
          content: f.content,
          language: f.language,
          isEntrypoint: f.isEntrypoint,
        })),
      );
  }

  res.status(201).json({ template });
});

// POST /api/templates/:id/use — create project from template
router.post("/:id/use", async (req: Request, res: Response) => {
  const templateId = Number(req.params.id);
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.id, templateId));
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  // Only allow using public templates or templates the user owns
  if (!template.isPublic && template.userId !== userId) {
    res.status(403).json({ error: "Template is private" });
    return;
  }

  // Bump use count
  await db
    .update(templatesTable)
    .set({ uses: sql`${templatesTable.uses} + 1` })
    .where(eq(templatesTable.id, templateId));

  // Create project from template
  const [project] = await db
    .insert(projectsTable)
    .values({
      title: template.title,
      description: template.description,
      stack: template.stack,
      previewHtml: template.previewHtml,
      userId,
    })
    .returning();

  // Copy template files
  const files = await db
    .select()
    .from(templateFilesTable)
    .where(eq(templateFilesTable.templateId, templateId));
  if (files.length > 0) {
    await db
      .insert(projectFilesTable)
      .values(
        files.map((f) => ({
          projectId: project.id,
          path: f.path,
          content: f.content,
          language: f.language,
          isEntrypoint: f.isEntrypoint,
        })),
      );
  }

  res.status(201).json({ project });
});

// DELETE /api/templates/:id — delete own template
router.delete("/:id", async (req: Request, res: Response) => {
  const templateId = Number(req.params.id);
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(
      and(eq(templatesTable.id, templateId), eq(templatesTable.userId, userId)),
    );
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  await db.delete(templatesTable).where(eq(templatesTable.id, templateId));
  res.json({ ok: true });
});

export default router;
