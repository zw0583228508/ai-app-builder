import { Router, Request, Response } from "express";
import { db, usageLogsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";

const router = Router({ mergeParams: true });

// GET /api/projects/:id/usage — usage summary for a project
router.get("/", async (req: Request, res: Response) => {
  const projectId = Number((req.params as Record<string, string>).id);
  if (!projectId) { res.status(400).json({ error: "Invalid project id" }); return; }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const logs = await db
    .select()
    .from(usageLogsTable)
    .where(and(eq(usageLogsTable.projectId, projectId), gte(usageLogsTable.createdAt, thirtyDaysAgo)))
    .orderBy(usageLogsTable.createdAt);

  const totalTokens = logs.reduce((sum, l) => sum + (l.tokensUsed || 0), 0);
  const aiMessages = logs.filter(l => l.type === "ai_message").length;
  const agentRuns = logs.filter(l => l.type === "agent_run").length;

  // Rough cost estimate (claude-sonnet pricing: ~$3/1M input, ~$15/1M output)
  const estimatedCostUsd = (totalTokens / 1_000_000) * 9; // avg $9/1M tokens

  // Daily breakdown
  const daily = logs.reduce((acc, l) => {
    const day = l.createdAt.toISOString().slice(0, 10);
    acc[day] = (acc[day] || 0) + (l.tokensUsed || 0);
    return acc;
  }, {} as Record<string, number>);

  res.json({
    summary: { totalTokens, aiMessages, agentRuns, estimatedCostUsd },
    daily,
    logs: logs.slice(-20), // last 20 entries
  });
});

export default router;
