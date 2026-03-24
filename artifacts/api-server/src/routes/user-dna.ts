/**
 * User DNA 2.0 — Prompt 9
 * Advanced persistent memory per user: skill level, preferences,
 * cross-project learning, growth goals.
 */
import { Router, Request, Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, userDnaTable, projectsTable, usageLogsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

// GET /api/user-dna — get current user's DNA
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [dna] = await db.select().from(userDnaTable).where(eq(userDnaTable.userId, userId));

  if (!dna) {
    // Auto-create empty DNA on first access
    const [created] = await db.insert(userDnaTable).values({ userId }).returning();
    res.json({ dna: created });
    return;
  }
  res.json({ dna });
});

// PATCH /api/user-dna — update user DNA
router.patch("/", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const updates = req.body as Partial<{
    skillLevel: string;
    preferredStack: string;
    uiStyle: string;
    deployPreference: string;
    costSensitivity: string;
    businessGoals: string[];
    growthGoals: string[];
    industryFocus: string[];
    primaryLanguages: string[];
    frameworks: string[];
  }>;

  const [dna] = await db
    .insert(userDnaTable)
    .values({ userId, ...updates, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userDnaTable.userId,
      set: { ...updates, updatedAt: new Date() },
    })
    .returning();

  res.json({ dna });
});

// POST /api/user-dna/extract — extract DNA from message history using AI
router.post("/extract", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  // Get last 50 messages across all projects for this user
  const [tokenData] = await db
    .select({ total: sql<number>`COALESCE(SUM(tokens_used), 0)`, count: sql<number>`COUNT(*)` })
    .from(usageLogsTable)
    .where(eq(usageLogsTable.userId, userId));

  const projects = await db
    .select({ stack: projectsTable.stack, title: projectsTable.title })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .orderBy(desc(projectsTable.createdAt))
    .limit(20);

  const stackCounts: Record<string, number> = {};
  for (const p of projects) {
    const s = p.stack ?? "html";
    stackCounts[s] = (stackCounts[s] ?? 0) + 1;
  }
  const preferredStack = Object.entries(stackCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "html";

  // Analyze project titles for industry/interests
  const titles = projects.map(p => p.title).join(", ");

  const extractPrompt = `You are analyzing a developer's project history to build their DNA profile.

Projects built: ${titles}
Total tokens used: ${tokenData.total}
Total sessions: ${tokenData.count}
Most used stack: ${preferredStack}

Based on the project names and patterns, extract user DNA. Return JSON:
{
  "skill_level": "beginner|intermediate|advanced|expert",
  "primary_languages": string[],
  "frameworks": string[],
  "industry_focus": string[],
  "business_goals": string[],
  "cost_sensitivity": "low|medium|high",
  "ui_style": "minimal|colorful|corporate|playful",
  "common_requests": string[],
  "project_patterns": string[]
}

Return ONLY valid JSON.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: extractPrompt }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    // Strip markdown fences and extract JSON robustly
    const stripped = raw.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI returned no valid JSON");
    const extracted = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const [dna] = await db
      .insert(userDnaTable)
      .values({
        userId,
        skillLevel: extracted.skill_level as string ?? "beginner",
        preferredStack,
        primaryLanguages: extracted.primary_languages as unknown[],
        frameworks: extracted.frameworks as unknown[],
        industryFocus: extracted.industry_focus as unknown[],
        businessGoals: extracted.business_goals as unknown[],
        costSensitivity: extracted.cost_sensitivity as string ?? "medium",
        uiStyle: extracted.ui_style as string,
        commonRequests: extracted.common_requests as unknown[],
        totalProjects: projects.length,
        totalTokensUsed: Number(tokenData.total),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userDnaTable.userId,
        set: {
          skillLevel: extracted.skill_level as string ?? "beginner",
          preferredStack,
          primaryLanguages: extracted.primary_languages as unknown[],
          frameworks: extracted.frameworks as unknown[],
          industryFocus: extracted.industry_focus as unknown[],
          businessGoals: extracted.business_goals as unknown[],
          costSensitivity: extracted.cost_sensitivity as string ?? "medium",
          uiStyle: extracted.ui_style as string,
          commonRequests: extracted.common_requests as unknown[],
          totalProjects: projects.length,
          totalTokensUsed: Number(tokenData.total),
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ dna, extracted });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "DNA extraction failed" });
  }
});

export default router;
