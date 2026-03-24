import { pgTable, text, serial, timestamp, integer, varchar, index } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const appErrorsTable = pgTable("app_errors", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  stack: text("stack"),
  url: text("url"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("app_errors_project_id_idx").on(table.projectId),
  createdAtIdx: index("app_errors_created_at_idx").on(table.createdAt),
}));

export type AppError = typeof appErrorsTable.$inferSelect;
