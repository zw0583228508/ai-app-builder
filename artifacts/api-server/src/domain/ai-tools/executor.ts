/**
 * Tool Action Executor
 *
 * The only module that translates AI-emitted structured actions into real
 * system operations. Never expose raw shell execution to the model.
 *
 * Every action goes through:
 *   1. Zod schema validation
 *   2. Sandbox policy checks
 *   3. Safe execution
 *   4. Structured result
 */

import { spawn } from "child_process";
import {
  AnyToolActionSchema,
  type AnyToolAction,
  type ToolResult,
  type ToolFailure,
  type FileListEntry,
  type ProjectStateData,
} from "./schemas.js";
import { logToolCall } from "./logger.js";
import {
  ensureWorkspace,
  readWorkspaceFile,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  ensureWorkspaceDirectory,
  listWorkspaceFiles,
  getWorkspaceInfo,
} from "../workspace/workspace-manager.js";
import {
  validateCommand,
  validatePackageNames,
  buildSafeChildEnv,
  SandboxError,
  TOOL_EXECUTION_TIMEOUT_MS,
  INSTALL_TIMEOUT_MS,
  RUN_COMMAND_TIMEOUT_MS,
} from "../sandbox/sandbox-policy.js";
import { runtimeRegistry } from "../runtime/runtime-registry.js";

// ── Executor Context ──────────────────────────────────────────────────────────

export interface ExecutorContext {
  projectId: number;
  userId?: string;
}

// ── Main Executor ─────────────────────────────────────────────────────────────

/**
 * Parse and execute a raw action object from the AI model.
 * Validates schema, enforces sandbox policy, returns typed result.
 */
export async function executeToolAction(
  rawAction: unknown,
  ctx: ExecutorContext,
): Promise<ToolResult> {
  const start = Date.now();
  let actionName = "unknown";

  try {
    const parsed = AnyToolActionSchema.safeParse(rawAction);
    if (!parsed.success) {
      const durationMs = Date.now() - start;
      const result: ToolResult = {
        ok: false,
        action: (rawAction as { action?: string })?.action ?? "unknown",
        errorType: "validation_error",
        error: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        durationMs,
      };
      await logToolCall({
        ...ctx,
        action: result.action,
        input: rawAction,
        result,
        durationMs,
      });
      return result;
    }

    const action = parsed.data;
    actionName = action.action;

    const data = await dispatch(action, ctx);
    const durationMs = Date.now() - start;
    const result: ToolResult = {
      ok: true,
      action: actionName,
      data,
      durationMs,
    };
    await logToolCall({
      ...ctx,
      action: actionName,
      input: action.input,
      result,
      durationMs,
    });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const isSandbox = err instanceof SandboxError;
    const rawType = isSandbox ? err.type : "workspace_error";
    const safeType: ToolFailure["errorType"] =
      rawType === "deploy_error"
        ? "runtime_error"
        : (rawType as ToolFailure["errorType"]);
    const result: ToolResult = {
      ok: false,
      action: actionName,
      errorType: safeType,
      error: err instanceof Error ? err.message : String(err),
      durationMs,
    };
    await logToolCall({
      ...ctx,
      action: actionName,
      input: rawAction,
      result,
      durationMs,
    });
    return result;
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function dispatch(
  action: AnyToolAction,
  ctx: ExecutorContext,
): Promise<unknown> {
  switch (action.action) {
    case "create_file":
      return execCreateFile(
        ctx.projectId,
        action.input.path,
        action.input.content,
        { overwrite: action.input.overwrite },
      );

    case "update_file":
      return execUpdateFile(
        ctx.projectId,
        action.input.path,
        action.input.content,
      );

    case "read_file":
      return execReadFile(ctx.projectId, action.input.path);

    case "delete_file":
      return execDeleteFile(ctx.projectId, action.input.path);

    case "list_files":
      return execListFiles(
        ctx.projectId,
        action.input.directory,
        action.input.recursive,
      );

    case "ensure_directory":
      return execEnsureDirectory(ctx.projectId, action.input.path);

    case "install_dependencies":
      return execInstallDependencies(
        ctx.projectId,
        action.input.packages,
        action.input.dev,
        action.input.packageManager,
      );

    case "run_command":
      return execRunCommand(
        ctx.projectId,
        action.input.command,
        action.input.args,
        action.input.timeoutMs,
      );

    case "start_runtime":
      return execStartRuntime(
        ctx.projectId,
        action.input.command,
        action.input.args,
        action.input.port,
        action.input.env,
      );

    case "stop_runtime":
      return execStopRuntime(ctx.projectId);

    case "get_project_state":
      return execGetProjectState(ctx.projectId);

    default: {
      const _exhaustive: never = action;
      throw new SandboxError(
        "model_output_error",
        `Unknown action: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}

// ── Action Implementations ────────────────────────────────────────────────────

async function execCreateFile(
  projectId: number,
  filePath: string,
  content: string,
  opts: { overwrite?: boolean },
): Promise<{ path: string; created: true }> {
  await ensureWorkspace(projectId);
  await writeWorkspaceFile(projectId, filePath, content, opts);
  return { path: filePath, created: true };
}

async function execUpdateFile(
  projectId: number,
  filePath: string,
  content: string,
): Promise<{ path: string; updated: true }> {
  await writeWorkspaceFile(projectId, filePath, content, { overwrite: true });
  return { path: filePath, updated: true };
}

async function execReadFile(
  projectId: number,
  filePath: string,
): Promise<{ path: string; content: string }> {
  const content = await readWorkspaceFile(projectId, filePath);
  if (content === null) {
    throw new SandboxError("workspace_error", `File not found: ${filePath}`);
  }
  return { path: filePath, content };
}

async function execDeleteFile(
  projectId: number,
  filePath: string,
): Promise<{ path: string; deleted: true }> {
  await deleteWorkspaceFile(projectId, filePath);
  return { path: filePath, deleted: true };
}

async function execListFiles(
  projectId: number,
  directory: string,
  recursive: boolean,
): Promise<{ entries: FileListEntry[] }> {
  const tree = await listWorkspaceFiles(projectId, directory, recursive);
  const entries: FileListEntry[] = tree.map((e) => ({
    path: e.path,
    type: e.type,
    sizeBytes: e.sizeBytes,
  }));
  return { entries };
}

async function execEnsureDirectory(
  projectId: number,
  dirPath: string,
): Promise<{ path: string; created: true }> {
  await ensureWorkspaceDirectory(projectId, dirPath);
  return { path: dirPath, created: true };
}

async function execInstallDependencies(
  projectId: number,
  packages: string[],
  dev: boolean,
  packageManager: string,
): Promise<{ installed: string[]; output: string }> {
  validatePackageNames(packages);
  validateCommand(packageManager);

  const workspacePath = await ensureWorkspace(projectId);
  const args = ["install", ...(dev ? ["-D"] : []), ...packages];

  const { stdout, stderr } = await runProcess(
    packageManager,
    args,
    workspacePath,
    INSTALL_TIMEOUT_MS,
  );

  return { installed: packages, output: (stdout + stderr).slice(0, 4000) };
}

async function execRunCommand(
  projectId: number,
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  validateCommand(command, args);

  const workspacePath = await ensureWorkspace(projectId);
  return runProcess(
    command,
    args,
    workspacePath,
    Math.min(timeoutMs, RUN_COMMAND_TIMEOUT_MS),
  );
}

async function execStartRuntime(
  projectId: number,
  command: string,
  args: string[],
  port?: number,
  env: Record<string, string> = {},
): Promise<{ pid: number; port: number; status: "running" }> {
  const { startRuntime } = await import("../runtime/runtime-manager.js");
  const workspacePath = await ensureWorkspace(projectId);
  const result = await startRuntime(
    projectId,
    workspacePath,
    command,
    args,
    port,
    env,
  );
  return result;
}

async function execStopRuntime(projectId: number): Promise<{ stopped: true }> {
  const { stopRuntime } = await import("../runtime/runtime-manager.js");
  await stopRuntime(projectId);
  return { stopped: true };
}

async function execGetProjectState(
  projectId: number,
): Promise<ProjectStateData> {
  const info = await getWorkspaceInfo(projectId);
  const runningProcess = runtimeRegistry.get(projectId);

  return {
    workspacePath: info.workspacePath,
    fileTree: info.fileTree.map((e) => ({
      path: e.path,
      type: e.type,
      sizeBytes: e.sizeBytes,
    })),
    runtimeStatus: runningProcess
      ? runningProcess.exitCode !== null
        ? "stopped"
        : "running"
      : "unknown",
    previewUrl: runningProcess?.previewUrl,
    metadata: (info.metadata ?? {}) as Record<string, unknown>,
  };
}

// ── Process Runner ────────────────────────────────────────────────────────────

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runProcess(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number = TOOL_EXECUTION_TIMEOUT_MS,
  extraEnv: Record<string, string> = {},
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const env = { ...buildSafeChildEnv(extraEnv), HOME: cwd };
    const child = spawn(cmd, args, { cwd, env, shell: false });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new SandboxError(
          "runtime_error",
          `Command "${cmd}" timed out after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout: stdout.slice(0, 8000),
        stderr: stderr.slice(0, 4000),
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new SandboxError(
          "runtime_error",
          `Failed to spawn "${cmd}": ${err.message}`,
        ),
      );
    });
  });
}
