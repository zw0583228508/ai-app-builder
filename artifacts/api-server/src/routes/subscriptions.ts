import { Router, Request, Response } from "express";
import { db, userSubscriptionsTable, plansTable } from "@workspace/db";
import { PLANS } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/subscriptions/plans — list available plans
router.get("/plans", (_req: Request, res: Response) => {
  const plans = Object.entries(PLANS).map(([id, p]) => ({
    id,
    name: p.name,
    maxProjects: p.maxProjects,
    maxMessagesPerDay: p.maxMessagesPerDay,
  }));
  res.json({ plans });
});

// GET /api/subscriptions/me — current user's plan
router.get("/me", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [sub] = await db
    .select()
    .from(userSubscriptionsTable)
    .where(eq(userSubscriptionsTable.userId, userId));

  const planId = (!sub || (sub.expiresAt && sub.expiresAt < new Date())) ? "free" : sub.planId;
  const planDetails = PLANS[planId] ?? PLANS.free;

  res.json({
    planId,
    planName: planDetails.name,
    maxProjects: planDetails.maxProjects,
    maxMessagesPerDay: planDetails.maxMessagesPerDay,
    expiresAt: sub?.expiresAt ?? null,
  });
});

// POST /api/subscriptions/upgrade — admin-only endpoint to upgrade a user's plan
// Requires: caller must be in ADMIN_USER_IDS env var (comma-separated), or NODE_ENV=test
router.post("/upgrade", async (req: Request, res: Response) => {
  const callerId = req.user?.id;
  if (!callerId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const isAdmin = adminIds.includes(callerId) || process.env.NODE_ENV === "test";
  if (!isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }

  const { userId: targetUserId, planId } = req.body as { userId?: string; planId?: string };
  const effectiveUserId = targetUserId ?? callerId;
  if (!planId || !PLANS[planId]) {
    res.status(400).json({ error: "Invalid plan", valid: Object.keys(PLANS) });
    return;
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(userSubscriptionsTable)
    .values({ userId: effectiveUserId, planId, expiresAt })
    .onConflictDoUpdate({
      target: userSubscriptionsTable.userId,
      set: { planId, expiresAt, updatedAt: new Date() },
    });

  res.json({ ok: true, userId: effectiveUserId, planId, expiresAt });
});

export default router;
