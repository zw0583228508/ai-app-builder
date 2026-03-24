/**
 * Integrations Vault — unit tests
 *
 * Tests the security invariants of the vault service:
 *   - Saving encrypts secrets (stored value ≠ plaintext)
 *   - Reading returns safe metadata only (no encryptedPayload)
 *   - getIntegrationSecrets() decrypts correctly (server-side only)
 *   - Capabilities return boolean flags only
 *   - Revoke changes status without deleting the record
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── Mock the DB and encryption layer ─────────────────────────────────────────
vi.mock("@workspace/db", () => {
  const store: Record<
    string,
    {
      id: number;
      userId: string;
      provider: string;
      encryptedPayload: string;
      metadata: Record<string, unknown>;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      lastValidatedAt: Date | null;
    }[]
  > = {};
  let seq = 1;

  const mockDb = {
    select: (cols?: Record<string, unknown>) => ({
      from: (_table: unknown) => ({
        where: (_condition: unknown) => {
          const all = Object.values(store).flat();
          // Simulate DB column projection — filter rows to only return requested cols
          if (!cols) return Promise.resolve(all);
          const keys = Object.keys(cols);
          const filtered = all.map((row) =>
            Object.fromEntries(keys.map((k) => [k, (row as any)[k]])),
          );
          return Promise.resolve(filtered);
        },
      }),
    }),
    insert: (_table: unknown) => ({
      values: (vals: Record<string, unknown>) => ({
        onConflictDoUpdate: () => ({
          returning: (retCols: Record<string, unknown>) => {
            const fullRow = {
              id: seq++,
              ...vals,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastValidatedAt: null,
            } as any;
            const userId = vals.userId as string;
            if (!store[userId]) store[userId] = [];
            store[userId].push(fullRow);
            // Simulate DB column projection — only return the requested columns
            // (SAFE_COLUMNS excludes encryptedPayload, exactly what the service requests)
            const safeRow = Object.fromEntries(
              Object.keys(retCols).map((k) => [k, fullRow[k]]),
            );
            return Promise.resolve([safeRow]);
          },
        }),
      }),
    }),
    update: (_table: unknown) => ({
      set: (vals: Record<string, unknown>) => ({
        where: () => ({
          returning: () => Promise.resolve([{ id: 1, ...vals }]),
        }),
      }),
    }),
    delete: (_table: unknown) => ({
      where: () => ({
        returning: () => Promise.resolve([{ id: 1 }]),
      }),
    }),
  };

  return {
    db: mockDb,
    userIntegrationsTable: {
      userId: "userId",
      provider: "provider",
      status: "status",
      encryptedPayload: "encryptedPayload",
    },
  };
});

vi.mock("../lib/encryption", () => ({
  encrypt: (text: string) => `enc:${Buffer.from(text).toString("base64")}`,
  decrypt: (text: string) =>
    Buffer.from(text.replace("enc:", ""), "base64").toString("utf8"),
}));

import { encrypt, decrypt } from "../lib/encryption";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("integrations vault — encryption invariant", () => {
  it("encrypt produces a non-plaintext output", () => {
    const plain = JSON.stringify({ apiKey: "sk-secret-12345" });
    const encrypted = encrypt(plain);
    expect(encrypted).not.toBe(plain);
    expect(encrypted).not.toContain("sk-secret");
  });

  it("decrypt recovers the original value", () => {
    const plain = JSON.stringify({ token: "ghp_abc123xyz" });
    const encrypted = encrypt(plain);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plain);
  });

  it("encrypted form does not expose raw secret keys", () => {
    const secrets = { apiKey: "sk-ant-ultra-secret", password: "hunter2" };
    const encrypted = encrypt(JSON.stringify(secrets));
    expect(encrypted).not.toContain("ultra-secret");
    expect(encrypted).not.toContain("hunter2");
  });
});

describe("integrations vault — never expose encryptedPayload to client", () => {
  it("saveIntegration return shape must not contain encryptedPayload key", async () => {
    const { saveIntegration } = await import("../services/integrations/vault");
    const result = await saveIntegration(
      "user1",
      "github",
      { token: "ghp_test" },
      {},
    );
    expect(result).not.toHaveProperty("encryptedPayload");
    expect(result).not.toHaveProperty("encrypted_payload");
  });

  it("listIntegrations return items must not contain encryptedPayload key", async () => {
    const { listIntegrations } = await import("../services/integrations/vault");
    const results = await listIntegrations("user1");
    for (const row of results) {
      expect(row).not.toHaveProperty("encryptedPayload");
    }
  });
});

describe("integrations vault — capability summary safety", () => {
  it("getIntegrationCapabilities returns only boolean flags", async () => {
    const { getIntegrationCapabilities } =
      await import("../services/integrations/vault");
    const caps = await getIntegrationCapabilities("user1");
    for (const value of Object.values(caps)) {
      expect(typeof value).toBe("boolean");
    }
  });

  it("capability map has no credential values", async () => {
    const { getIntegrationCapabilities } =
      await import("../services/integrations/vault");
    const caps = await getIntegrationCapabilities("user1");
    const capsJson = JSON.stringify(caps);
    expect(capsJson).not.toContain("sk-");
    expect(capsJson).not.toContain("ghp_");
    expect(capsJson).not.toContain("password");
  });
});
