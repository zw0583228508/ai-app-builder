/**
 * AI Tool Action Schemas (Zod)
 *
 * Every action the AI model may emit goes through these schemas.
 * Unknown actions are rejected before reaching the executor.
 */

import { z } from "zod";

// ── Individual Action Schemas ─────────────────────────────────────────────────

export const CreateFileSchema = z.object({
  action: z.literal("create_file"),
  input: z.object({
    path: z.string().min(1).max(500),
    content: z.string().max(500_000),
    overwrite: z.boolean().optional().default(false),
  }),
});

export const UpdateFileSchema = z.object({
  action: z.literal("update_file"),
  input: z.object({
    path: z.string().min(1).max(500),
    content: z.string().max(500_000),
  }),
});

export const ReadFileSchema = z.object({
  action: z.literal("read_file"),
  input: z.object({
    path: z.string().min(1).max(500),
  }),
});

export const DeleteFileSchema = z.object({
  action: z.literal("delete_file"),
  input: z.object({
    path: z.string().min(1).max(500),
  }),
});

export const ListFilesSchema = z.object({
  action: z.literal("list_files"),
  input: z.object({
    directory: z.string().max(500).optional().default("."),
    recursive: z.boolean().optional().default(false),
  }),
});

export const EnsureDirectorySchema = z.object({
  action: z.literal("ensure_directory"),
  input: z.object({
    path: z.string().min(1).max(500),
  }),
});

export const InstallDependenciesSchema = z.object({
  action: z.literal("install_dependencies"),
  input: z.object({
    packages: z.array(z.string().min(1).max(200)).min(1).max(50),
    dev: z.boolean().optional().default(false),
    packageManager: z
      .enum(["npm", "pnpm", "yarn", "bun"])
      .optional()
      .default("npm"),
  }),
});

export const RunCommandSchema = z.object({
  action: z.literal("run_command"),
  input: z.object({
    command: z.string().min(1).max(200),
    args: z.array(z.string().max(500)).max(50).optional().default([]),
    timeoutMs: z
      .number()
      .int()
      .min(1000)
      .max(120_000)
      .optional()
      .default(30_000),
  }),
});

export const StartRuntimeSchema = z.object({
  action: z.literal("start_runtime"),
  input: z.object({
    command: z.string().min(1).max(200),
    args: z.array(z.string().max(500)).max(20).optional().default([]),
    port: z.number().int().min(1024).max(65535).optional(),
    env: z.record(z.string()).optional().default({}),
  }),
});

export const StopRuntimeSchema = z.object({
  action: z.literal("stop_runtime"),
  input: z.object({}).optional(),
});

export const GetProjectStateSchema = z.object({
  action: z.literal("get_project_state"),
  input: z.object({}).optional(),
});

// ── Union Discriminated Schema ────────────────────────────────────────────────

export const AnyToolActionSchema = z.discriminatedUnion("action", [
  CreateFileSchema,
  UpdateFileSchema,
  ReadFileSchema,
  DeleteFileSchema,
  ListFilesSchema,
  EnsureDirectorySchema,
  InstallDependenciesSchema,
  RunCommandSchema,
  StartRuntimeSchema,
  StopRuntimeSchema,
  GetProjectStateSchema,
]);

export type AnyToolAction = z.infer<typeof AnyToolActionSchema>;
export type CreateFileAction = z.infer<typeof CreateFileSchema>;
export type UpdateFileAction = z.infer<typeof UpdateFileSchema>;
export type ReadFileAction = z.infer<typeof ReadFileSchema>;
export type DeleteFileAction = z.infer<typeof DeleteFileSchema>;
export type ListFilesAction = z.infer<typeof ListFilesSchema>;
export type EnsureDirectoryAction = z.infer<typeof EnsureDirectorySchema>;
export type InstallDependenciesAction = z.infer<
  typeof InstallDependenciesSchema
>;
export type RunCommandAction = z.infer<typeof RunCommandSchema>;
export type StartRuntimeAction = z.infer<typeof StartRuntimeSchema>;
export type StopRuntimeAction = z.infer<typeof StopRuntimeSchema>;
export type GetProjectStateAction = z.infer<typeof GetProjectStateSchema>;

// ── Result Types ──────────────────────────────────────────────────────────────

export interface ToolSuccess<T = unknown> {
  ok: true;
  action: string;
  data: T;
  durationMs: number;
}

export interface ToolFailure {
  ok: false;
  action: string;
  errorType:
    | "validation_error"
    | "workspace_error"
    | "runtime_error"
    | "sandbox_error"
    | "model_output_error";
  error: string;
  durationMs: number;
}

export type ToolResult<T = unknown> = ToolSuccess<T> | ToolFailure;

export interface FileListEntry {
  path: string;
  type: "file" | "directory";
  sizeBytes?: number;
}

export interface ProjectStateData {
  workspacePath: string;
  fileTree: FileListEntry[];
  runtimeStatus: "running" | "stopped" | "failed" | "unknown";
  previewUrl?: string;
  metadata: Record<string, unknown>;
}
