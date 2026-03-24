import { Router, Request, Response } from "express";
import { db, webhooksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { assertSafeUrl, SsrfError } from "../../lib/ssrf-guard";
import { logger } from "../../lib/logger";

const router = Router({ mergeParams: true });

function signPayload(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

// GET /api/projects/:id/webhooks
router.get("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const webhooks = await db
    .select({
      id: webhooksTable.id,
      url: webhooksTable.url,
      events: webhooksTable.events,
      active: webhooksTable.active,
      lastStatus: webhooksTable.lastStatus,
      lastTriggeredAt: webhooksTable.lastTriggeredAt,
      createdAt: webhooksTable.createdAt,
    })
    .from(webhooksTable)
    .where(eq(webhooksTable.projectId, projectId))
    .orderBy(webhooksTable.createdAt);
  res.json({ webhooks });
});

// POST /api/projects/:id/webhooks
router.post("/", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const projectId = Number(req.params.id);
  const { url, secret, events } = req.body as {
    url?: string;
    secret?: string;
    events?: string[];
  };
  if (!url?.trim()) {
    res.status(400).json({ error: "url required" });
    return;
  }

  // SSRF prevention — reject internal/private URLs before persisting
  try {
    await assertSafeUrl(url.trim());
  } catch (err) {
    if (err instanceof SsrfError) {
      res
        .status(400)
        .json({
          error: "Invalid webhook URL: must be a public HTTPS endpoint",
        });
      return;
    }
    throw err;
  }

  const [webhook] = await db
    .insert(webhooksTable)
    .values({
      projectId,
      url: url.trim(),
      secret,
      events: events ?? ["deploy", "build"],
    })
    .returning({
      id: webhooksTable.id,
      url: webhooksTable.url,
      events: webhooksTable.events,
      active: webhooksTable.active,
      createdAt: webhooksTable.createdAt,
    });
  res.status(201).json({ webhook });
});

// DELETE /api/projects/:id/webhooks/:webhookId
router.delete("/:webhookId", async (req: Request, res: Response) => {
  const webhookId = Number(req.params.webhookId);
  await db.delete(webhooksTable).where(eq(webhooksTable.id, webhookId));
  res.json({ ok: true });
});

// POST /api/projects/:id/webhooks/trigger — manual or internal trigger
router.post("/trigger", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const { event = "deploy", payload = {} } = req.body as {
    event?: string;
    payload?: Record<string, unknown>;
  };
  const webhooks = await db
    .select()
    .from(webhooksTable)
    .where(
      and(
        eq(webhooksTable.projectId, projectId),
        eq(webhooksTable.active, true),
      ),
    );

  const results: {
    url: string;
    status: number | null;
    error: string | null;
  }[] = [];

  await Promise.all(
    webhooks.map(async (wh) => {
      // SSRF guard on delivery — re-validate stored URL at trigger time
      try {
        await assertSafeUrl(wh.url);
      } catch (err) {
        if (err instanceof SsrfError) {
          logger.warn(
            { projectId, webhookId: wh.id },
            "webhook delivery blocked: SSRF",
          );
          results.push({
            url: wh.url,
            status: null,
            error: "blocked: unsafe URL",
          });
          return;
        }
        throw err;
      }

      try {
        const bodyStr = JSON.stringify({
          event,
          projectId,
          payload,
          ts: Date.now(),
        });
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (wh.secret) {
          headers["X-Hub-Signature-256"] = signPayload(wh.secret, bodyStr);
        }
        // redirect: "error" prevents SSRF via redirect chains
        const r = await fetch(wh.url, {
          method: "POST",
          headers,
          body: bodyStr,
          redirect: "error",
          signal: AbortSignal.timeout(8000),
        });
        await db
          .update(webhooksTable)
          .set({ lastStatus: r.status, lastTriggeredAt: new Date() })
          .where(eq(webhooksTable.id, wh.id));
        results.push({ url: wh.url, status: r.status, error: null });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown";
        results.push({ url: wh.url, status: null, error: msg });
      }
    }),
  );

  res.json({ triggered: results.length, results });
});

export default router;
