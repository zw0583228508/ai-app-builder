/**
 * Runtime Registry
 *
 * In-memory map of projectId → running child process info.
 * This is the source of truth for whether a project is actually running
 * (not just what the DB says).
 */

import type { ChildProcess } from "child_process";

export interface RuntimeProcess {
  projectId: number;
  pid: number;
  port: number;
  previewUrl: string;
  workspacePath: string;
  command: string;
  startedAt: Date;
  exitCode: number | null;
  process: ChildProcess;
  stdout: string[];
  stderr: string[];
  logListeners: Array<(line: string, stream: "stdout" | "stderr") => void>;
}

class RuntimeRegistry {
  private processes = new Map<number, RuntimeProcess>();

  get(projectId: number): RuntimeProcess | undefined {
    return this.processes.get(projectId);
  }

  set(projectId: number, runtime: RuntimeProcess): void {
    this.processes.set(projectId, runtime);
  }

  delete(projectId: number): void {
    this.processes.delete(projectId);
  }

  has(projectId: number): boolean {
    return this.processes.has(projectId);
  }

  getAll(): RuntimeProcess[] {
    return [...this.processes.values()];
  }

  count(): number {
    return this.processes.size;
  }

  addLogListener(
    projectId: number,
    listener: (line: string, stream: "stdout" | "stderr") => void,
  ): () => void {
    const runtime = this.processes.get(projectId);
    if (!runtime) return () => {};
    runtime.logListeners.push(listener);
    return () => {
      runtime.logListeners = runtime.logListeners.filter((l) => l !== listener);
    };
  }
}

export const runtimeRegistry = new RuntimeRegistry();
