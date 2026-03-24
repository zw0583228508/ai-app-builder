/**
 * User Integrations Vault Service
 *
 * Server-side-only service for managing encrypted user integration credentials.
 *
 * SECURITY INVARIANTS (must never be violated):
 *   1. encryptedPayload is decrypted only on the server, never sent to the client.
 *   2. All reads return UserIntegrationSafe (no encryptedPayload field).
 *   3. Capability flags derived from safe metadata are the only integration
 *      information sent to the AI model (never raw keys or tokens).
 *   4. Secret payloads are encrypted with AES-256-GCM before storage.
 */
import { eq, and } from "drizzle-orm";
import {
  db,
  userIntegrationsTable,
  type UserIntegrationSafe,
} from "@workspace/db";
import { encrypt, decrypt } from "../../lib/encryption";

/** Fields that are safe to return to the client */
const SAFE_COLUMNS = {
  id: userIntegrationsTable.id,
  userId: userIntegrationsTable.userId,
  provider: userIntegrationsTable.provider,
  metadata: userIntegrationsTable.metadata,
  status: userIntegrationsTable.status,
  createdAt: userIntegrationsTable.createdAt,
  updatedAt: userIntegrationsTable.updatedAt,
  lastValidatedAt: userIntegrationsTable.lastValidatedAt,
} as const;

/**
 * Return all integrations for a user — safe metadata only, no secrets.
 */
export async function listIntegrations(
  userId: string,
): Promise<UserIntegrationSafe[]> {
  return db
    .select(SAFE_COLUMNS)
    .from(userIntegrationsTable)
    .where(eq(userIntegrationsTable.userId, userId));
}

/**
 * Return a single integration for a user — safe metadata only.
 */
export async function getIntegration(
  userId: string,
  provider: string,
): Promise<UserIntegrationSafe | null> {
  const [row] = await db
    .select(SAFE_COLUMNS)
    .from(userIntegrationsTable)
    .where(
      and(
        eq(userIntegrationsTable.userId, userId),
        eq(userIntegrationsTable.provider, provider),
      ),
    );
  return row ?? null;
}

/**
 * Save or update an integration credential.
 * The secret payload is encrypted before storage.
 * Returns safe metadata only.
 */
export async function saveIntegration(
  userId: string,
  provider: string,
  secretPayload: Record<string, string>,
  metadata: Record<string, unknown> = {},
): Promise<UserIntegrationSafe> {
  const encryptedPayload = encrypt(JSON.stringify(secretPayload));
  const now = new Date();

  const [row] = await db
    .insert(userIntegrationsTable)
    .values({
      userId,
      provider,
      encryptedPayload,
      metadata,
      status: "active",
      updatedAt: now,
      lastValidatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userIntegrationsTable.userId, userIntegrationsTable.provider],
      set: {
        encryptedPayload,
        metadata,
        status: "active",
        updatedAt: now,
        lastValidatedAt: now,
      },
    })
    .returning(SAFE_COLUMNS);

  return row;
}

/**
 * Revoke an integration — marks it as revoked without deleting.
 * Returns the updated safe record or null if not found.
 */
export async function revokeIntegration(
  userId: string,
  provider: string,
): Promise<UserIntegrationSafe | null> {
  const [row] = await db
    .update(userIntegrationsTable)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(
      and(
        eq(userIntegrationsTable.userId, userId),
        eq(userIntegrationsTable.provider, provider),
      ),
    )
    .returning(SAFE_COLUMNS);
  return row ?? null;
}

/**
 * Delete an integration permanently (hard delete).
 */
export async function deleteIntegration(
  userId: string,
  provider: string,
): Promise<boolean> {
  const result = await db
    .delete(userIntegrationsTable)
    .where(
      and(
        eq(userIntegrationsTable.userId, userId),
        eq(userIntegrationsTable.provider, provider),
      ),
    )
    .returning({ id: userIntegrationsTable.id });
  return result.length > 0;
}

/**
 * Retrieve and decrypt the secret payload for server-side use ONLY.
 * NEVER pass the return value to any client response or AI prompt.
 *
 * @internal — use only within server-side tool executors and adapters
 */
export async function getIntegrationSecrets(
  userId: string,
  provider: string,
): Promise<Record<string, string> | null> {
  const [row] = await db
    .select({ encryptedPayload: userIntegrationsTable.encryptedPayload })
    .from(userIntegrationsTable)
    .where(
      and(
        eq(userIntegrationsTable.userId, userId),
        eq(userIntegrationsTable.provider, provider),
        eq(userIntegrationsTable.status, "active"),
      ),
    );
  if (!row) return null;
  try {
    return JSON.parse(decrypt(row.encryptedPayload)) as Record<string, string>;
  } catch {
    return null;
  }
}

/**
 * Build a capability summary safe for injection into system prompts.
 * Returns ONLY boolean flags and provider names — never credential values.
 *
 * @example
 *   const caps = await getIntegrationCapabilities(userId);
 *   // { github: true, stripe: false, openai: true }
 */
export async function getIntegrationCapabilities(
  userId: string,
): Promise<Record<string, boolean>> {
  const rows = await db
    .select({
      provider: userIntegrationsTable.provider,
      status: userIntegrationsTable.status,
    })
    .from(userIntegrationsTable)
    .where(eq(userIntegrationsTable.userId, userId));

  return Object.fromEntries(
    rows.map((r) => [r.provider, r.status === "active"]),
  );
}
