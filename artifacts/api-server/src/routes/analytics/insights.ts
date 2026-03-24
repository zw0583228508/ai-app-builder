import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, analyticsEventsTable, aiInsightsTable, projectDnaTable } from "@workspace/db";
import { eq, gte, and, desc } from "drizzle-orm";

const router = Router();

export interface InsightSuggestion {
  problem: string;
  fix: string;
  impact: string;
  priority: "high" | "medium" | "low";
}

async function generateInsights(
  projectId: number,
  events: { type: string; path?: string | null; element?: string | null; createdAt: Date }[],
  dna: { businessModel?: string | null; targetAudience?: string | null; primaryGoal?: string | null; projectVibe?: string | null } | null
): Promise<InsightSuggestion[]> {
  if (events.length === 0) return [];

  // Aggregate event stats
  const pageviews = events.filter(e => e.type === "pageview").length;
  const clicks = events.filter(e => e.type === "click");
  const errors = events.filter(e => e.type === "error");

  // Top clicked elements
  const clickCounts: Record<string, number> = {};
  for (const c of clicks) {
    const key = c.element ?? "unknown";
    clickCounts[key] = (clickCounts[key] ?? 0) + 1;
  }
  const topClicks = Object.entries(clickCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([el, count]) => `${el}: ${count} קליקים`);

  // Top error messages
  const errorMessages = errors.slice(0, 5).map(e => e.element ?? "שגיאה לא ידועה");

  const dnaContext = dna
    ? `מידע על הפרויקט: מודל עסקי: ${dna.businessModel ?? "לא מוגדר"}, קהל יעד: ${dna.targetAudience ?? "לא מוגדר"}, מטרה עיקרית: ${dna.primaryGoal ?? "לא מוגדרת"}`
    : "";

  const prompt = `אתה מנתח analytics מומחה. קיבלת נתוני שימוש של שבוע אחרון מאתר שנבנה ב-AI.

${dnaContext}

נתוני Analytics:
- דפי צפייה: ${pageviews}
- קליקים: ${clicks.length}
- שגיאות JavaScript: ${errors.length}
- אלמנטים נפוצים שנלחצו: ${topClicks.join(", ") || "אין"}
- שגיאות נפוצות: ${errorMessages.join(", ") || "אין"}

נתח את הנתונים ותחזיר מערך JSON של 3-5 הצעות שיפור ספציפיות. כל הצעה חייבת להכיל:
- problem: מה הבעיה (עברית, משפט אחד)
- fix: מה לשנות בקוד (ספציפי, עברית)
- impact: מה ההשפעה הצפויה (עברית)
- priority: "high" | "medium" | "low"

החזר ONLY valid JSON array, ללא markdown.`;

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = res.content[0].type === "text" ? res.content[0].text : "[]";
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// POST /api/analytics/insights/:projectId — generate or refresh insights
router.post("/:projectId", async (req, res) => {
  const projectId = parseInt(req.params["projectId"] ?? "");
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  // Fetch events from last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const events = await db
    .select()
    .from(analyticsEventsTable)
    .where(
      and(
        eq(analyticsEventsTable.projectId, projectId),
        gte(analyticsEventsTable.createdAt, weekAgo)
      )
    )
    .orderBy(desc(analyticsEventsTable.createdAt));

  // Fetch DNA
  const dnaRows = await db
    .select()
    .from(projectDnaTable)
    .where(eq(projectDnaTable.projectId, projectId));
  const dna = dnaRows[0] ?? null;

  const suggestions = await generateInsights(projectId, events, dna);

  // Save to DB
  const weekStart = weekAgo;
  await db
    .insert(aiInsightsTable)
    .values({
      projectId,
      insights: events.length > 0 ? [{ totalEvents: events.length, pageviews: events.filter(e => e.type === "pageview").length }] : [],
      suggestions: suggestions as unknown as Record<string, unknown>[],
      weekStart,
    });

  res.json({ suggestions, eventCount: events.length });
});

// GET /api/analytics/insights/:projectId — fetch latest undismissed insights
router.get("/:projectId", async (req, res) => {
  const projectId = parseInt(req.params["projectId"] ?? "");
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const rows = await db
    .select()
    .from(aiInsightsTable)
    .where(
      and(
        eq(aiInsightsTable.projectId, projectId),
        // dismissedAt is null
      )
    )
    .orderBy(desc(aiInsightsTable.generatedAt))
    .limit(1);

  const insight = rows[0] ?? null;
  if (!insight || insight.dismissedAt) {
    res.json({ suggestions: [], eventCount: 0 });
    return;
  }

  res.json({
    id: insight.id,
    suggestions: insight.suggestions ?? [],
    insights: insight.insights ?? [],
    generatedAt: insight.generatedAt,
  });
});

// POST /api/analytics/insights/:projectId/dismiss — dismiss insights banner
router.post("/:projectId/dismiss", async (req, res) => {
  const projectId = parseInt(req.params["projectId"] ?? "");
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const { id } = req.body as { id?: number };
  if (!id) { res.status(400).json({ error: "Missing insight id" }); return; }

  await db
    .update(aiInsightsTable)
    .set({ dismissedAt: new Date() })
    .where(eq(aiInsightsTable.id, id));

  res.json({ ok: true });
});

export default router;
