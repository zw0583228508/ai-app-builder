import { logger } from "./logger";

const REQUIRED_ENV = ["DATABASE_URL", "SESSION_SECRET"];

const OPTIONAL_ENV = [
  "ANTHROPIC_API_KEY",
  "NETLIFY_TOKEN",
  "VERCEL_TOKEN",
  "GCS_BUCKET",
  "RESEND_API_KEY",
  "SENTRY_DSN",
];

export function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(
      { missing },
      `[Startup] Missing required environment variables`,
    );
    process.exit(1);
  }

  const missingOptional = OPTIONAL_ENV.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    logger.warn(
      { missingOptional },
      "[Startup] Optional env vars not set — some features may be disabled",
    );
  }

  logger.info("[Startup] Environment validation passed");
}
