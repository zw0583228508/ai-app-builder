import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import {
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectModeBody,
  UpdateProjectModeParams,
} from "@workspace/api-zod";

const router = Router();

router.put("/:id", async (req, res) => {
  const params = UpdateProjectParams.parse(req.params);
  const body = UpdateProjectBody.parse(req.body);
  const rawBody = req.body as Record<string, unknown>;

  const existing = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((rows) => rows[0]);

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const extraFields: Record<string, unknown> = {};
  if (typeof rawBody.stack === "string") extraFields.stack = rawBody.stack;

  const [updated] = await db
    .update(projectsTable)
    .set({ ...body, ...extraFields, updatedAt: new Date() })
    .where(eq(projectsTable.id, params.id))
    .returning();

  res.json(updated);
});

router.put("/:id/mode", async (req, res) => {
  const params = UpdateProjectModeParams.parse(req.params);
  const body = UpdateProjectModeBody.parse(req.body);

  const existing = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((rows) => rows[0]);

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [updated] = await db
    .update(projectsTable)
    .set({ userMode: body.userMode, updatedAt: new Date() })
    .where(eq(projectsTable.id, params.id))
    .returning();

  res.json(updated);
});

export default router;
