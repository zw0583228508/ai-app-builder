import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const projectDatabasesTable = pgTable("project_databases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  schemaName: text("schema_name").notNull(),
  status: text("status").notNull().default("ready"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProjectDatabase = typeof projectDatabasesTable.$inferSelect;
