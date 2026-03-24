/**
 * Runtime Manager
 *
 * Manages real child_process-based project runtimes.
 * Provides process lifecycle: start, stop, restart, status.
 * Runtime status reflects ACTUAL process state, not just DB records.
 */

import { spawn } from "child_process";
import { db, runtimeEnvironmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { runtimeRegistry, type RuntimeProcess } from "./runtime-registry.js";
import {
  allocatePort,
  releasePort,
  assertRuntimeCapacity,
} from "./resource-policy.js";
import {
  validateCommand,
  buildSafeChildEnv,
  SandboxError,
} from "../sandbox/sandbox-policy.js";
import { logger } from "../../lib/logger.js";

const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN ?? "localhost";

// ── Public API ────────────────────────────────────────────────────────────────

export async function startRuntime(
  projectId: number,
  workspacePath: string,
  command: string,
  args: string[] = [],
  preferredPort?: number,
  extraEnv: Record<string, string> = {},
): Promise<{ pid: number; port: number; status: "running" }> {
  // Stop existing runtime for this project if any
  const existing = runtimeRegistry.get(projectId);
  if (existing && existing.exitCode === null) {
    await stopRuntime(projectId);
  }

  assertRuntimeCapacity();
  validateCommand(command, args);

  const port = allocatePort(preferredPort);
  const env = buildSafeChildEnv({ ...extraEnv, PORT: String(port) });

  logger.info({ projectId, command, args, port }, "runtime: starting");

  const child = spawn(command, args, {
    cwd: workspacePath,
    env,
    shell: false,
    detached: false,
  });

  if (!child.pid) {
    releasePort(port);
    throw new SandboxError("runtime_error", `Failed to spawn "${command}"`);
  }

  const previewUrl = buildPreviewUrl(port);

  const runtime: RuntimeProcess = {
    projectId,
    pid: child.pid,
    port,
    previewUrl,
    workspacePath,
    command,
    startedAt: new Date(),
    exitCode: null,
    process: child,
    stdout: [],
    stderr: [],
    logListeners: [],
  };

  // Capture output
  child.stdout?.on("data", (data: Buffer) => {
    const line = data.toString().trimEnd();
    runtime.stdout.push(line);
    if (runtime.stdout.length > 500) runtime.stdout.shift();
    for (const listener of runtime.logListeners) listener(line, "stdout");
  });

  child.stderr?.on("data", (data: Buffer) => {
    const line = data.toString().trimEnd();
    runtime.stderr.push(line);
    if (runtime.stderr.length > 200) runtime.stderr.shift();
    for (const listener of runtime.logListeners) listener(line, "stderr");
  });

  child.on("exit", (code) => {
    runtime.exitCode = code ?? 1;
    releasePort(port);
    logger.info(
      { projectId, pid: child.pid, exitCode: code },
      "runtime: exited",
    );

    db.update(runtimeEnvironmentsTable)
      .set({ status: code === 0 ? "stopped" : "failed", updatedAt: new Date() })
      .where(eq(runtimeEnvironmentsTable.projectId, projectId))
      .catch(() => {});
  });

  child.on("error", (err) => {
    runtime.exitCode = 1;
    releasePort(port);
    logger.error({ projectId, err }, "runtime: spawn error");
  });

  runtimeRegistry.set(projectId, runtime);

  // Persist to DB
  await upsertRuntimeRecord(projectId, {
    status: "running",
    port,
    pid: child.pid,
    previewUrl,
    workspacePath,
  });

  return { pid: child.pid, port, status: "running" };
}

export async function stopRuntime(projectId: number): Promise<void> {
  const runtime = runtimeRegistry.get(projectId);
  if (!runtime || runtime.exitCode !== null) {
    // Already stopped — just update DB
    await db
      .update(runtimeEnvironmentsTable)
      .set({ status: "stopped", updatedAt: new Date() })
      .where(eq(runtimeEnvironmentsTable.projectId, projectId));
    return;
  }

  logger.info({ projectId, pid: runtime.pid }, "runtime: stopping");

  runtime.process.kill("SIGTERM");

  // Give it 5 seconds to exit gracefully, then SIGKILL
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (runtime.exitCode === null) {
        runtime.process.kill("SIGKILL");
      }
      resolve();
    }, 5000);
    runtime.process.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });

  runtimeRegistry.delete(projectId);

  await db
    .update(runtimeEnvironmentsTable)
    .set({ status: "stopped", updatedAt: new Date(), pid: null, port: null })
    .where(eq(runtimeEnvironmentsTable.projectId, projectId));
}

export async function getRuntimeStatus(projectId: number): Promise<{
  status: "running" | "stopped" | "failed" | "unknown";
  pid?: number;
  port?: number;
  previewUrl?: string;
  recentLogs: string[];
}> {
  const runtime = runtimeRegistry.get(projectId);
  if (!runtime) {
    return { status: "unknown", recentLogs: [] };
  }
  if (runtime.exitCode !== null) {
    return {
      status: runtime.exitCode === 0 ? "stopped" : "failed",
      recentLogs: [...runtime.stderr.slice(-20), ...runtime.stdout.slice(-20)],
    };
  }
  return {
    status: "running",
    pid: runtime.pid,
    port: runtime.port,
    previewUrl: runtime.previewUrl,
    recentLogs: runtime.stdout.slice(-50),
  };
}

export function getRuntimeLogs(
  projectId: number,
  maxLines = 100,
): { stdout: string[]; stderr: string[] } {
  const runtime = runtimeRegistry.get(projectId);
  if (!runtime) return { stdout: [], stderr: [] };
  return {
    stdout: runtime.stdout.slice(-maxLines),
    stderr: runtime.stderr.slice(-Math.floor(maxLines / 2)),
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function upsertRuntimeRecord(
  projectId: number,
  data: {
    status: string;
    port: number;
    pid: number;
    previewUrl: string;
    workspacePath: string;
  },
): Promise<void> {
  const existing = await db
    .select({ id: runtimeEnvironmentsTable.id })
    .from(runtimeEnvironmentsTable)
    .where(eq(runtimeEnvironmentsTable.projectId, projectId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(runtimeEnvironmentsTable)
      .set({
        status: data.status,
        port: data.port,
        pid: data.pid,
        previewUrl: data.previewUrl,
        workspacePath: data.workspacePath,
        updatedAt: new Date(),
        lastActiveAt: new Date(),
      })
      .where(eq(runtimeEnvironmentsTable.projectId, projectId));
  } else {
    await db.insert(runtimeEnvironmentsTable).values({
      projectId,
      status: data.status,
      port: data.port,
      pid: data.pid,
      previewUrl: data.previewUrl,
      workspacePath: data.workspacePath,
    });
  }
}

function buildPreviewUrl(port: number): string {
  if (REPLIT_DEV_DOMAIN && REPLIT_DEV_DOMAIN !== "localhost") {
    return `https://${REPLIT_DEV_DOMAIN}:${port}`;
  }
  return `http://localhost:${port}`;
}
