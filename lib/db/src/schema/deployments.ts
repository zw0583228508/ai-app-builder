import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const deploymentsTable = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  provider: text("provider").notNull().default("netlify"),
  url: text("url"),
  siteId: text("site_id"),
  deployId: text("deploy_id"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("deployments_project_id_idx").on(table.projectId),
  statusIdx: index("deployments_status_idx").on(table.status),
}));

export type Deployment = typeof deploymentsTable.$inferSelect;
export type InsertDeployment = typeof deploymentsTable.$inferInsert;
