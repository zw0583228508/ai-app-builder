/**
 * AI Model Registry
 *
 * Central registry for all AI model selections and routing decisions.
 * Change model assignments here — do NOT scatter model names across route files.
 */

export const MODELS = {
  generation: "claude-sonnet-4-5-20251001",
  fast: "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODELS;

export const MODEL_USAGE = {
  /** Primary code generation — full quality */
  primaryGeneration: MODELS.generation,
  /** DNA extraction — speed + cost efficiency */
  dnaExtraction: MODELS.fast,
  /** Planner agent — structured JSON output */
  planner: MODELS.fast,
  /** QA test generation — structured test output */
  qaTests: MODELS.fast,
  /** Deployment brain — recommendation output */
  deployBrain: MODELS.fast,
  /** AI code review — structured review JSON */
  codeReview: MODELS.fast,
  /** Prompt enhancement — minimal tokens */
  promptEnhance: MODELS.fast,
  /** Cost optimization — analysis output */
  costOptimization: MODELS.fast,
  /** SaaS generator — full app generation */
  saasGenerator: MODELS.generation,
} as const;

export type ModelUsage = keyof typeof MODEL_USAGE;

export function getModel(usage: ModelUsage): string {
  return MODEL_USAGE[usage];
}
