import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import { VISUAL_EDITOR_SCRIPT } from "../../services/ai/preview";
import { GetProjectPreviewParams } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

// ── Preview endpoint ─────────────────────────────────────────
// Snapshot routes moved to snapshots.ts (Phase 3 modularization)
router.get("/:id/preview", async (req, res) => {
  const params = GetProjectPreviewParams.parse(req.params);

  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((rows) => rows[0]);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (!project.previewHtml) {
    res.status(404).json({ error: "No preview available yet" });
    return;
  }

  res.setHeader("Content-Type", "text/html");
  const html = project.previewHtml.includes("</body>")
    ? project.previewHtml.replace("</body>", VISUAL_EDITOR_SCRIPT + "\n</body>")
    : project.previewHtml + VISUAL_EDITOR_SCRIPT;
  res.send(html);
});

export default router;
