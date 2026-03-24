/**
 * User Integrations Vault
 *
 * Stores third-party integration credentials for a user in an encrypted form.
 * The raw secret payload is NEVER stored in plaintext and NEVER returned to the client.
 *
 * Safe metadata (provider, status, capabilities) may be sent to the frontend.
 * The encryptedPayload column is server-only and must be excluded from all client responses.
 *
 * Schema mirrors Phase 2 of the production hardening spec:
 *   - id, userId, provider, encryptedPayload
 *   - metadata (safe non-secret fields only — JSON)
 *   - status: active | revoked | invalid
 *   - createdAt, updatedAt, lastValidatedAt
 */
import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const INTEGRATION_STATUS = ["active", "revoked", "invalid"] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUS)[number];

export const userIntegrationsTable = pgTable(
  "user_integrations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** Provider identifier — e.g. "github", "stripe", "openai", "firebase" */
    provider: text("provider").notNull(),
    /**
     * AES-256-GCM encrypted JSON payload containing raw credentials.
     * Encrypted by artifacts/api-server/src/lib/encryption.ts.
     * NEVER SELECT this column in client-facing queries.
     */
    encryptedPayload: text("encrypted_payload").notNull(),
    /**
     * Safe, non-secret metadata about this integration.
     * May include: displayName, scopes, connectedAt, accountId (partial), capabilities.
     * Must NOT include tokens, keys, passwords, or connection strings.
     */
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    status: text("status")
      .$type<IntegrationStatus>()
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastValidatedAt: timestamp("last_validated_at"),
  },
  (table) => [
    // One active integration per user per provider
    uniqueIndex("uq_user_integrations_user_provider").on(
      table.userId,
      table.provider,
    ),
    index("idx_user_integrations_user_id").on(table.userId),
    index("idx_user_integrations_provider").on(table.provider),
    index("idx_user_integrations_status").on(table.status),
  ],
);

export const insertUserIntegrationSchema = createInsertSchema(
  userIntegrationsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/** Safe metadata shape returned to the client — no encryptedPayload */
export const userIntegrationSafeSchema = createSelectSchema(
  userIntegrationsTable,
).omit({ encryptedPayload: true });

export type InsertUserIntegration = z.infer<typeof insertUserIntegrationSchema>;
export type UserIntegration = typeof userIntegrationsTable.$inferSelect;
export type UserIntegrationSafe = Omit<UserIntegration, "encryptedPayload">;
