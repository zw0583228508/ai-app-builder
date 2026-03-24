/**
 * AIService — Centralized AI Call Gateway
 *
 * All Anthropic model calls should flow through this service.
 * It provides:
 *   - Consistent model selection
 *   - Cost tracking per call (input/output tokens → estimated USD)
 *   - Latency measurement
 *   - Fire-and-forget telemetry logging
 *   - Retry wrapper for transient failures
 *
 * Phase 2 implementation — new calls should use this service;
 * existing direct anthropic calls can be migrated incrementally.
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { recordAiCall } from "../telemetry";
import { PROMPT_VERSION } from "../ai/prompts/index";

type CachedSystemBlock = {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
};

/**
 * Convert a system prompt string to a cached content block.
 * Cache is only applied when the system prompt is long enough to be worth it (> 1000 chars).
 * Ref: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 */
function toCachedSystem(system: string): string | CachedSystemBlock[] {
  if (system.length < 1000) return system;
  return [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
}

const CACHE_BETAS = { "anthropic-beta": "prompt-caching-2024-07-31" } as const;

type AnthropicClient = typeof anthropic;
type MessageCreateInput = Parameters<AnthropicClient["messages"]["create"]>[0];
type StreamCreateInput = Parameters<AnthropicClient["messages"]["stream"]>[0];
type AnthropicMessage = Awaited<
  ReturnType<AnthropicClient["messages"]["create"]>
>;

// ─────────────────────────────────────────────────────────────
// Model catalogue
// ─────────────────────────────────────────────────────────────

export const AI_MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20251001",
} as const;

export type AIModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

// ─────────────────────────────────────────────────────────────
// Cost estimation (USD per million tokens, as of Mar 2026)
// ─────────────────────────────────────────────────────────────

const COST_PER_M_INPUT: Record<string, number> = {
  [AI_MODELS.haiku]: 0.8,
  [AI_MODELS.sonnet]: 3.0,
};
const COST_PER_M_OUTPUT: Record<string, number> = {
  [AI_MODELS.haiku]: 4.0,
  [AI_MODELS.sonnet]: 15.0,
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const inCost = ((COST_PER_M_INPUT[model] ?? 3.0) * inputTokens) / 1_000_000;
  const outCost =
    ((COST_PER_M_OUTPUT[model] ?? 15.0) * outputTokens) / 1_000_000;
  return inCost + outCost;
}

// ─────────────────────────────────────────────────────────────
// Call metadata
// ─────────────────────────────────────────────────────────────

export interface AICallMeta {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export interface AICallOptions {
  projectId?: number;
  userId?: string | null;
  label?: string;
}

// ─────────────────────────────────────────────────────────────
// Non-streaming call
// ─────────────────────────────────────────────────────────────

/**
 * Make a non-streaming Anthropic call and record telemetry.
 *
 * @returns The full Message response with an attached `_meta` object.
 */
export async function aiCall(
  params: MessageCreateInput & { stream?: false },
  options: AICallOptions = {},
): Promise<AnthropicMessage & { _meta: AICallMeta }> {
  const t0 = Date.now();
  const response = await anthropic.messages.create({
    ...params,
    stream: false,
  });
  const latencyMs = Date.now() - t0;

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const estimatedCostUsd = estimateCostUsd(
    params.model,
    inputTokens,
    outputTokens,
  );

  const meta: AICallMeta = {
    model: params.model,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
    latencyMs,
  };

  if (options.projectId) {
    recordAiCall({
      projectId: options.projectId,
      userId: options.userId,
      model: params.model,
      inputTokens,
      outputTokens,
      latencyMs,
      promptVersion: PROMPT_VERSION,
      type: options.label ?? "ai_service_call",
    }).catch(() => {});
  }

  return Object.assign(response, { _meta: meta });
}

// ─────────────────────────────────────────────────────────────
// Streaming call
// ─────────────────────────────────────────────────────────────

/**
 * Start a streaming Anthropic call.
 * Telemetry is recorded when the stream ends via the `finalMessage` callback.
 *
 * @returns The MessageStream — call `.on("text", ...)` or iterate with `for await`.
 */
export function aiStream(
  params: StreamCreateInput,
  options: AICallOptions = {},
): ReturnType<typeof anthropic.messages.stream> {
  const t0 = Date.now();

  const stream = anthropic.messages.stream(params);

  stream.on("finalMessage", (msg) => {
    const latencyMs = Date.now() - t0;
    const inputTokens = msg.usage.input_tokens;
    const outputTokens = msg.usage.output_tokens;
    const estimatedCostUsd = estimateCostUsd(
      params.model,
      inputTokens,
      outputTokens,
    );

    if (options.projectId) {
      recordAiCall({
        projectId: options.projectId,
        userId: options.userId,
        model: params.model,
        inputTokens,
        outputTokens,
        latencyMs,
        promptVersion: PROMPT_VERSION,
        type: options.label ?? "ai_service_stream",
      }).catch(() => {});
    }
  });

  return stream;
}

// ─────────────────────────────────────────────────────────────
// Quick helpers for the most common cases
// ─────────────────────────────────────────────────────────────

/**
 * Make a quick non-streaming call to Haiku and return the text response.
 * Ideal for classification, planning, and short structured-output tasks.
 */
export async function haikuCall(params: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  options?: AICallOptions;
}): Promise<string> {
  const t0 = Date.now();
  const res = await anthropic.messages.create(
    {
      model: AI_MODELS.haiku,
      max_tokens: params.maxTokens ?? 1024,
      stream: false,
      system: toCachedSystem(params.system) as string,
      messages: [{ role: "user", content: params.userMessage }],
    },
    { headers: CACHE_BETAS },
  );
  if (params.options?.projectId) {
    recordAiCall({
      projectId: params.options.projectId,
      userId: params.options.userId,
      model: AI_MODELS.haiku,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      latencyMs: Date.now() - t0,
      promptVersion: PROMPT_VERSION,
      type: params.options.label ?? "haiku_call",
    }).catch(() => {});
  }
  return res.content[0]?.type === "text" ? res.content[0].text : "";
}

/**
 * Make a quick non-streaming call to Sonnet and return the text response.
 * Ideal for complex reasoning, architecture planning, and large generation tasks.
 */
export async function sonnetCall(params: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  options?: AICallOptions;
}): Promise<string> {
  const t0 = Date.now();
  const res = await anthropic.messages.create(
    {
      model: AI_MODELS.sonnet,
      max_tokens: params.maxTokens ?? 4096,
      stream: false,
      system: toCachedSystem(params.system) as string,
      messages: [{ role: "user", content: params.userMessage }],
    },
    { headers: CACHE_BETAS },
  );
  if (params.options?.projectId) {
    recordAiCall({
      projectId: params.options.projectId,
      userId: params.options.userId,
      model: AI_MODELS.sonnet,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      latencyMs: Date.now() - t0,
      promptVersion: PROMPT_VERSION,
      type: params.options.label ?? "sonnet_call",
    }).catch(() => {});
  }
  return res.content[0]?.type === "text" ? res.content[0].text : "";
}
