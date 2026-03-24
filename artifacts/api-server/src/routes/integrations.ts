/**
 * /api/integrations — User Integrations Vault API
 *
 * Provides write-only credential storage and safe metadata reads.
 *
 * SECURITY CONTRACT:
 *   - GET endpoints return only safe metadata (provider, status, capabilities).
 *   - POST /save is write-only: credentials accepted but never echoed back.
 *   - Secret values are encrypted server-side before storage.
 *   - encryptedPayload is NEVER included in any response.
 */
import { Router } from "express";
import {
  listIntegrations,
  getIntegration,
  saveIntegration,
  revokeIntegration,
  deleteIntegration,
  getIntegrationCapabilities,
} from "../services/integrations/vault";

const router = Router();

function requireUser(
  req: Express.Request,
  res: Express.Response,
): string | null {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    (res as any).status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

/** GET /api/integrations — list all integrations (safe metadata only) */
router.get("/", async (req, res) => {
  const userId = requireUser(req as any, res as any);
  if (!userId) return;
  const integrations = await listIntegrations(userId);
  res.json({ integrations });
});

/** GET /api/integrations/capabilities — boolean capability map for prompt injection */
router.get("/capabilities", async (req, res) => {
  const userId = requireUser(req as any, res as any);
  if (!userId) return;
  const capabilities = await getIntegrationCapabilities(userId);
  res.json({ capabilities });
});

/** GET /api/integrations/:provider — single integration metadata */
router.get("/:provider", async (req, res) => {
  const userId = requireUser(req as any, res as any);
  if (!userId) return;
  const { provider } = req.params;
  const integration = await getIntegration(userId, provider);
  if (!integration) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  res.json({ integration });
});

/**
 * POST /api/integrations/:provider/save — write-only credential storage.
 * Accepts { secrets: Record<string, string>, metadata?: Record<string, unknown> }
 * Returns only safe metadata — no echoing of secrets.
 */
router.post("/:provider/save", async (req, res) => {
  const userId = requireUser(req as any, res as any);
  if (!userId) return;

  const { provider } = req.params;
  const { secrets, metadata } = req.body as {
    secrets?: Record<string, string>;
    metadata?: Record<string, unknown>;
  };

  if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) {
    res.status(400).json({ error: "secrets object required" });
    return;
  }
  // Validate all secret values are strings
  for (const [k, v] of Object.entries(secrets)) {
    if (typeof v !== "string") {
      res.status(400).json({ error: `secrets.${k} must be a string` });
      return;
    }
    if (v.length === 0) {
      res.status(400).json({ error: `secrets.${k} must not be empty` });
      return;
    }
  }

  const integration = await saveIntegration(
    userId,
    provider,
    secrets,
    metadata ?? {},
  );
  // Return safe metadata only — secrets are NEVER echoed
  res.status(201).json({ integration });
});

/** DELETE /api/integrations/:provider/revoke — soft-delete (marks as revoked) */
router.delete("/:provider/revoke", async (req, res) => {
  const userId = requireUser(req as any, res as any);
  if (!userId) return;
  const { provider } = req.params;
  const integration = await revokeIntegration(userId, provider);
  if (!integration) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  res.json({ integration });
});

/** DELETE /api/integrations/:provider — hard delete */
router.delete("/:provider", async (req, res) => {
  const userId = requireUser(req as any, res as any);
  if (!userId) return;
  const { provider } = req.params;
  const deleted = await deleteIntegration(userId, provider);
  if (!deleted) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
