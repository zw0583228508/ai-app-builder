import { pgTable, text, serial, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const analyticsEventsTable = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  path: text("path"),
  element: text("element"),
  referrer: text("referrer"),
  sessionId: text("session_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("analytics_events_project_id_idx").on(table.projectId),
  createdAtIdx: index("analytics_events_created_at_idx").on(table.createdAt),
}));

export const aiInsightsTable = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  insights: jsonb("insights").notNull().default([]),
  suggestions: jsonb("suggestions").notNull().default([]),
  weekStart: timestamp("week_start").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  dismissedAt: timestamp("dismissed_at"),
}, (table) => ({
  projectIdIdx: index("ai_insights_project_id_idx").on(table.projectId),
}));

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEventsTable.$inferInsert;
export type AiInsight = typeof aiInsightsTable.$inferSelect;
export type InsertAiInsight = typeof aiInsightsTable.$inferInsert;
