import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectMessagesTable = pgTable(
  "project_messages",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("project_messages_project_id_idx").on(table.projectId),
    createdAtIdx: index("project_messages_created_at_idx").on(table.createdAt),
  }),
);

export const insertProjectMessageSchema = createInsertSchema(
  projectMessagesTable,
).omit({ id: true, createdAt: true });
export type InsertProjectMessage = z.infer<typeof insertProjectMessageSchema>;
export type ProjectMessage = typeof projectMessagesTable.$inferSelect;
