/**
 * /api/user/integrations — User Integrations Metadata API (read-only)
 *
 * SECURITY CONTRACT:
 *   - GET returns only safe metadata (provider names, status, capabilities).
 *     Raw credential values are NEVER returned to the client.
 *   - Write operations (save/delete) are handled exclusively by
 *     /api/integrations/:provider/save and /api/integrations/:provider
 *     (routes/integrations.ts — vault-backed, single source of truth).
 *   - The old plaintext storage in user_dna.integrations JSON blob
 *     has been replaced by the encrypted user_integrations table.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { getSession } from "../lib/auth";
import {
  listIntegrations,
  getIntegrationCapabilities,
  deleteIntegration,
} from "../services/integrations/vault";

const router: IRouter = Router();

async function getUserId(req: Request): Promise<string | null> {
  const sid =
    req.cookies?.sid ?? req.headers.cookie?.match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
  if (!sid) return null;
  const session = await getSession(sid).catch(() => null);
  return session?.user?.id ?? null;
}

/**
 * GET /api/user/integrations
 * Returns safe metadata only — provider name, status, lastValidatedAt.
 * NEVER returns raw credential values.
 */
router.get("/user/integrations", async (req: Request, res: Response) => {
  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "לא מחובר" });
    return;
  }

  const integrations = await listIntegrations(userId);
  const out: Record<
    string,
    { connected: boolean; status: string; lastValidatedAt: string | null }
  > = {};
  for (const row of integrations) {
    out[row.provider] = {
      connected: row.status === "active",
      status: row.status,
      lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
    };
  }

  res.json({ integrations: out });
});

/**
 * GET /api/user/integrations/capabilities
 * Returns boolean capability flags for prompt injection.
 * Safe to send to AI model context — no credential values.
 */
router.get(
  "/user/integrations/capabilities",
  async (req: Request, res: Response) => {
    const userId = await getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "לא מחובר" });
      return;
    }
    const capabilities = await getIntegrationCapabilities(userId);
    res.json({ capabilities });
  },
);

/**
 * PUT /api/user/integrations — REMOVED
 * This endpoint previously accepted a flat secrets map.
 * Use POST /api/integrations/:provider/save instead.
 */
router.put("/user/integrations", (_req: Request, res: Response) => {
  res.status(410).json({
    error:
      "This endpoint has been removed. Use POST /api/integrations/:provider/save",
  });
});

/**
 * DELETE /api/user/integrations/:provider
 * Permanently deletes a single provider integration.
 */
router.delete(
  "/user/integrations/:provider",
  async (req: Request, res: Response) => {
    const userId = await getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "לא מחובר" });
      return;
    }
    const provider = req.params.provider as string;
    const deleted = await deleteIntegration(userId, provider);
    if (!deleted) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }
    res.json({ ok: true });
  },
);

export default router;
