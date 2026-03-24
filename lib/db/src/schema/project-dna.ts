import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const projectDnaTable = pgTable("project_dna", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projectsTable.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  businessModel: text("business_model"),
  targetAudience: text("target_audience"),
  primaryGoal: text("primary_goal"),
  brandColors: jsonb("brand_colors"),
  brandTone: jsonb("brand_tone"),
  competitors: jsonb("competitors"),
  decisionLog: jsonb("decision_log").default([]),
  projectVibe: text("project_vibe"),
  interests: jsonb("interests"),
  techCuriosity: jsonb("tech_curiosity"),
  visualStyle: text("visual_style"),
  lastGrowSuggestionAt: timestamp("last_grow_suggestion_at"),
  growSuggestionCount: integer("grow_suggestion_count").default(0),
  memoryChunks: jsonb("memory_chunks").default([]),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProjectDNA = typeof projectDnaTable.$inferSelect;
export type InsertProjectDNA = typeof projectDnaTable.$inferInsert;
