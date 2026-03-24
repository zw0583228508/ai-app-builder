import { pgTable, text, serial, timestamp, integer, boolean, varchar, index } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const webhooksTable = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 64 }),
  events: text("events").array().notNull().default(["deploy", "build"]),
  active: boolean("active").notNull().default(true),
  lastStatus: integer("last_status"),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("webhooks_project_id_idx").on(table.projectId),
}));

export type Webhook = typeof webhooksTable.$inferSelect;
