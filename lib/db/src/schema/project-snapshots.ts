import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const projectSnapshotsTable = pgTable(
  "project_snapshots",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    html: text("html").notNull(),
    label: text("label").notNull().default("גרסה"),
    diffStats: jsonb("diff_stats"),
    snapshotType: text("snapshot_type").notNull().default("html"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("project_snapshots_project_id_idx").on(table.projectId),
  }),
);

export type ProjectSnapshot = typeof projectSnapshotsTable.$inferSelect;
