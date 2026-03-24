import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Alias /api/health → same handler (documented public path)
router.get(["/healthz", "/health"], async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "[Health] DB check failed");
    res.status(503).json({ status: "error", error: String(err) });
  }
});

export default router;
