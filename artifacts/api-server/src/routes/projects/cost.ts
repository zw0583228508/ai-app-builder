/**
 * Cost Engine — Prompts 5 + 6
 * Per-resource cost tracking + AI optimization agent.
 *
 * COST MODEL:
 * CPU:       $0.00001  per CPU-second
 * RAM:       $0.000001 per MB-hour
 * GPU:       $0.0003   per GPU-second
 * Storage:   $0.00002  per GB
 * Bandwidth: $0.00009  per GB
 * AI Tokens: $0.000003 per 1k tokens (approximate)
 */
import { Router, Request, Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, projectsTable, projectDnaTable, costRecordsTable, usageLogsTable } from "@workspace/db";
import { eq, desc, gte, and, sql } from "drizzle-orm";

const router = Router({ mergeParams: true });

const COST_RATES: Record<string, number> = {
  cpu_seconds:    0.00001,
  ram_mb_hours:   0.000001,
  gpu_seconds:    0.0003,
  storage_gb:     0.00002,
  bandwidth_gb:   0.00009,
  ai_tokens_1k:   0.000003,
};

// GET /api/projects/:id/cost — cost summary
router.get("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

  // Get token usage from usage_logs
  const tokenRows = await db
    .select({
      total: sql<number>`COALESCE(SUM(tokens_used), 0)`,
    })
    .from(usageLogsTable)
    .where(and(eq(usageLogsTable.projectId, projectId), gte(usageLogsTable.createdAt, since)));
  const totalTokens = Number(tokenRows[0]?.total ?? 0);

  // Get cost records
  const records = await db
    .select()
    .from(costRecordsTable)
    .where(and(eq(costRecordsTable.projectId, projectId), gte(costRecordsTable.createdAt, since)))
    .orderBy(desc(costRecordsTable.createdAt));

  // Aggregate by resource type
  const byType: Record<string, number> = {};
  for (const r of records) {
    byType[r.resourceType] = (byType[r.resourceType] ?? 0) + r.totalCostUsd;
  }

  // Add AI token cost
  const aiCost = (totalTokens / 1000) * COST_RATES.ai_tokens_1k;
  byType.ai_tokens = aiCost;

  const totalCost = Object.values(byType).reduce((a, b) => a + b, 0);

  res.json({
    period: "30d",
    totalCostUsd: totalCost,
    byResourceType: byType,
    totalTokens,
    records: records.slice(0, 20),
    costRates: COST_RATES,
  });
});

// POST /api/projects/:id/cost/record — record resource usage
router.post("/record", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const { resourceType, quantity, metadata } = req.body as {
    resourceType?: string; quantity?: number; metadata?: Record<string, unknown>;
  };
  if (!resourceType || quantity === undefined) {
    res.status(400).json({ error: "resourceType and quantity required" }); return;
  }

  const unitCostUsd = COST_RATES[resourceType] ?? 0;
  const totalCostUsd = quantity * unitCostUsd;

  const [record] = await db.insert(costRecordsTable).values({
    projectId,
    userId: req.user?.id,
    resourceType,
    quantity,
    unitCostUsd,
    totalCostUsd,
    periodStart: new Date(),
    metadata: metadata ?? {},
  }).returning();

  res.status(201).json({ record });
});

// POST /api/projects/:id/cost/optimize — Cost Optimization Agent (Prompt 6)
router.post("/optimize", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [dna] = await db.select().from(projectDnaTable).where(eq(projectDnaTable.projectId, projectId));

  // Get current cost data
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tokenRows = await db
    .select({ total: sql<number>`COALESCE(SUM(tokens_used), 0)` })
    .from(usageLogsTable)
    .where(and(eq(usageLogsTable.projectId, projectId), gte(usageLogsTable.createdAt, since)));
  const totalTokens = Number(tokenRows[0]?.total ?? 0);

  const codeSnippet = (project.previewHtml ?? "").slice(0, 3000);

  const optimizePrompt = `You are an infrastructure cost optimization AI agent.

CURRENT USAGE (last 7 days):
- AI Tokens: ${totalTokens.toLocaleString()}
- Stack: ${project.stack ?? "html"}
- Business Model: ${dna?.businessModel ?? "unknown"}

CODE SAMPLE:
\`\`\`
${codeSnippet}
\`\`\`

Analyze and provide cost optimization recommendations. Return JSON:
{
  "current_monthly_estimate_usd": number,
  "optimized_monthly_estimate_usd": number,
  "savings_percent": number,
  "recommendations": [
    {
      "category": "hosting|ai|database|cdn|caching|code",
      "title": string,
      "description": string,
      "action": string,
      "savings_usd_per_month": number,
      "effort": "easy|medium|hard",
      "priority": "critical|high|medium|low"
    }
  ],
  "always_on_services": string[],
  "serverless_candidates": string[],
  "autoscale_suggestions": string[],
  "predicted_growth_cost": {"3m": number, "6m": number, "12m": number},
  "free_tier_opportunities": string[]
}

Return ONLY valid JSON.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: optimizePrompt }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const result = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
    res.json({ optimization: result });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Cost optimization failed" });
  }
});

export default router;
