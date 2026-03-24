import { pgTable, text, serial, timestamp, integer, bigint, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectStorageObjectsTable = pgTable("project_storage_objects", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type").notNull().default("application/octet-stream"),
  size: bigint("size", { mode: "number" }).notNull().default(0),
  publicUrl: text("public_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("project_storage_project_id_idx").on(table.projectId),
}));

export const insertProjectStorageObjectSchema = createInsertSchema(projectStorageObjectsTable).omit({ id: true, createdAt: true });
export type InsertProjectStorageObject = z.infer<typeof insertProjectStorageObjectSchema>;
export type ProjectStorageObject = typeof projectStorageObjectsTable.$inferSelect;
