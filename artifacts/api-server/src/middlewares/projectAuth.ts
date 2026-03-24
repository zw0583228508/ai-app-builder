import { type Request, type Response, type NextFunction } from "express";
import { db, projectsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      project?: typeof projectsTable.$inferSelect;
      projectRole?: "owner" | "viewer";
    }
  }
}

export async function requireProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const projectId = Number(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), isNull(projectsTable.deletedAt)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (project.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    req.project = project;
    req.projectRole = "owner";
    next();
  } catch (err) {
    logger.error({ err, projectId }, "requireProjectAccess error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export function requireRole(...roles: Array<"owner" | "viewer">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.projectRole || !roles.includes(req.projectRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
