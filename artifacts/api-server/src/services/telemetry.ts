import { db, usageLogsTable } from "@workspace/db";

export interface AiCallMetrics {
  projectId: number;
  userId?: string | null;
  type?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  promptVersion: string;
  intentType?: string;
}

export async function recordAiCall(metrics: AiCallMetrics): Promise<void> {
  try {
    await db.insert(usageLogsTable).values({
      projectId: metrics.projectId,
      userId: metrics.userId ?? undefined,
      type: metrics.type ?? "ai_message",
      tokensUsed: metrics.inputTokens + metrics.outputTokens,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens,
      model: metrics.model,
      latencyMs: metrics.latencyMs,
      promptVersion: metrics.promptVersion,
      intentType: metrics.intentType ?? null,
    });
  } catch {
    /* telemetry is non-critical — never crash the request */
  }
}

export function startTimer(): () => number {
  const t0 = Date.now();
  return () => Date.now() - t0;
}
