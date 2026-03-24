import { Router } from "express";
import { eq, or, lt, isNotNull, and } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, projectsTable, projectFilesTable } from "@workspace/db";
import { GetProjectParams } from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router = Router({ mergeParams: true });

// ── Share ─────────────────────────────────────────────────────
router.post("/:id/share", async (req, res) => {
  const params = GetProjectParams.parse(req.params);
  const userId = req.user?.id;
  const { expires_in_days } = (req.body ?? {}) as { expires_in_days?: number };

  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((r) => r[0]);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (userId && project.userId && project.userId !== userId) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const isReactProject =
    project.stack === "react" || project.stack === "nextjs";
  if (!project.previewHtml && !isReactProject) {
    const hasFiles = await db
      .select({ id: projectFilesTable.projectId })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, params.id))
      .limit(1)
      .then((r) => r.length > 0);
    if (!hasFiles) {
      res.status(400).json({ error: "No preview to share yet" });
      return;
    }
  }

  let token = project.shareToken;
  if (!token) {
    token = randomBytes(16).toString("hex");
  }

  const expiresAt =
    expires_in_days && expires_in_days > 0
      ? new Date(Date.now() + expires_in_days * 86_400_000)
      : null;

  await db
    .update(projectsTable)
    .set({ shareToken: token, shareTokenExpiresAt: expiresAt })
    .where(eq(projectsTable.id, params.id));

  res.json({
    shareToken: token,
    customSlug: project.customSlug || null,
    expiresAt: expiresAt?.toISOString() ?? null,
  });
});

// ── Revoke share link ─────────────────────────────────────────
router.delete("/:id/share", async (req, res) => {
  const params = GetProjectParams.parse(req.params);
  const userId = req.user?.id;
  const project = await db
    .select({ userId: projectsTable.userId })
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((r) => r[0]);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (userId && project.userId && project.userId !== userId) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }
  await db
    .update(projectsTable)
    .set({ shareToken: null, shareTokenExpiresAt: null })
    .where(eq(projectsTable.id, params.id));
  res.json({ ok: true });
});

// ── Custom Slug ───────────────────────────────────────────────
router.patch("/:id/custom-slug", async (req, res) => {
  const params = GetProjectParams.parse(req.params);
  const { slug } = req.body as { slug: string };
  if (!slug || typeof slug !== "string") {
    res.status(400).json({ error: "slug required" });
    return;
  }
  const clean = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  if (!clean || clean.length < 3) {
    res.status(400).json({
      error: "Slug must be at least 3 characters (a-z, 0-9, hyphens)",
    });
    return;
  }

  const existing = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.customSlug, clean))
    .then((r) => r[0]);
  if (existing && existing.id !== params.id) {
    res.status(409).json({ error: "כתובת זו כבר תפוסה" });
    return;
  }

  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((r) => r[0]);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  let token = project.shareToken;
  if (!token) {
    token = randomBytes(16).toString("hex");
  }
  await db
    .update(projectsTable)
    .set({ customSlug: clean, shareToken: token })
    .where(eq(projectsTable.id, params.id));
  res.json({ customSlug: clean, shareToken: token });
});

// ── Share metadata (title, type) for the public share page ───
router.get("/share/:token/meta", async (req, res) => {
  const { token } = req.params;
  const project = await db
    .select({
      title: projectsTable.title,
      type: projectsTable.type,
      stack: projectsTable.stack,
      shareTokenExpiresAt: projectsTable.shareTokenExpiresAt,
    })
    .from(projectsTable)
    .where(
      or(
        eq(projectsTable.shareToken, token),
        eq(projectsTable.customSlug, token),
      ),
    )
    .then((r) => r[0]);
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (
    project.shareTokenExpiresAt &&
    new Date(project.shareTokenExpiresAt) < new Date()
  ) {
    res.status(410).json({ error: "קישור השיתוף פג תוקף" });
    return;
  }
  res.json({
    title: project.title,
    type: project.type,
    stack: project.stack,
  });
});

// ── Public share view ─────────────────────────────────────────
router.get("/share/:token", async (req, res) => {
  const { token } = req.params;
  const project = await db
    .select()
    .from(projectsTable)
    .where(
      or(
        eq(projectsTable.shareToken, token),
        eq(projectsTable.customSlug, token),
      ),
    )
    .then((r) => r[0]);
  if (!project) {
    res.status(404).send("<h1>Not found</h1>");
    return;
  }

  if (
    project.shareTokenExpiresAt &&
    new Date(project.shareTokenExpiresAt) < new Date()
  ) {
    res
      .status(410)
      .send(
        "<!DOCTYPE html><html><body style='font-family:sans-serif;text-align:center;padding:80px'>" +
          "<h1>קישור זה פג תוקף</h1><p>בעל הפרויקט יכול ליצור קישור חדש.</p></body></html>",
      );
    return;
  }

  if (project.previewHtml) {
    res.setHeader("Content-Type", "text/html");
    res.send(project.previewHtml);
    return;
  }

  const isReactProject =
    project.stack === "react" || project.stack === "nextjs";
  if (isReactProject) {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=/api/projects/${project.id}/bundle">
<title>Loading...</title></head>
<body style="background:#0f172a;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<p>טוען אפליקציה...</p></body></html>`);
    return;
  }

  res.status(404).send("<h1>Not found</h1>");
});

// ── Cleanup helper: called by the scheduled cleanup job ──────
export async function deleteExpiredShares(): Promise<number> {
  const result = (await db
    .update(projectsTable)
    .set({ shareToken: null, shareTokenExpiresAt: null })
    .where(
      and(
        isNotNull(projectsTable.shareTokenExpiresAt),
        lt(projectsTable.shareTokenExpiresAt, new Date()),
      ),
    )) as { rowCount?: number };
  const count = result.rowCount ?? 0;
  if (count > 0) {
    logger.info({ count }, "[Cleanup] Expired share links revoked");
  }
  return count;
}

export default router;
