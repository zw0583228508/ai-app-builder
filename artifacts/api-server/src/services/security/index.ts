/**
 * Security Service
 *
 * Centralized security utilities: input sanitization, token validation,
 * SQL safety, and audit helpers.
 */

/** Dangerous SQL patterns that must never be executed in user DB queries */
export const BLOCKED_SQL_PATTERNS = [
  /\bdrop\b/i,
  /\balter\b/i,
  /\btruncate\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bcopy\b/i,
  /set\s+search_path/i,
];

export function isSqlBlocked(sql: string): boolean {
  return BLOCKED_SQL_PATTERNS.some((p) => p.test(sql));
}

/** Strip null bytes and dangerous control characters from user input */
export function sanitizeUserInput(input: string): string {
  return input.replace(/\0/g, "").replace(/[\x01-\x08\x0b\x0c\x0e-\x1f]/g, "");
}

/** Validate that a string does not exceed max length */
export function enforceMaxLength(input: string, maxLength: number): string {
  return input.slice(0, maxLength);
}

/** Safe message content normalization */
export function sanitizeMessage(content: string, maxLength = 8000): string {
  return enforceMaxLength(sanitizeUserInput(content), maxLength);
}

/** Generate a cryptographically safe random token */
import { randomBytes } from "node:crypto";
export function generateToken(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

/** Compute HMAC-SHA256 for webhook signatures */
import { createHmac } from "node:crypto";
export function computeHmac(secret: string, payload: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

/** Verify HMAC signature (constant-time comparison) */
import { timingSafeEqual } from "node:crypto";
export function verifyHmac(
  secret: string,
  payload: string,
  signature: string,
): boolean {
  const expected = computeHmac(secret, payload);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
