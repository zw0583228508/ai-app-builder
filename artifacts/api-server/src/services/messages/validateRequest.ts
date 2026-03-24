/**
 * messages/validateRequest
 *
 * Handles all input validation, plan-limit enforcement, and per-minute
 * rate limiting for the AI message route.
 *
 * Extracted from messages.ts (Phase 1 modularization) to keep
 * the route handler thin and this logic independently testable.
 */

import { db, userSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "../rate-limit";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ValidationResult =
  | {
      ok: true;
      sanitizedContent: string;
      userPlanId: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      extra?: Record<string, unknown>;
    };

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MAX_MSG_CHARS = 8_000;

export const PLAN_LIMITS: Record<
  string,
  { maxMessages: number; name: string }
> = {
  free: { maxMessages: 50, name: "Free" },
  pro: { maxMessages: 200, name: "Pro" },
  studio: { maxMessages: 2000, name: "Studio" },
};

// ─────────────────────────────────────────────────────────────
// Input sanitization
// ─────────────────────────────────────────────────────────────

/**
 * Strip control characters and null bytes; enforce max length.
 * Returns null if the result is empty after sanitization.
 */
export function sanitizeMessageContent(raw: string): string | null {
  const cleaned = raw
    .replace(/\x00/g, "") // null bytes
    .replace(/[\x01-\x08\x0B-\x1F]/g, "") // control chars (keep \t \n)
    .trim()
    .slice(0, MAX_MSG_CHARS);
  return cleaned || null;
}

// ─────────────────────────────────────────────────────────────
// Plan limits
// ─────────────────────────────────────────────────────────────

/**
 * Resolve the user's active plan ID from the DB.
 * Falls back to "free" on any error or missing record.
 */
export async function resolveUserPlan(userId: string | null): Promise<string> {
  if (!userId) return "free";
  return db
    .select({ planId: userSubscriptionsTable.planId })
    .from(userSubscriptionsTable)
    .where(eq(userSubscriptionsTable.userId, userId))
    .then((rows) => rows[0]?.planId ?? "free")
    .catch(() => "free");
}

/**
 * Check whether the user has exceeded their plan message quota.
 * Returns an error object if the limit is reached, otherwise null.
 */
export function checkPlanLimit(
  userPlanId: string,
  sentMessageCount: number,
): { status: number; error: string; extra: Record<string, unknown> } | null {
  const planConfig = PLAN_LIMITS[userPlanId] ?? PLAN_LIMITS["free"]!;
  if (sentMessageCount >= planConfig.maxMessages) {
    return {
      status: 429,
      error: `הגעת למגבלת ${planConfig.maxMessages} הודעות של פלן ${planConfig.name}. שדרג את החשבון כדי להמשיך.`,
      extra: {
        limitReached: true,
        plan: userPlanId,
        limit: planConfig.maxMessages,
      },
    };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────────────────────

/**
 * Enforce per-minute rate limiting for a user.
 * Returns an error object if rate-limited, otherwise null.
 */
export function checkPerMinuteRateLimit(
  userId: string | null,
  userPlanId: string,
): { status: number; error: string; extra: Record<string, unknown> } | null {
  if (!userId) return null;
  const rl = checkRateLimit(userId, userPlanId);
  if (!rl.allowed) {
    return {
      status: 429,
      error: `שלחת יותר מדי הודעות דקה. נסה שוב בעוד ${Math.ceil(rl.resetInMs / 1000)} שניות.`,
      extra: { retryAfterMs: rl.resetInMs },
    };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Combined validation entry point
// ─────────────────────────────────────────────────────────────

/**
 * Run all validation steps for an incoming AI message request.
 *
 * @returns ValidationResult — either { ok: true, ... } or { ok: false, status, error }
 */
export async function validateMessageRequest(params: {
  rawContent: string;
  userId: string | null;
  sentMessageCount: number;
}): Promise<ValidationResult> {
  const { rawContent, userId, sentMessageCount } = params;

  const sanitizedContent = sanitizeMessageContent(rawContent);
  if (!sanitizedContent) {
    return { ok: false, status: 400, error: "תוכן ההודעה לא יכול להיות ריק" };
  }

  const userPlanId = await resolveUserPlan(userId);

  const planLimitError = checkPlanLimit(userPlanId, sentMessageCount);
  if (planLimitError) {
    return { ok: false, ...planLimitError };
  }

  const rateLimitError = checkPerMinuteRateLimit(userId, userPlanId);
  if (rateLimitError) {
    return { ok: false, ...rateLimitError };
  }

  return { ok: true, sanitizedContent, userPlanId };
}
