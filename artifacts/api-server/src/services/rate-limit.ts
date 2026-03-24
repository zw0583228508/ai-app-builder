// In-memory sliding-window rate limiter
// Keyed by userId (or IP as fallback). Never throws — errors are silently ignored.

interface Window {
  count: number;
  resetAt: number; // epoch ms
}

const windows = new Map<string, Window>();
const WINDOW_MS = 60_000; // 1 minute

// Limits per plan per minute
const PLAN_LIMITS: Record<string, number> = {
  studio: 40,
  pro: 20,
  free: 10,
};

/**
 * Check and increment a rate-limit window.
 * @returns { allowed: boolean; remaining: number; resetInMs: number }
 */
export function checkRateLimit(
  userId: string,
  plan: string,
): { allowed: boolean; remaining: number; resetInMs: number } {
  try {
    const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
    const now = Date.now();
    const key = `${userId}:${plan}`;
    const entry = windows.get(key);

    if (!entry || now >= entry.resetAt) {
      // Start a fresh window
      windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return { allowed: true, remaining: limit - 1, resetInMs: WINDOW_MS };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, entry.resetAt - now),
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetInMs: Math.max(0, entry.resetAt - now),
    };
  } catch {
    // Never block a request due to rate-limit internal errors
    return { allowed: true, remaining: 9999, resetInMs: 0 };
  }
}

// Clean up stale windows every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of windows) {
    if (now >= win.resetAt) windows.delete(key);
  }
}, 5 * 60_000);
