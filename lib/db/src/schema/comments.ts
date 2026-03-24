import { pgTable, text, serial, timestamp, integer, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { projectFilesTable } from "./project-files";

export const codeCommentsTable = pgTable("code_comments", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => projectFilesTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  lineNumber: integer("line_number").notNull(),
  body: text("body").notNull(),
  resolved: integer("resolved").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CodeComment = typeof codeCommentsTable.$inferSelect;
