/**
 * Planner Agent — Prompt 7+8
 * Given a user idea, generates: features, screens, APIs, DB schema,
 * integrations, deployment strategy, agent assignments.
 */
import { Router, Request, Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  db,
  projectsTable,
  projectDnaTable,
  projectPlansTable,
  userDnaTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router({ mergeParams: true });

// POST /api/projects/:id/plan — generate structured plan
router.post("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const { idea } = req.body as { idea?: string };
  if (!idea?.trim()) { res.status(400).json({ error: "idea is required" }); return; }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [dna] = await db.select().from(projectDnaTable).where(eq(projectDnaTable.projectId, projectId));

  // Fetch user DNA for personalization
  const userId = req.user?.id;
  const [userDna] = userId
    ? await db.select().from(userDnaTable).where(eq(userDnaTable.userId, userId))
    : [];

  const dnaContext = dna
    ? `\nPROJECT DNA:\n- Business model: ${dna.businessModel ?? "unknown"}\n- Target audience: ${dna.targetAudience ?? "unknown"}\n- Primary goal: ${dna.primaryGoal ?? "unknown"}`
    : "";
  const userContext = userDna
    ? `\nUSER DNA:\n- Skill level: ${userDna.skillLevel}\n- Preferred stack: ${userDna.preferredStack ?? "any"}\n- Cost sensitivity: ${userDna.costSensitivity}`
    : "";

  const plannerPrompt = `You are a product architect and senior planner.

Given this user idea:
"${idea}"
${dnaContext}${userContext}

Generate a complete structured project plan in JSON format.

The JSON must have exactly these keys:
{
  "features": [{"id": "F1", "name": string, "description": string, "priority": "high|medium|low", "complexity": "simple|medium|complex"}],
  "screens": [{"name": string, "route": string, "components": string[], "description": string}],
  "apis": [{"method": string, "endpoint": string, "description": string, "auth": boolean}],
  "db_schema": [{"table": string, "columns": [{"name": string, "type": string, "description": string}]}],
  "integrations": [{"name": string, "purpose": string, "required": boolean}],
  "deployment_strategy": "static|node_server|serverless|containerized",
  "estimated_complexity": "simple|medium|complex|enterprise",
  "estimated_hours": number,
  "agent_assignments": {
    "frontend": string,
    "backend": string,
    "database": string,
    "auth": string,
    "deployment": string
  },
  "tech_stack": {"frontend": string, "backend": string, "database": string, "hosting": string},
  "security_considerations": string[],
  "performance_notes": string[],
  "cost_estimate_monthly_usd": number
}

Return ONLY the JSON object, no markdown.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{ role: "user", content: plannerPrompt }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    // Strip markdown fences and extract JSON robustly
    const stripped = raw.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI returned no valid JSON");
    const plan = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    // Save to DB
    const [saved] = await db.insert(projectPlansTable).values({
      projectId,
      userIdea: idea,
      features: (plan.features ?? []) as unknown as Record<string, unknown>[],
      screens: (plan.screens ?? []) as unknown as Record<string, unknown>[],
      apis: (plan.apis ?? []) as unknown as Record<string, unknown>[],
      dbSchema: (plan.db_schema ?? []) as unknown as Record<string, unknown>[],
      integrations: (plan.integrations ?? []) as unknown as Record<string, unknown>[],
      deploymentStrategy: plan.deployment_strategy as string,
      estimatedComplexity: plan.estimated_complexity as string,
      estimatedHours: Number(plan.estimated_hours ?? 0),
      agentAssignments: (plan.agent_assignments ?? {}) as Record<string, unknown>,
    }).returning();

    res.json({ plan: { ...plan, id: saved.id } });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Planner failed" });
  }
});

// GET /api/projects/:id/plan — get latest plan
router.get("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const rows = await db
    .select()
    .from(projectPlansTable)
    .where(eq(projectPlansTable.projectId, projectId))
    .orderBy(projectPlansTable.createdAt);
  res.json({ plans: rows });
});

// POST /api/projects/:id/plan/:planId/approve
router.post("/:planId/approve", async (req: Request, res: Response) => {
  const planId = Number(req.params.planId);
  const [updated] = await db
    .update(projectPlansTable)
    .set({ approved: 1 })
    .where(eq(projectPlansTable.id, planId))
    .returning();
  res.json({ plan: updated });
});

export default router;
