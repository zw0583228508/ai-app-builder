import * as Sentry from "@sentry/node";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

// Replit (and most PaaS platforms) sit behind a reverse proxy that sets
// X-Forwarded-For.  Trusting the proxy lets express-rate-limit correctly
// identify client IPs and avoids the ERR_ERL_UNEXPECTED_X_FORWARDED_FOR error.
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// ── CORS — environment-aware, explicit origin allowlist ───────────────────────
// In production: only allow origins explicitly listed in ALLOWED_ORIGINS env var
// or inferred from REPLIT_DEV_DOMAIN. Avoid reflect-all in production.
const isProd = process.env["NODE_ENV"] === "production";
const allowedOriginsEnv = process.env["ALLOWED_ORIGINS"];
const replitDomain = process.env["REPLIT_DEV_DOMAIN"];

function buildCorsOrigin(): string | string[] | boolean {
  if (!isProd) return true;
  if (allowedOriginsEnv) {
    return allowedOriginsEnv
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  if (replitDomain) {
    return [`https://${replitDomain}`, `https://www.${replitDomain}`];
  }
  logger.error(
    "CORS: no ALLOWED_ORIGINS or REPLIT_DEV_DOMAIN set in production — rejecting all cross-origin requests",
  );
  return false;
}

app.use(cors({ credentials: true, origin: buildCorsOrigin() }));

// ── Security headers ────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(authMiddleware);

// ── Rate limiting ──────────────────────────────────────────────────────────────
// General API limit
app.use(
  "/api/",
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    skip: (req) => req.method === "GET",
    message: { error: "יותר מדי בקשות, נסה שוב בעוד דקה" },
  }),
);

// Stricter limit on AI chat (expensive calls)
app.use(
  "/api/projects/:id/messages",
  rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    keyGenerator: (req) =>
      (req as Express.Request & { user?: { id: string } }).user?.id ?? "anon",
    message: { error: "יותר מדי הודעות, נסה שוב בעוד דקה" },
  }),
);

// Stricter limit on deployments (POST/PUT only — skip GET polling)
app.use(
  "/api/projects/:id/deployments",
  rateLimit({
    windowMs: 300_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "GET",
    validate: { xForwardedForHeader: false },
    keyGenerator: (req) =>
      (req as Express.Request & { user?: { id: string } }).user?.id ?? "anon",
    message: { error: "יותר מדי פרסומים, נסה שוב בעוד 5 דקות" },
  }),
);

// Specific rate limit on CORS proxy to prevent abuse (30 req/min per user)
app.use(
  "/api/proxy",
  rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    keyGenerator: (req) =>
      (req as Express.Request & { user?: { id: string } }).user?.id ?? "anon",
    message: { error: "יותר מדי בקשות proxy, נסה שוב בעוד דקה" },
  }),
);

// Rate limit on AI proxy (separate from main AI chat — 15 req/min per user)
app.use(
  "/api/ai-proxy",
  rateLimit({
    windowMs: 60_000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    keyGenerator: (req) =>
      (req as Express.Request & { user?: { id: string } }).user?.id ?? "anon",
    message: { error: "יותר מדי קריאות AI, נסה שוב בעוד דקה" },
  }),
);

// Rate limit on public share token lookup — brute-force prevention (20 req/min per IP)
app.use(
  "/api/projects/share",
  rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { error: "יותר מדי ניסיונות, נסה שוב בעוד דקה" },
  }),
);

// Rate limit on webhook trigger — 10 triggers per 5 min per project
app.use(
  "/api/projects/:id/webhooks/trigger",
  rateLimit({
    windowMs: 300_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    keyGenerator: (req) => `webhook-${req.params.id ?? "unknown"}`,
    message: { error: "יותר מדי טריגרים של webhook, נסה שוב בעוד 5 דקות" },
  }),
);

app.use("/api", router);

// ── Issue 88: Sentry error handler (must come AFTER all routes) ───────────
if (process.env["SENTRY_DSN"]) {
  app.use(Sentry.expressErrorHandler());
}

// Global error handler fallback
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
