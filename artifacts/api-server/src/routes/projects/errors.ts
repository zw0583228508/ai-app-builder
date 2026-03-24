import { Router, Request, Response } from "express";
import { db, appErrorsTable, projectsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { debugEngine, classifyError } from "../../services/debug_engine";

const router = Router({ mergeParams: true });

// GET /api/projects/:id/errors
router.get("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const errors = await db
    .select()
    .from(appErrorsTable)
    .where(eq(appErrorsTable.projectId, projectId))
    .orderBy(desc(appErrorsTable.createdAt))
    .limit(100);
  res.json({ errors });
});

// POST /api/projects/:id/errors — from injected tracking script (public, no auth)
router.post("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const { message, stack, url, userAgent, sessionId } = req.body as {
    message?: string;
    stack?: string;
    url?: string;
    userAgent?: string;
    sessionId?: string;
  };
  if (!message) {
    res.status(400).json({ error: "message required" });
    return;
  }
  const [error] = await db
    .insert(appErrorsTable)
    .values({
      projectId,
      message,
      stack,
      url,
      userAgent: userAgent ?? req.headers["user-agent"],
      sessionId,
    })
    .returning();
  res.status(201).json({ error });
});

// DELETE /api/projects/:id/errors — clear all errors
router.delete("/", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const projectId = Number(req.params.id);
  await db
    .delete(appErrorsTable)
    .where(eq(appErrorsTable.projectId, projectId));
  res.json({ ok: true });
});

// POST /api/projects/:id/errors/auto-fix — Issue 23: AI auto-fix for JS errors
router.post("/auto-fix", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const projectId = Number(req.params.id);
  const { errorMessage, errorStack, errorLine } = req.body as {
    errorMessage?: string;
    errorStack?: string;
    errorLine?: number;
  };
  if (!errorMessage) {
    res.status(400).json({ error: "errorMessage required" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project || project.userId !== userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const sourceCode = project.previewHtml ?? "";
  const category = classifyError(errorMessage, errorStack);

  try {
    const result = await debugEngine.fix({
      errorMessage,
      errorStack,
      errorLine,
      sourceCode,
      context: `Project type: ${project.type ?? "html"} | Stack: ${project.stack ?? "html"}`,
    });

    // Log auto-fix attempt to error table
    await db
      .insert(appErrorsTable)
      .values({
        projectId,
        message: errorMessage,
        stack: errorStack,
        sessionId: `autofix-${Date.now()}`,
      })
      .catch(() => {});

    res.json({
      fix: {
        cause: result.finalDiagnosis?.rootCause ?? errorMessage,
        fix_description:
          result.finalDiagnosis?.fixStrategy ?? "Applied automated fix",
        confidence: result.finalDiagnosis?.confidence ?? "low",
        category,
        success: result.success,
        attemptsUsed: result.attempts.length,
        fixedCode: result.success ? result.fixedCode : undefined,
      },
    });
  } catch (e: unknown) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Auto-fix failed" });
  }
});

export default router;
