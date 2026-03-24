/**
 * usage-alert — proactive plan-limit warning (Fix 7)
 *
 * Sends a usage_alert SSE event when a user reaches 95% of their plan limit,
 * so they are not surprised when generation stops. Deduplicates per user per day.
 */

import { logger } from "../../lib/logger";

const ALERT_THRESHOLD = 0.95;

const alertedToday = new Map<string, string>();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function checkUsageAlert(
  userId: string,
  currentCount: number,
  maxCount: number,
  sendEvent: (event: Record<string, unknown>) => void,
): void {
  const ratio = currentCount / maxCount;
  if (ratio < ALERT_THRESHOLD) return;

  const today = todayStr();
  if (alertedToday.get(userId) === today) return;

  alertedToday.set(userId, today);

  const remaining = maxCount - currentCount;

  logger.info(
    { userId, currentCount, maxCount, ratio },
    "Usage alert triggered",
  );

  sendEvent({
    type: "usage_alert",
    message: `נותרו לך ${remaining} הודעות בלבד עד למגבלת הפלן שלך. שדרג את החשבון כדי להמשיך ללא הגבלה.`,
    currentCount,
    maxCount,
    remaining,
    thresholdPct: Math.round(ratio * 100),
  });
}
