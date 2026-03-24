/**
 * AI Routing Layer
 *
 * Determines generation strategy based on intent + project state.
 * Re-exports intent detection for use by route handlers.
 */

export {
  detectChatIntent,
  getIntentSystemAddition,
  detectContextualSuggestions,
  type ChatIntent,
} from "../intent";

export { detectUserMode } from "../mode";

/**
 * Decides whether to use patch mode or full generation.
 * Patch mode is preferred when:
 * - intent is "patch"
 * - existing HTML is present
 * - message implies targeted edit
 */
export function shouldUsePatchMode(
  intent: string,
  hasExistingCode: boolean,
  messageLength: number,
): boolean {
  if (intent !== "patch" && intent !== "build") return false;
  if (!hasExistingCode) return false;
  if (messageLength > 500) return false; // Long messages usually want full regen
  return intent === "patch";
}

/**
 * Determines if auto-continuation is needed.
 * Used when model hits max_tokens before finishing.
 */
export function shouldContinue(
  stopReason: string | null | undefined,
  attempt: number,
  maxAttempts = 3,
): boolean {
  return stopReason === "max_tokens" && attempt < maxAttempts;
}
