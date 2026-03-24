import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { projectsTable } from "./projects";

export const usageLogsTable = pgTable(
  "usage_logs",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull().default("ai_message"),
    tokensUsed: integer("tokens_used").notNull().default(0),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    model: text("model"),
    latencyMs: integer("latency_ms"),
    promptVersion: text("prompt_version"),
    intentType: text("intent_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("usage_logs_project_id_idx").on(table.projectId),
    userIdIdx: index("usage_logs_user_id_idx").on(table.userId),
    createdAtIdx: index("usage_logs_created_at_idx").on(table.createdAt),
  }),
);

export type UsageLog = typeof usageLogsTable.$inferSelect;
export type InsertUsageLog = typeof usageLogsTable.$inferInsert;
