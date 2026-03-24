/**
 * Multi-Agent Orchestration Route
 *
 * POST /api/projects/:id/orchestrate
 *
 * Runs the full 5-agent sequential pipeline (Architect → Frontend → Backend
 * → DevOps → QA) and streams progress via SSE. Saves the unified build
 * directive into the project's DNA for use by the main generation pipeline.
 */

import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable, projectDnaTable } from "@workspace/db";
import {
  runOrchestrator,
  type OrchestratorStatus,
} from "../../agents/agent_orchestrator";

const router = Router({ mergeParams: true });

router.post("/:id/orchestrate", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const { idea } = req.body as { idea?: string };

  if (!idea?.trim()) {
    res.status(400).json({ error: "idea is required" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [dna] = await db
    .select()
    .from(projectDnaTable)
    .where(eq(projectDnaTable.projectId, projectId));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      /* prevent crash if client disconnected */
    }
  };

  const dnaContext = dna
    ? `Business model: ${dna.businessModel ?? "unknown"} | Audience: ${dna.targetAudience ?? "unknown"} | Goal: ${dna.primaryGoal ?? "unknown"}`
    : undefined;

  try {
    const result = await runOrchestrator({
      userRequest: idea,
      stack: project.stack ?? "html",
      projectType: project.type,
      dnaContext,
      onStatus: (status: OrchestratorStatus) => {
        switch (status.phase) {
          case "starting":
            send({ type: "orchestrator_start" });
            break;
          case "agent_start":
            send({
              type: "agent_start",
              agentId: status.agentId,
              agentName: status.agentName,
              emoji: status.emoji,
            });
            break;
          case "agent_done":
            send({
              type: "agent_done",
              agentId: status.agentId,
              agentName: status.agentName,
              emoji: status.emoji,
              durationMs: status.durationMs,
              summary: status.summary,
            });
            break;
          case "done":
            send({
              type: "orchestrator_done",
              totalDurationMs: status.result.totalDurationMs,
              agentCount: status.result.agentOutputs.length + 1,
            });
            break;
          case "error":
            send({ type: "error", message: status.message });
            break;
        }
      },
    });

    if (dna) {
      await db
        .update(projectDnaTable)
        .set({
          decisionLog: [
            ...(Array.isArray(dna.decisionLog) ? dna.decisionLog : []),
            {
              timestamp: new Date().toISOString(),
              event: "multi_agent_orchestration",
              detail: result.unifiedBuildDirective.slice(0, 1000),
            },
          ],
          updatedAt: new Date(),
        })
        .where(eq(projectDnaTable.projectId, projectId));
    }

    send({
      type: "result",
      architecturePlan: {
        summary: result.architecturePlan.summary,
        techStack: result.architecturePlan.techStack,
        estimatedComplexity: result.architecturePlan.estimatedComplexity,
        keyComponents: result.architecturePlan.keyComponents,
        securityConsiderations: result.architecturePlan.securityConsiderations,
      },
      unifiedBuildDirective: result.unifiedBuildDirective,
      agentSummaries: result.agentOutputs.map((o) => ({
        agentId: o.agentId,
        agentName: o.agentName,
        emoji: o.emoji,
        summary: o.summary,
        durationMs: o.durationMs,
      })),
    });
  } catch (err: unknown) {
    send({
      type: "error",
      message: err instanceof Error ? err.message : "Orchestration failed",
    });
  }

  res.end();
});

export default router;
