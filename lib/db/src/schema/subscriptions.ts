import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const plansTable = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  maxProjects: integer("max_projects").notNull().default(3),
  maxMessagesPerDay: integer("max_messages_per_day").notNull().default(50),
  priceMonthlyUsd: integer("price_monthly_usd").notNull().default(0),
});

export const userSubscriptionsTable = pgTable("user_subscriptions", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().default("free"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Plan = typeof plansTable.$inferSelect;
export type UserSubscription = typeof userSubscriptionsTable.$inferSelect;

export const PLANS: Record<string, { maxProjects: number; maxMessagesPerDay: number; name: string }> = {
  free: { name: "Free", maxProjects: 999, maxMessagesPerDay: 999 },
  pro: { name: "Pro", maxProjects: 999, maxMessagesPerDay: 999 },
  studio: { name: "Studio", maxProjects: 999, maxMessagesPerDay: 2000 },
};
