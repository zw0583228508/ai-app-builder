/**
 * Tool Execution Audit Logger
 *
 * Every tool call — success or failure — is written to the DB and to the
 * structured pino logger so there is a full audit trail.
 */

import { db, toolAuditLogTable } from "@workspace/db";
import { logger } from "../../lib/logger.js";
import type { ToolResult } from "./schemas.js";

export interface ToolLogEntry {
  projectId?: number;
  userId?: string;
  action: string;
  input: unknown;
  result: ToolResult;
  durationMs: number;
}

/**
 * Persist a tool call result to the audit log table and emit a structured log.
 * Never throws — failures in logging must not propagate.
 */
export async function logToolCall(entry: ToolLogEntry): Promise<void> {
  const { projectId, userId, action, input, result } = entry;

  const safeInput = redactSensitiveKeys(input);

  try {
    await db.insert(toolAuditLogTable).values({
      projectId: projectId ?? null,
      userId: userId ?? null,
      action,
      input: safeInput as Record<string, unknown>,
      result: result as unknown as Record<string, unknown>,
      success: result.ok,
      errorType: result.ok ? null : result.errorType,
      errorMessage: result.ok ? null : result.error,
      durationMs: result.durationMs,
    });
  } catch (err) {
    logger.warn({ err, action }, "tool-audit-log: failed to write to DB");
  }

  if (result.ok) {
    logger.info(
      { projectId, userId, action, durationMs: result.durationMs },
      "tool executed",
    );
  } else {
    logger.warn(
      {
        projectId,
        userId,
        action,
        errorType: result.errorType,
        error: result.error,
        durationMs: result.durationMs,
      },
      "tool failed",
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "key",
  "private",
]);

function redactSensitiveKeys(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveKeys);

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = SENSITIVE_KEYS.has(k.toLowerCase())
      ? "[REDACTED]"
      : redactSensitiveKeys(v);
  }
  return result;
}
