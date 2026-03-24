/**
 * Auto-Continuation Strategy
 *
 * When the AI hits max_tokens before finishing its response,
 * this module manages the retry/continuation logic.
 */

export interface ContinuationState {
  attempt: number;
  maxAttempts: number;
  partialResponse: string;
  stopReason: string | null;
}

export const MAX_CONTINUATION_ATTEMPTS = 3;

/**
 * Returns true if the model stopped due to max_tokens (not "end_turn").
 */
export function needsContinuation(stopReason: string | null | undefined): boolean {
  return stopReason === "max_tokens";
}

/**
 * Build the user message for a continuation turn.
 * Appends the partial response to give the model context.
 */
export function buildContinuationMessage(partialResponse: string): string {
  return `Continue exactly where you left off. Here is what you generated so far:\n\n${partialResponse.slice(-2000)}\n\nContinue from here without repeating what you already wrote.`;
}

/**
 * Merge a continuation response into the previous partial output.
 * Detects overlap and splices cleanly.
 */
export function mergeContinuation(
  previous: string,
  continuation: string,
): string {
  if (!continuation.trim()) return previous;
  const overlap = findOverlap(previous, continuation, 200);
  if (overlap > 0) {
    return previous + continuation.slice(overlap);
  }
  return previous + continuation;
}

function findOverlap(a: string, b: string, windowSize: number): number {
  const tail = a.slice(-windowSize);
  const head = b.slice(0, windowSize);
  for (let len = Math.min(tail.length, head.length); len > 20; len--) {
    if (tail.endsWith(head.slice(0, len))) {
      return len;
    }
  }
  return 0;
}
