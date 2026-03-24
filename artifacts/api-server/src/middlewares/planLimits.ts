import { type Request, type Response, type NextFunction } from "express";
import { db, projectsTable, usageLogsTable, userSubscriptionsTable } from "@workspace/db";
import { eq, and, gte, isNull, count } from "drizzle-orm";
import { PLANS } from "@workspace/db";
import { logger } from "../lib/logger";

export async function checkProjectLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const plan = await getUserPlan(userId);
    const limits = PLANS[plan] ?? PLANS.free;

    const [{ value: projectCount }] = await db
      .select({ value: count() })
      .from(projectsTable)
      .where(and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt)));

    if (Number(projectCount) >= limits.maxProjects) {
      res.status(402).json({
        error: `Plan limit reached: max ${limits.maxProjects} projects on the ${limits.name} plan`,
        limitType: "projects",
        current: Number(projectCount),
        max: limits.maxProjects,
        plan,
      });
      return;
    }

    next();
  } catch (err) {
    logger.error({ err, userId }, "checkProjectLimit error");
    next();
  }
}

export async function checkMessageLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.user?.id;
  if (!userId) { next(); return; }

  try {
    const plan = await getUserPlan(userId);
    const limits = PLANS[plan] ?? PLANS.free;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ value: msgCount }] = await db
      .select({ value: count() })
      .from(usageLogsTable)
      .where(
        and(
          eq(usageLogsTable.userId, userId),
          gte(usageLogsTable.createdAt, today),
        ),
      );

    if (Number(msgCount) >= limits.maxMessagesPerDay) {
      res.status(429).json({
        error: `Daily message limit reached: max ${limits.maxMessagesPerDay} messages/day on the ${limits.name} plan`,
        limitType: "messages",
        current: Number(msgCount),
        max: limits.maxMessagesPerDay,
        plan,
        resetAt: new Date(today.getTime() + 86_400_000).toISOString(),
      });
      return;
    }

    next();
  } catch (err) {
    logger.error({ err, userId }, "checkMessageLimit error");
    next();
  }
}

async function getUserPlan(userId: string): Promise<string> {
  try {
    const [sub] = await db
      .select({ planId: userSubscriptionsTable.planId, expiresAt: userSubscriptionsTable.expiresAt })
      .from(userSubscriptionsTable)
      .where(eq(userSubscriptionsTable.userId, userId));

    if (!sub) return "free";
    if (sub.expiresAt && sub.expiresAt < new Date()) return "free";
    return sub.planId;
  } catch {
    return "free";
  }
}
