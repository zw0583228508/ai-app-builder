import { pgTable, text, serial, timestamp, integer, boolean, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./auth";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  stack: text("stack").notNull().default("html"),
  previewHtml: text("preview_html"),
  thumbnailUrl: text("thumbnail_url"),
  isPublic: boolean("is_public").notNull().default(false),
  tags: text("tags").array().default(sql`'{}'`),
  uses: integer("uses").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templateFilesTable = pgTable("template_files", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => templatesTable.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull().default("text"),
  isEntrypoint: boolean("is_entrypoint").notNull().default(false),
});

export type Template = typeof templatesTable.$inferSelect;
export type InsertTemplate = typeof templatesTable.$inferInsert;
