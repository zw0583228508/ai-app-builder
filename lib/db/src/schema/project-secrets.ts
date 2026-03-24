import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectSecretsTable = pgTable(
  "project_secrets",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    environment: text("environment").notNull().default("dev"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("project_secrets_project_id_idx").on(table.projectId),
    projectKeyEnvIdx: uniqueIndex("project_secrets_project_key_env_idx").on(
      table.projectId,
      table.key,
      table.environment,
    ),
  }),
);

export const insertProjectSecretSchema = createInsertSchema(
  projectSecretsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectSecret = z.infer<typeof insertProjectSecretSchema>;
export type ProjectSecret = typeof projectSecretsTable.$inferSelect;
