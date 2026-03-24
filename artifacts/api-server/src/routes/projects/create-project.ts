import { Router } from "express";
import {
  db,
  projectsTable,
  userSubscriptionsTable,
  PLANS,
} from "@workspace/db";
import { CreateProjectBody } from "@workspace/api-zod";
import { eq, and, isNull, count } from "drizzle-orm";
import { getSession } from "../../lib/auth";

const router = Router();

/**
 * Resolve the authenticated userId from either:
 *   1. req.user (set by authMiddleware when cookie is forwarded correctly)
 *   2. session cookie direct lookup (fallback for iframe/cross-origin contexts)
 *
 * Returns null if neither mechanism produces a valid user.
 */
async function resolveUserId(req: any): Promise<string | null> {
  if (req.user?.id) return req.user.id as string;

  const sid =
    req.cookies?.sid ??
    req.headers?.cookie?.match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
  if (!sid) return null;

  const session = await getSession(sid).catch(() => null);
  return session?.user?.id ?? null;
}

router.post("/", async (req, res) => {
  const body = CreateProjectBody.parse(req.body);
  const stack = (req.body as { stack?: string }).stack ?? "html";

  // ── Option A: Require authenticated user — no ownerless projects ──────────
  const userId = await resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "יש להתחבר כדי ליצור פרויקט" });
    return;
  }

  // ── Plan limit: check project count before creating ──────────────────────
  try {
    const [sub] = await db
      .select({
        planId: userSubscriptionsTable.planId,
        expiresAt: userSubscriptionsTable.expiresAt,
      })
      .from(userSubscriptionsTable)
      .where(eq(userSubscriptionsTable.userId, userId));

    const planId =
      !sub || (sub.expiresAt && sub.expiresAt < new Date())
        ? "free"
        : sub.planId;
    const limits = PLANS[planId] ?? PLANS.free;

    const [{ value: projectCount }] = await db
      .select({ value: count() })
      .from(projectsTable)
      .where(
        and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt)),
      );

    if (Number(projectCount) >= limits.maxProjects) {
      res.status(402).json({
        error: `הגעת למגבלת ${limits.maxProjects} פרויקטים של פלן ${limits.name}.`,
        limitType: "projects",
        limitReached: true,
        current: Number(projectCount),
        max: limits.maxProjects,
        plan: planId,
      });
      return;
    }
  } catch {
    // Non-critical — allow creation if limit check fails
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      title: body.title,
      description: body.description,
      type: body.type,
      stack,
      userMode: body.userMode ?? "entrepreneur",
      userId,
    })
    .returning();
  res.status(201).json(project);
});

export default router;
