/**
 * AI Tools Execution Route
 *
 * POST /api/projects/:id/tools/execute
 *   Execute a single structured tool action against the project workspace.
 *
 * POST /api/projects/:id/tools/execute-batch
 *   Execute multiple actions in sequence and return all results.
 *
 * GET  /api/projects/:id/workspace
 *   Return workspace info, file tree, and runtime status.
 *
 * POST /api/projects/:id/workspace/init
 *   Initialize workspace directory for the project.
 *
 * POST /api/projects/:id/execute-goal
 *   Run the full execution orchestrator via SSE stream.
 *
 * GET  /api/projects/:id/runtime/logs
 *   Return recent stdout/stderr from the running process.
 *
 * GET  /api/projects/:id/runtime/stream
 *   Live SSE stream of runtime stdout/stderr.
 */

import { Router, Request, Response } from "express";
import { executeToolAction } from "../../domain/ai-tools/executor.js";
import {
  getWorkspaceInfo,
  ensureWorkspace,
} from "../../domain/workspace/workspace-manager.js";
import {
  getRuntimeStatus,
  getRuntimeLogs,
} from "../../domain/runtime/runtime-manager.js";
import {
  runExecutionOrchestrator,
  type ExecutionEvent,
} from "../../agents/execution-orchestrator.js";
import { db, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router({ mergeParams: true });

// ── Middleware: verify project ownership ──────────────────────────────────────

async function requireProjectOwnership(
  req: Request,
  res: Response,
): Promise<boolean> {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return false;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }

  const [project] = await db
    .select({ userId: projectsTable.userId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return false;
  }

  if (project.userId && project.userId !== userId) {
    res.status(403).json({ error: "Not authorized" });
    return false;
  }

  return true;
}

// ── POST /api/projects/:id/tools/execute ─────────────────────────────────────

router.post("/:id/tools/execute", async (req: Request, res: Response) => {
  if (!(await requireProjectOwnership(req, res))) return;

  const projectId = Number(req.params.id);
  const rawAction = req.body;

  if (!rawAction || typeof rawAction !== "object") {
    res
      .status(400)
      .json({ error: "Request body must be a JSON action object" });
    return;
  }

  const result = await executeToolAction(rawAction, {
    projectId,
    userId: req.user?.id,
  });

  res.status(result.ok ? 200 : 422).json(result);
});

// ── POST /api/projects/:id/tools/execute-batch ────────────────────────────────

router.post("/:id/tools/execute-batch", async (req: Request, res: Response) => {
  if (!(await requireProjectOwnership(req, res))) return;

  const projectId = Number(req.params.id);
  const { actions } = req.body as { actions?: unknown[] };

  if (!Array.isArray(actions) || actions.length === 0) {
    res.status(400).json({ error: "actions must be a non-empty array" });
    return;
  }

  if (actions.length > 20) {
    res.status(400).json({ error: "Batch size limited to 20 actions" });
    return;
  }

  const ctx = { projectId, userId: req.user?.id };
  const results = [];

  for (const action of actions) {
    const result = await executeToolAction(action, ctx);
    results.push(result);
    if (!result.ok && result.errorType === "sandbox_error") {
      break;
    }
  }

  res.json({ results, totalActions: actions.length, executed: results.length });
});

// ── GET /api/projects/:id/workspace ──────────────────────────────────────────

router.get("/:id/workspace", async (req: Request, res: Response) => {
  if (!(await requireProjectOwnership(req, res))) return;

  const projectId = Number(req.params.id);
  const info = await getWorkspaceInfo(projectId);
  const runtimeStatus = await getRuntimeStatus(projectId);
  const logs = getRuntimeLogs(projectId, 50);

  res.json({ workspace: info, runtime: runtimeStatus, recentLogs: logs });
});

// ── POST /api/projects/:id/workspace/init ─────────────────────────────────────

router.post("/:id/workspace/init", async (req: Request, res: Response) => {
  if (!(await requireProjectOwnership(req, res))) return;

  const projectId = Number(req.params.id);
  const workspacePath = await ensureWorkspace(projectId);
  const info = await getWorkspaceInfo(projectId);

  res.json({ workspacePath, metadata: info.metadata, created: true });
});

// ── POST /api/projects/:id/execute-goal (SSE) ─────────────────────────────────

router.post("/:id/execute-goal", async (req: Request, res: Response) => {
  if (!(await requireProjectOwnership(req, res))) return;

  const projectId = Number(req.params.id);
  const { goal, dnaContext, existingPlan } = req.body as {
    goal?: string;
    dnaContext?: string;
    existingPlan?: string;
  };

  if (!goal?.trim()) {
    res.status(400).json({ error: "goal is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: ExecutionEvent) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      /* client disconnected */
    }
  };

  try {
    const finalState = await runExecutionOrchestrator({
      projectId,
      userId: req.user?.id,
      goal,
      dnaContext,
      existingPlan,
      onEvent: send,
    });

    send({ type: "state_update", state: finalState });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    send({ type: "failed", reason: msg, accumulatedErrors: [msg] });
  }

  res.end();
});

// ── GET /api/projects/:id/runtime/logs ────────────────────────────────────────

router.get("/:id/runtime/logs", async (req: Request, res: Response) => {
  if (!(await requireProjectOwnership(req, res))) return;

  const projectId = Number(req.params.id);
  const maxLines = Math.min(Number(req.query.maxLines ?? 100), 500);
  const logs = getRuntimeLogs(projectId, maxLines);

  res.json(logs);
});

// ── GET /api/projects/:id/runtime/stream (SSE) ────────────────────────────────

router.get("/:id/runtime/stream", async (req: Request, res: Response) => {
  if (!(await requireProjectOwnership(req, res))) return;

  const projectId = Number(req.params.id);
  const { runtimeRegistry } =
    await import("../../domain/runtime/runtime-registry.js");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const removeListener = runtimeRegistry.addLogListener(
    projectId,
    (line, stream) => {
      try {
        res.write(`data: ${JSON.stringify({ stream, line })}\n\n`);
      } catch {
        /* client gone */
      }
    },
  );

  req.on("close", () => {
    removeListener();
    res.end();
  });
});

export default router;
