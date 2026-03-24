/**
 * Prompt Sanity Check
 *
 * Hard fail-safe: scans any string about to be sent to an AI model and throws
 * if it detects credential-shaped content.  This is the LAST LINE OF DEFENSE
 * — it should never trigger if the other security layers are working correctly.
 *
 * If this throws, it means a secret leaked through the build pipeline and was
 * caught before reaching the model. Treat every trigger as a critical incident.
 */

const SECRET_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  // OpenAI / Anthropic / Groq API keys
  { label: "OpenAI key", pattern: /sk-[A-Za-z0-9_-]{20,}/g },
  { label: "Anthropic key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { label: "Anthropic key (alt)", pattern: /sk-ant-api03-[A-Za-z0-9_-]{20,}/g },

  // Stripe
  { label: "Stripe live secret", pattern: /sk_live_[A-Za-z0-9]{20,}/g },
  { label: "Stripe test secret", pattern: /sk_test_[A-Za-z0-9]{20,}/g },

  // GitHub tokens
  { label: "GitHub PAT (classic)", pattern: /ghp_[A-Za-z0-9]{36,}/g },
  { label: "GitHub OAuth token", pattern: /gho_[A-Za-z0-9]{36,}/g },
  { label: "GitHub fine-grained", pattern: /github_pat_[A-Za-z0-9_]{50,}/g },

  // Slack
  { label: "Slack bot token", pattern: /xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+/g },
  {
    label: "Slack user token",
    pattern: /xoxs-[0-9]+-[0-9]+-[0-9]+-[A-Za-z0-9]+/g,
  },

  // Twilio
  { label: "Twilio auth token (hex32)", pattern: /AC[a-f0-9]{32}/g },

  // Database connection strings
  { label: "MongoDB URI", pattern: /mongodb(\+srv)?:\/\/[^\s"'`]+/gi },
  { label: "PostgreSQL URI", pattern: /postgres(ql)?:\/\/[^\s"'`]+/gi },
  { label: "Redis URI", pattern: /redis:\/\/[^\s"'`]+/gi },

  // Supabase anon/service keys (JWT-shaped, project-specific prefix)
  // Supabase keys start with "eyJ" (base64 for {"alg":...) and are very long
  { label: "Supabase/JWT key", pattern: /eyJ[A-Za-z0-9_-]{100,}/g },

  // AWS metadata service
  { label: "AWS metadata endpoint", pattern: /169\.254\.169\.254/g },

  // Bearer tokens in Authorization headers
  {
    label: "Bearer token literal",
    pattern: /Authorization:\s*['"`]?Bearer\s+[A-Za-z0-9._~+/-]{20,}/gi,
  },

  // Raw "API Key:" / "Token:" injection patterns
  { label: "API Key literal", pattern: /API Key:\s*[A-Za-z0-9_\-\.]{16,}/gi },
  { label: "Token literal", pattern: /\bToken:\s*[A-Za-z0-9_\-\.]{16,}/gi },
  { label: "Secret literal", pattern: /Secret Key:\s*[A-Za-z0-9_\-\.]{16,}/gi },
  {
    label: "Auth Token literal",
    pattern: /Auth Token:\s*[A-Za-z0-9_\-\.]{16,}/gi,
  },
];

export class PromptSecretLeakError extends Error {
  constructor(public readonly detectedLabel: string) {
    super(
      `SECURITY: Prompt sanity check failed — detected "${detectedLabel}" in system prompt. ` +
        "The request has been blocked to prevent credential leakage. " +
        "This is a critical security incident — review the prompt-building pipeline immediately.",
    );
    this.name = "PromptSecretLeakError";
  }
}

/**
 * Asserts that the given prompt string contains no credential-shaped content.
 *
 * @throws {PromptSecretLeakError} if a credential pattern is detected
 */
export function assertPromptSafe(prompt: string): void {
  for (const { label, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(prompt)) {
      throw new PromptSecretLeakError(label);
    }
  }
}
