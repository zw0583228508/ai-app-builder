/**
 * context-trimmer — token-aware message history trimming (Fix 5)
 *
 * Replaces the naive slice(-N) approach with token-budget-aware trimming.
 * A single 10K-char message consumes as many tokens as ~100 short messages;
 * trimming by count alone underestimates context size and risks hitting
 * the model's context window on large HTML-heavy projects.
 *
 * Estimate: 1 token ≈ 4 chars (English/Latin), 3 chars (Hebrew/RTL).
 */

function estimateTokens(text: string): number {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) ?? []).length;
  const otherChars = text.length - hebrewChars;
  return Math.ceil(hebrewChars / 3 + otherChars / 4);
}

interface TrimMessage {
  role: string;
  content: string;
}

/**
 * Keep the most recent messages that fit within `maxTokens`.
 * Iterates backward so the newest messages are always preserved.
 *
 * @param messages  Full chat history (oldest → newest)
 * @param maxTokens Soft token budget (default 60 000 — leaves room for system prompt + completion)
 */
export function trimMessagesToTokenBudget(
  messages: TrimMessage[],
  maxTokens: number = 60_000,
): TrimMessage[] {
  let total = 0;
  const result: TrimMessage[] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!;
    const tokens = estimateTokens(msg.content);
    if (total + tokens > maxTokens) break;
    total += tokens;
    result.unshift(msg);
  }

  return result;
}
