/**
 * Runtime Control Plane — Prompt 1
 * Manages isolated execution environments per project.
 * (Simulated in DB — no actual Docker in this environment)
 */
import { Router, Request, Response } from "express";
import { db, projectsTable, runtimeEnvironmentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

/** Check that the authenticated user owns the project. Returns null if authorized, or sends a 401/403/404 response. */
async function checkProjectOwnership(
  req: Request,
  res: Response,
  projectId: number,
): Promise<boolean> {
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

// Helper: simulate CPU/RAM usage for demo purposes
function simulateUsage() {
  return {
    cpuUsage: Math.random() * 30 + 5,
    ramUsageMb: Math.random() * 256 + 64,
    gpuUsage: 0,
  };
}

// GET /api/runtime/:projectId — get environment status
router.get("/:projectId", async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  if (!(await checkProjectOwnership(req, res, projectId))) return;

  const [env] = await db
    .select()
    .from(runtimeEnvironmentsTable)
    .where(eq(runtimeEnvironmentsTable.projectId, projectId))
    .orderBy(desc(runtimeEnvironmentsTable.createdAt))
    .limit(1);

  if (!env) {
    res.json({ environment: null, status: "stopped" });
    return;
  }

  // Auto-shutdown check (idle > 30 min)
  const isIdle =
    env.lastActiveAt &&
    Date.now() - new Date(env.lastActiveAt).getTime() > 30 * 60 * 1000;
  if (isIdle && env.status === "running") {
    await db
      .update(runtimeEnvironmentsTable)
      .set({ status: "idle", updatedAt: new Date() })
      .where(eq(runtimeEnvironmentsTable.id, env.id));
    env.status = "idle";
  }

  res.json({ environment: env });
});

// POST /api/runtime/:projectId/start — start environment
router.post("/:projectId/start", async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
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

  const usage = simulateUsage();
  const autoShutdownAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const [env] = await db
    .insert(runtimeEnvironmentsTable)
    .values({
      projectId,
      status: "running",
      previewUrl: `/preview/${projectId}`,
      ...usage,
      lastActiveAt: new Date(),
      autoShutdownAt,
      metadata: { startedBy: userId, stack: project.stack ?? "html" },
    })
    .onConflictDoNothing()
    .returning();

  // If insert was a no-op (already exists), update status
  if (!env) {
    const [updated] = await db
      .update(runtimeEnvironmentsTable)
      .set({
        status: "running",
        ...usage,
        lastActiveAt: new Date(),
        autoShutdownAt,
        updatedAt: new Date(),
      })
      .where(eq(runtimeEnvironmentsTable.projectId, projectId))
      .returning();
    res.json({ environment: updated, message: "Environment started" });
    return;
  }

  res.json({ environment: env, message: "Environment created and started" });
});

// POST /api/runtime/:projectId/stop — stop environment
router.post("/:projectId/stop", async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  if (!(await checkProjectOwnership(req, res, projectId))) return;

  const [updated] = await db
    .update(runtimeEnvironmentsTable)
    .set({
      status: "stopped",
      cpuUsage: 0,
      ramUsageMb: 0,
      updatedAt: new Date(),
    })
    .where(eq(runtimeEnvironmentsTable.projectId, projectId))
    .returning();

  res.json({ environment: updated, message: "Environment stopped" });
});

// POST /api/runtime/:projectId/restart — restart environment
router.post("/:projectId/restart", async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  if (!(await checkProjectOwnership(req, res, projectId))) return;
  const usage = simulateUsage();

  const [updated] = await db
    .update(runtimeEnvironmentsTable)
    .set({
      status: "running",
      ...usage,
      lastActiveAt: new Date(),
      autoShutdownAt: new Date(Date.now() + 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(runtimeEnvironmentsTable.projectId, projectId))
    .returning();

  res.json({ environment: updated, message: "Environment restarted" });
});

// GET /api/runtime — list all running environments (admin)
router.get("/", async (_req: Request, res: Response) => {
  const envs = await db
    .select()
    .from(runtimeEnvironmentsTable)
    .where(eq(runtimeEnvironmentsTable.status, "running"))
    .orderBy(desc(runtimeEnvironmentsTable.lastActiveAt))
    .limit(50);
  res.json({ environments: envs });
});

export default router;
