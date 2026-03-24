/**
 * AI Domain
 *
 * Core types and contracts for AI orchestration.
 * No AI SDK imports here — pure domain types.
 */

export type ChatIntent = "build" | "patch" | "question" | "plan" | "debug";
export type UserMode = "entrepreneur" | "builder" | "developer" | "maker";
export type GenerationStrategy = "full" | "patch" | "text-only" | "plan";

export interface AiRequest {
  projectId: number;
  userId: string;
  message: string;
  intent: ChatIntent;
  mode: UserMode;
  hasExistingCode: boolean;
  strategy: GenerationStrategy;
}

export interface AiResponse {
  text: string;
  html?: string;
  files?: Array<{ path: string; content: string }>;
  changeSummary?: {
    summary: string;
    changePercent: number;
    addedLines?: number;
    removedLines?: number;
  };
  suggestions?: Array<{ label: string; action: string }>;
  growWithMeSuggestion?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  latencyMs: number;
}

export interface MemoryContext {
  projectDna?: string;
  userDna?: string;
  memoryChunks?: string;
}

export function strategyFromIntent(intent: ChatIntent, hasCode: boolean): GenerationStrategy {
  if (intent === "question") return "text-only";
  if (intent === "plan") return "plan";
  if (intent === "patch" && hasCode) return "patch";
  return "full";
}
