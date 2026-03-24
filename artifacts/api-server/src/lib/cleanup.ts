import { db, projectMessagesTable, analyticsEventsTable } from "@workspace/db";
import { lt, sql } from "drizzle-orm";
import { logger } from "./logger";
import { deleteExpiredShares } from "../routes/projects/share";

export async function runCleanup() {
  try {
    logger.info("[Cleanup] Starting scheduled cleanup...");

    // Delete analytics events older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const analyticsResult = await db
      .delete(analyticsEventsTable)
      .where(lt(analyticsEventsTable.createdAt, ninetyDaysAgo));
    logger.info(
      { deleted: analyticsResult },
      "[Cleanup] Old analytics deleted",
    );

    // Keep only last 500 messages per project
    await db.execute(sql`
      DELETE FROM project_messages
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC) AS rn
          FROM project_messages
        ) ranked
        WHERE rn <= 500
      )
    `);

    // Clean up expired sessions (connect-pg-simple uses 'expire' column)
    await db
      .execute(
        sql`
      DELETE FROM session WHERE expire < NOW()
    `,
      )
      .catch(() => {
        // Session table may not exist in all environments
      });

    // Delete expired share links
    await deleteExpiredShares().catch((err) => {
      logger.warn({ err }, "[Cleanup] Failed to delete expired shares");
    });

    logger.info("[Cleanup] Done");
  } catch (err) {
    logger.error({ err }, "[Cleanup] Failed");
  }
}

// Run once at startup, then every 24 hours
export function startCleanupScheduler() {
  runCleanup();
  setInterval(runCleanup, 24 * 60 * 60 * 1000);
}
