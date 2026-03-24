/**
 * AI Telemetry
 *
 * Structured logging for every AI invocation.
 */

import { db, usageLogsTable } from "@workspace/db";

export interface AiInvocationLog {
  projectId: number;
  userId?: string;
  model?: string;
  promptVersion?: string;
  intent?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}

export async function logAiInvocation(log: AiInvocationLog): Promise<void> {
  try {
    await db.insert(usageLogsTable).values({
      projectId: log.projectId,
      userId: log.userId,
      model: log.model,
      promptVersion: log.promptVersion,
      intentType: log.intent,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      latencyMs: log.latencyMs,
      tokensUsed: (log.inputTokens ?? 0) + (log.outputTokens ?? 0),
      type: "ai_message",
    });
  } catch {
    // Non-fatal — telemetry must never block the AI response
  }
}

export function createTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
