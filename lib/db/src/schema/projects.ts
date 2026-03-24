import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const projectsTable = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").notNull().default("website"),
    previewHtml: text("preview_html"),
    userMode: text("user_mode").notNull().default("entrepreneur"),
    businessContext: jsonb("business_context"),
    skillScore: integer("skill_score").default(0).notNull(),
    stack: text("stack").notNull().default("html"),
    shareToken: text("share_token"),
    shareTokenExpiresAt: timestamp("share_token_expires_at"),
    customSlug: text("custom_slug").unique(),
    githubRepoUrl: text("github_repo_url"),
    githubRepoName: text("github_repo_name"),
    lastDeployUrl: text("last_deploy_url"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("projects_user_id_idx").on(table.userId),
    deletedAtIdx: index("projects_deleted_at_idx").on(table.deletedAt),
  }),
);

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
