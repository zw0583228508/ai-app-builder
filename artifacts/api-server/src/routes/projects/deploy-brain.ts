/**
 * Deployment Brain — Prompt 10
 * Intelligent deployment decision engine based on app type, traffic, cost, performance.
 */
import { Router, Request, Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, projectsTable, projectDnaTable, deploymentPlansTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

// POST /api/projects/:id/deploy-brain — analyze and recommend deployment strategy
router.post("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const { html, stack, trafficExpectation, budgetUsd } = req.body as {
    html?: string; stack?: string; trafficExpectation?: string; budgetUsd?: number;
  };

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [dna] = await db.select().from(projectDnaTable).where(eq(projectDnaTable.projectId, projectId));

  const codeSnippet = (html ?? project.previewHtml ?? "").slice(0, 2000);

  const prompt = `You are a deployment strategy expert.

Analyze this project and recommend the optimal deployment type.

PROJECT INFO:
- Stack: ${stack ?? project.stack ?? "html"}
- Business model: ${dna?.businessModel ?? "unknown"}
- Primary goal: ${dna?.primaryGoal ?? "unknown"}
- Traffic expectation: ${trafficExpectation ?? "unknown"}
- Monthly budget: $${budgetUsd ?? "unknown"}

CODE PREVIEW:
\`\`\`
${codeSnippet}
\`\`\`

DEPLOYMENT OPTIONS:
1. static — simple HTML/CSS/JS, no server needed (Netlify/Vercel) — $0-5/mo
2. autoscale_server — Node.js/Express with auto-scaling — $10-50/mo
3. background_worker — long-running processes, queues, cron jobs — $5-20/mo
4. scheduled_job — runs periodically, not always-on — $1-5/mo
5. gpu_job — ML/AI workloads, heavy compute — $50-500/mo

Return ONLY valid JSON with this exact structure:
{
  "recommendation": "static|autoscale_server|background_worker|scheduled_job|gpu_job",
  "reasoning": "Detailed explanation in Hebrew why this is best",
  "estimated_monthly_cost_usd": number,
  "alternative_options": [
    {"type": string, "reasoning": string, "cost_usd": number}
  ],
  "decision_factors": {
    "has_backend": boolean,
    "needs_database": boolean,
    "has_ai_workload": boolean,
    "is_always_on": boolean,
    "expected_users_per_day": number
  },
  "optimization_tips": string[],
  "recommended_provider": string,
  "scaling_strategy": string
}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const brain = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as Record<string, unknown>;

    // Save to DB
    const [saved] = await db.insert(deploymentPlansTable).values({
      projectId,
      recommendation: brain.recommendation as string ?? "static",
      reasoning: brain.reasoning as string,
      estimatedMonthlyCostUsd: Number(brain.estimated_monthly_cost_usd ?? 0),
      alternativeOptions: (brain.alternative_options ?? []) as unknown as Record<string, unknown>[],
      decisionFactors: (brain.decision_factors ?? {}) as Record<string, unknown>,
    }).returning();

    res.json({ brain: { ...brain, id: saved.id } });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Deploy Brain failed" });
  }
});

// GET /api/projects/:id/deploy-brain — get latest recommendation
router.get("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const [latest] = await db
    .select()
    .from(deploymentPlansTable)
    .where(eq(deploymentPlansTable.projectId, projectId))
    .orderBy(desc(deploymentPlansTable.createdAt))
    .limit(1);
  res.json({ brain: latest ?? null });
});

export default router;
