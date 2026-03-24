import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  integer,
  real,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

// ── User DNA 2.0 — Advanced persistent memory per user ─────────────────────
export const userDnaTable = pgTable(
  "user_dna",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .unique()
      .notNull(),

    // Skill & Experience
    skillLevel: text("skill_level").default("beginner"),
    // beginner | intermediate | advanced | expert
    primaryLanguages: jsonb("primary_languages").default([]),
    // ["JavaScript", "Python", "TypeScript"]
    frameworks: jsonb("frameworks").default([]),
    experience: jsonb("experience").default({}),
    // {years: 3, domains: ["web", "mobile"]}

    // Preferences
    preferredStack: text("preferred_stack"),
    uiStyle: text("ui_style"),
    // minimal | colorful | corporate | playful
    codeStyle: jsonb("code_style").default({}),
    // {indentation: 2, semicolons: false, quotes: "double"}
    deployPreference: text("deploy_preference"),
    // vercel | netlify | self_hosted | serverless

    // Business & Goals
    businessGoals: jsonb("business_goals").default([]),
    costSensitivity: text("cost_sensitivity").default("medium"),
    // low | medium | high
    growthGoals: jsonb("growth_goals").default([]),
    industryFocus: jsonb("industry_focus").default([]),

    // Learning & Patterns (cross-project)
    projectPatterns: jsonb("project_patterns").default([]),
    // [{type, stack, completedAt, success}]
    commonRequests: jsonb("common_requests").default([]),
    // Most frequent prompt topics
    successfulTemplates: jsonb("successful_templates").default([]),
    // Templates that worked well for this user

    // Engagement
    totalProjects: integer("total_projects").default(0),
    totalMessages: integer("total_messages").default(0),
    totalTokensUsed: integer("total_tokens_used").default(0),
    avgSessionDurationMinutes: real("avg_session_duration_minutes"),
    lastActiveAt: timestamp("last_active_at").defaultNow(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("user_dna_user_id_idx").on(table.userId)],
);

// ── Project AI Plans (Planner Agent output) ──────────────────────────────────
export const projectPlansTable = pgTable("project_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userIdea: text("user_idea").notNull(),
  features: jsonb("features").default([]),
  screens: jsonb("screens").default([]),
  apis: jsonb("apis").default([]),
  dbSchema: jsonb("db_schema").default([]),
  integrations: jsonb("integrations").default([]),
  deploymentStrategy: text("deployment_strategy"),
  estimatedComplexity: text("estimated_complexity"),
  // simple | medium | complex | enterprise
  estimatedHours: real("estimated_hours"),
  agentAssignments: jsonb("agent_assignments").default({}),
  // {frontend: "React + Tailwind", backend: "Express", ...}
  approved: integer("approved").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserDNA = typeof userDnaTable.$inferSelect;
export type ProjectPlan = typeof projectPlansTable.$inferSelect;
