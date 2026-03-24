import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  integer,
  boolean,
  real,
  index,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { usersTable } from "./auth";

// ── Runtime Environments (Control Plane) ────────────────────────────────────
export const runtimeEnvironmentsTable = pgTable(
  "runtime_environments",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .references(() => projectsTable.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").notNull().default("stopped"),
    // status: creating | running | idle | stopped | failed
    previewUrl: text("preview_url"),
    port: integer("port"),
    pid: integer("pid"),
    workspacePath: text("workspace_path"),
    cpuUsage: real("cpu_usage").default(0),
    ramUsageMb: real("ram_usage_mb").default(0),
    gpuUsage: real("gpu_usage").default(0),
    lastActiveAt: timestamp("last_active_at").defaultNow(),
    autoShutdownAt: timestamp("auto_shutdown_at"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("runtime_environments_project_id_idx").on(table.projectId),
    index("runtime_environments_status_idx").on(table.status),
  ],
);

// ── Job Queue (Async Task System) ────────────────────────────────────────────
export const jobQueueTable = pgTable(
  "job_queue",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").references(() => projectsTable.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    // type: ai_generation | build | deploy | test | image_gen | audio | gpu_task
    priority: text("priority").notNull().default("default"),
    // priority: low | default | high | gpu
    status: text("status").notNull().default("pending"),
    // status: pending | running | success | failed | cancelled | dead
    payload: jsonb("payload").default({}),
    result: jsonb("result"),
    error: text("error"),
    attempts: integer("attempts").default(0),
    maxAttempts: integer("max_attempts").default(3),
    runAfter: timestamp("run_after"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    timeoutMs: integer("timeout_ms").default(300000),
    gpuRequired: boolean("gpu_required").default(false),
    cpuSeconds: real("cpu_seconds"),
    gpuSeconds: real("gpu_seconds"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("job_queue_project_id_idx").on(table.projectId),
    index("job_queue_status_idx").on(table.status),
    index("job_queue_user_id_idx").on(table.userId),
  ],
);

// ── Cost Records (Per-resource usage) ───────────────────────────────────────
export const costRecordsTable = pgTable(
  "cost_records",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").references(() => projectsTable.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    resourceType: text("resource_type").notNull(),
    // resource_type: cpu_seconds | ram_mb_hours | gpu_seconds | storage_gb | bandwidth_gb | ai_tokens
    quantity: real("quantity").notNull().default(0),
    unitCostUsd: real("unit_cost_usd").notNull().default(0),
    totalCostUsd: real("total_cost_usd").notNull().default(0),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cost_records_project_id_idx").on(table.projectId),
    index("cost_records_user_id_idx").on(table.userId),
  ],
);

// ── QA Test Results ───────────────────────────────────────────────────────────
export const qaTestResultsTable = pgTable(
  "qa_test_results",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .references(() => projectsTable.id, { onDelete: "cascade" })
      .notNull(),
    testSuite: jsonb("test_suite").default([]),
    // [{name, type, code, status, error}]
    passed: integer("passed").default(0),
    failed: integer("failed").default(0),
    skipped: integer("skipped").default(0),
    coveragePercent: real("coverage_percent"),
    autoFixSuggestions: jsonb("auto_fix_suggestions").default([]),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
  },
  (table) => [index("qa_test_results_project_id_idx").on(table.projectId)],
);

// ── Deployment Plans (Brain output) ─────────────────────────────────────────
export const deploymentPlansTable = pgTable(
  "deployment_plans",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .references(() => projectsTable.id, { onDelete: "cascade" })
      .notNull(),
    recommendation: text("recommendation").notNull(),
    // recommendation: static | autoscale_server | background_worker | scheduled_job | gpu_job
    reasoning: text("reasoning"),
    estimatedMonthlyCostUsd: real("estimated_monthly_cost_usd"),
    alternativeOptions: jsonb("alternative_options").default([]),
    decisionFactors: jsonb("decision_factors").default({}),
    selectedAt: timestamp("selected_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("deployment_plans_project_id_idx").on(table.projectId)],
);

// ── Tool Execution Audit Log ─────────────────────────────────────────────────
export const toolAuditLogTable = pgTable(
  "tool_audit_log",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").references(() => projectsTable.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    input: jsonb("input").default({}),
    result: jsonb("result"),
    success: boolean("success").notNull().default(false),
    errorType: text("error_type"),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tool_audit_log_project_id_idx").on(table.projectId),
    index("tool_audit_log_action_idx").on(table.action),
    index("tool_audit_log_created_at_idx").on(table.createdAt),
  ],
);

export type RuntimeEnvironment = typeof runtimeEnvironmentsTable.$inferSelect;
export type JobQueue = typeof jobQueueTable.$inferSelect;
export type CostRecord = typeof costRecordsTable.$inferSelect;
export type QaTestResult = typeof qaTestResultsTable.$inferSelect;
export type DeploymentPlan = typeof deploymentPlansTable.$inferSelect;
export type ToolAuditLog = typeof toolAuditLogTable.$inferSelect;
