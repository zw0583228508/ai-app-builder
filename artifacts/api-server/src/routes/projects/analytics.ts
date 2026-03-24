import { Router, type Request } from "express";
import { eq, inArray, and, gte } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectMessagesTable,
  analyticsEventsTable,
} from "@workspace/db";

const router = Router({ mergeParams: true });

// ── Analytics dashboard ───────────────────────────────────────
router.get("/analytics/summary", async (req: Request, res) => {
  if (!req.user) {
    res.status(401).json({ error: "נדרש להתחבר" });
    return;
  }
  const userId = req.user.id;
  const allProjects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId));
  const projectIds = allProjects.map((p) => p.id);
  const allMessages =
    projectIds.length > 0
      ? await db
          .select()
          .from(projectMessagesTable)
          .where(inArray(projectMessagesTable.projectId, projectIds))
      : [];

  const totalProjects = allProjects.length;
  const totalMessages = allMessages.filter((m) => m.role === "user").length;
  const totalGenerations = allProjects.filter((p) => p.previewHtml).length;
  const totalChars = allProjects.reduce(
    (s, p) => s + (p.previewHtml?.length || 0),
    0,
  );

  const now = Date.now();
  const activityMap: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    activityMap[key] = 0;
  }
  for (const m of allMessages) {
    if (m.role === "user") {
      const key = new Date(m.createdAt!).toISOString().slice(0, 10);
      if (key in activityMap) activityMap[key]++;
    }
  }
  const activity = Object.entries(activityMap).map(([date, count]) => ({
    date,
    count,
  }));

  const modes = { entrepreneur: 0, builder: 0, developer: 0 };
  for (const p of allProjects) {
    const m = p.userMode as keyof typeof modes;
    if (m in modes) modes[m]++;
  }

  const recent = allProjects
    .sort(
      (a, b) =>
        new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime(),
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.title,
      updatedAt: p.updatedAt,
      hasPreview: !!p.previewHtml,
      userMode: p.userMode,
      msgCount: allMessages.filter(
        (m) => m.projectId === p.id && m.role === "user",
      ).length,
    }));

  const avgMessages =
    totalProjects > 0 ? +(totalMessages / totalProjects).toFixed(1) : 0;
  const avgSize =
    totalGenerations > 0 ? Math.round(totalChars / totalGenerations) : 0;

  res.json({
    totalProjects,
    totalMessages,
    totalGenerations,
    avgMessages,
    avgSize,
    activity,
    modes,
    recent,
  });
});

// ── Per-project analytics event ingestion ─────────────────────
router.post("/:id/analytics/event", async (req, res) => {
  try {
    const projectId = parseInt(req.params["id"] ?? "");
    if (isNaN(projectId)) {
      res.json({ ok: true });
      return;
    }

    const { type, path, element, referrer, sessionId, metadata } = req.body as {
      type?: string;
      path?: string;
      element?: string;
      referrer?: string;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    };

    if (!type) {
      res.json({ ok: true });
      return;
    }

    await db.insert(analyticsEventsTable).values({
      projectId,
      type,
      path: path ?? null,
      element: element ?? null,
      referrer: referrer ?? null,
      sessionId: sessionId ?? null,
      metadata: metadata ?? null,
    });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const count = await db
      .select()
      .from(analyticsEventsTable)
      .where(
        and(
          eq(analyticsEventsTable.projectId, projectId),
          gte(analyticsEventsTable.createdAt, weekAgo),
        ),
      )
      .then((r) => r.length);

    if (count > 0 && count % 100 === 0) {
      fetch(
        `http://localhost:${process.env["PORT"]}/api/analytics/insights/${projectId}`,
        { method: "POST" },
      ).catch(() => {});
    }
  } catch {
    /* non-critical */
  }
  res.json({ ok: true });
});

export default router;
