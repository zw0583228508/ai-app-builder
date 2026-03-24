import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const promptCacheTable = pgTable("prompt_cache", {
  hash: text("hash").primaryKey(),
  response: text("response").notNull(),
  mode: text("mode").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PromptCache = typeof promptCacheTable.$inferSelect;
