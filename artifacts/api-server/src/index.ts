import * as Sentry from "@sentry/node";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { handleTerminalWs } from "./routes/terminal";
import { handleCollabWs } from "./routes/collab";
import { validateEnv } from "./lib/env-check";
import { startCleanupScheduler } from "./lib/cleanup";
import { restoreActiveSessions } from "./routes/whatsapp";
import { db, pool } from "@workspace/db";

// ── Issue 88: Sentry Error Tracking ─────────────────────────────────────────
if (process.env["SENTRY_DSN"]) {
  Sentry.init({
    dsn: process.env["SENTRY_DSN"],
    environment: process.env["NODE_ENV"] ?? "production",
    tracesSampleRate: 0.1,
    integrations: [Sentry.httpIntegration()],
  });
  logger.info("Sentry initialized");
}

// Validate required environment variables at startup
validateEnv();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

// Single WebSocket server — route by path to avoid ws multi-path 400 bug
const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = url.pathname;
  if (pathname === "/api/terminal") {
    handleTerminalWs(ws, req).catch((err) => {
      logger.error({ err }, "Terminal WebSocket unhandled error");
      ws.close(4500, "Internal error");
    });
  } else if (pathname === "/api/collab") {
    handleCollabWs(ws, req);
  } else {
    ws.close(4004, "Unknown path");
  }
});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
  // Start scheduled cleanup after server is ready
  startCleanupScheduler();
  // Issue 18: Restore WhatsApp sessions persisted before last restart
  restoreActiveSessions().catch(() => {});
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info({ signal }, "[Server] Shutting down gracefully...");

  server.close(async () => {
    try {
      await pool.end();
      logger.info("[Server] DB pool closed. Shutdown complete.");
    } catch (err) {
      logger.error({ err }, "[Server] Error closing DB pool");
    }
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.warn("[Server] Force shutdown after timeout");
    process.exit(1);
  }, 30_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
