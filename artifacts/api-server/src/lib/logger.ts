import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Regex patterns for secrets that must never appear in log output.
 * Applied to string values inside serializers and `redact()` helper.
 */
const SECRET_PATTERNS: RegExp[] = [
  // Anthropic secret keys
  /sk-ant-[a-zA-Z0-9\-_]{20,}/g,
  // OpenAI keys
  /sk-[a-zA-Z0-9]{40,}/g,
  // AWS access keys
  /AKIA[0-9A-Z]{16}/g,
  // Stripe keys
  /(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{20,}/g,
  // GitHub personal access tokens
  /ghp_[a-zA-Z0-9]{36}/g,
  // Generic API key / bearer assignments in text
  /(?:api[_-]?key|access[_-]?token|bearer)[=:\s]+["']?[\w\-._~/+]{20,}/gi,
  // Database connection strings
  /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^\s"'<>]+/gi,
  // Authorization header values (when logged as text)
  /authorization:\s*(?:bearer|basic|token)\s+[\w\-._~/+=]{10,}/gi,
  // Secret / password values in JSON-like text
  /"(?:password|secret|token|credential|key|apikey|api_key)"\s*:\s*"[^"]{8,}"/gi,
];

const SENSITIVE_FIELD_NAMES = new Set([
  "password",
  "secret",
  "token",
  "key",
  "credential",
  "authorization",
  "encryptedvalue",
  "encrypted_value",
  "encryptedpayload",
  "encrypted_payload",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "apikey",
  "api_key",
  "privatekey",
  "private_key",
  "clientsecret",
  "client_secret",
  "webhooksecret",
  "webhook_secret",
  "sessiontoken",
  "session_token",
]);

function redactString(value: string): string {
  let result = value;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
    pattern.lastIndex = 0; // reset stateful global regex
  }
  return result;
}

function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 8) return value;
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redactDeep(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_FIELD_NAMES.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redactDeep(v, depth + 1);
    }
  }
  return out;
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",

  // Structured-field path redaction (transport-layer headers, cookies)
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-api-key']",
      "res.headers['set-cookie']",
      "*.password",
      "*.secret",
      "*.encryptedValue",
      "*.encrypted_value",
      "*.encryptedPayload",
      "*.encrypted_payload",
      "*.accessToken",
      "*.access_token",
      "*.refreshToken",
      "*.refresh_token",
    ],
    censor: "[REDACTED]",
  },

  // Error serializer — redact secrets from message and stack trace
  serializers: {
    err: pino.stdSerializers.wrapErrorSerializer((err) => ({
      ...err,
      message: redactString(err.message ?? ""),
      stack: redactString(err.stack ?? ""),
    })),
  },

  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});

/**
 * Redact secrets from an arbitrary value before embedding it in a log entry.
 * Use this when building log objects or messages from untrusted/user data.
 *
 * @example
 *   logger.warn({ url: redact(userProvidedUrl) }, "webhook delivery failed")
 *   logger.error({ err: redact(caughtError) }, "integration failed")
 */
export function redact(value: unknown): unknown {
  return redactDeep(value);
}
