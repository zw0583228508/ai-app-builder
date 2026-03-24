/**
 * Execution Orchestrator
 *
 * Higher-level stateful execution engine that sits on top of the existing
 * specialist-agent orchestrator. Implements the plan → act → observe → repair
 * feedback loop for true AI-driven project execution.
 *
 * The existing agent_orchestrator is PRESERVED for planning/spec generation.
 * This orchestrator adds action completion on top of that plan.
 *
 * Flow:
 *   analyze state
 *   → choose next structured action
 *   → execute via tool executor
 *   → observe result
 *   → update execution state
 *   → decide next step | retry | repair | finish
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  executeToolAction,
  type ExecutorContext,
} from "../domain/ai-tools/executor.js";
import {
  getWorkspaceInfo,
  ensureWorkspace,
  snapshotWorkspace,
} from "../domain/workspace/workspace-manager.js";
import { formatFileTreeSummary } from "../domain/workspace/file-tree.js";
import { getRuntimeStatus } from "../domain/runtime/runtime-manager.js";
import { AnyToolActionSchema } from "../domain/ai-tools/schemas.js";
import { logger } from "../lib/logger.js";
import type { ToolResult } from "../domain/ai-tools/schemas.js";

// ── Execution State ───────────────────────────────────────────────────────────

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "repairing";

export interface ExecutionStep {
  stepIndex: number;
  action: string;
  input: unknown;
  result: ToolResult | null;
  startedAt: string;
  completedAt: string | null;
  retryCount: number;
  status: "pending" | "running" | "success" | "failed" | "repaired";
}

export interface ExecutionState {
  projectId: number;
  userId?: string;
  goal: string;
  status: ExecutionStatus;
  currentStep: number;
  steps: ExecutionStep[];
  workspacePath: string;
  fileTreeSummary: string;
  lastAction: string | null;
  lastActionResult: ToolResult | null;
  runtimeStatus: "running" | "stopped" | "failed" | "unknown";
  deployStatus: "idle" | "building" | "deployed" | "failed";
  accumulatedErrors: string[];
  totalRetries: number;
  startedAt: string;
  updatedAt: string;
}

// ── Streaming Events ──────────────────────────────────────────────────────────

export type ExecutionEvent =
  | { type: "state_update"; state: Partial<ExecutionState> }
  | { type: "action_start"; action: string; input: unknown; stepIndex: number }
  | { type: "action_result"; result: ToolResult; stepIndex: number }
  | {
      type: "file_changed";
      path: string;
      operation: "created" | "updated" | "deleted";
    }
  | { type: "log"; level: "info" | "warn" | "error"; message: string }
  | { type: "repair_start"; reason: string; attempt: number }
  | { type: "completed"; summary: string; totalSteps: number }
  | { type: "failed"; reason: string; accumulatedErrors: string[] };

// ── Retry Policy ──────────────────────────────────────────────────────────────

const MAX_STEPS = 30;
const MAX_RETRIES_PER_STEP = 2;
const MAX_TOTAL_RETRIES = 10;
const MAX_REPAIR_ATTEMPTS = 3;

// ── Main Execution Function ───────────────────────────────────────────────────

export async function runExecutionOrchestrator(params: {
  projectId: number;
  userId?: string;
  goal: string;
  dnaContext?: string;
  existingPlan?: string;
  onEvent: (event: ExecutionEvent) => void;
}): Promise<ExecutionState> {
  const { projectId, userId, goal, dnaContext, existingPlan, onEvent } = params;

  const workspacePath = await ensureWorkspace(projectId);
  const ctx: ExecutorContext = { projectId, userId };

  const emit = (event: ExecutionEvent) => {
    try {
      onEvent(event);
    } catch {
      /* never crash on event emit */
    }
  };

  // Take a snapshot before starting
  try {
    await snapshotWorkspace(projectId, "before_execution");
  } catch {
    /* non-critical */
  }

  const workspaceInfo = await getWorkspaceInfo(projectId);
  const runtimeStatus = await getRuntimeStatus(projectId);

  const state: ExecutionState = {
    projectId,
    userId,
    goal,
    status: "running",
    currentStep: 0,
    steps: [],
    workspacePath,
    fileTreeSummary: formatFileTreeSummary(workspaceInfo.fileTree),
    lastAction: null,
    lastActionResult: null,
    runtimeStatus: runtimeStatus.status,
    deployStatus: "idle",
    accumulatedErrors: [],
    totalRetries: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  emit({ type: "state_update", state });
  emit({
    type: "log",
    level: "info",
    message: `Starting execution for goal: ${goal}`,
  });

  let repairAttempts = 0;

  while (state.currentStep < MAX_STEPS && state.status === "running") {
    state.updatedAt = new Date().toISOString();

    // Check total retry budget
    if (state.totalRetries >= MAX_TOTAL_RETRIES) {
      state.status = "failed";
      const reason = `Exceeded maximum retry budget (${MAX_TOTAL_RETRIES})`;
      emit({
        type: "failed",
        reason,
        accumulatedErrors: state.accumulatedErrors,
      });
      break;
    }

    let nextAction: unknown;
    try {
      nextAction = await chooseNextAction(state, dnaContext, existingPlan);
    } catch (err) {
      const reason = `Failed to choose next action: ${err instanceof Error ? err.message : String(err)}`;
      state.accumulatedErrors.push(reason);
      emit({ type: "log", level: "error", message: reason });
      state.status = "failed";
      emit({
        type: "failed",
        reason,
        accumulatedErrors: state.accumulatedErrors,
      });
      break;
    }

    // Null action means the AI decided we're done
    if (nextAction === null) {
      state.status = "completed";
      const summary = buildCompletionSummary(state);
      emit({ type: "completed", summary, totalSteps: state.steps.length });
      break;
    }

    // Record the step
    const stepIndex = state.steps.length;
    const actionName = (nextAction as { action?: string })?.action ?? "unknown";
    const actionInput = (nextAction as { input?: unknown })?.input;

    const step: ExecutionStep = {
      stepIndex,
      action: actionName,
      input: actionInput,
      result: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      retryCount: 0,
      status: "running",
    };
    state.steps.push(step);

    emit({
      type: "action_start",
      action: actionName,
      input: actionInput,
      stepIndex,
    });

    // Execute with per-step retry
    let result: ToolResult | null = null;
    while (step.retryCount <= MAX_RETRIES_PER_STEP) {
      result = await executeToolAction(nextAction, ctx);
      step.result = result;
      step.completedAt = new Date().toISOString();

      if (result.ok) {
        step.status = "success";
        break;
      }

      // Decide whether to retry
      const isRetryable = isRetryableError(result.errorType);
      if (!isRetryable || step.retryCount >= MAX_RETRIES_PER_STEP) {
        step.status = "failed";
        break;
      }

      step.retryCount++;
      state.totalRetries++;
      emit({
        type: "log",
        level: "warn",
        message: `Step ${stepIndex} failed (${result.error}), retrying (${step.retryCount}/${MAX_RETRIES_PER_STEP})...`,
      });
      await sleep(500 * step.retryCount);
    }

    emit({ type: "action_result", result: result!, stepIndex });

    // Update file-changed events
    if (result?.ok) {
      emitFileEvent(actionName, result, emit);
    }

    state.lastAction = actionName;
    state.lastActionResult = result;

    if (!result?.ok) {
      state.accumulatedErrors.push(
        `Step ${stepIndex} (${actionName}): ${result?.error ?? "unknown error"}`,
      );

      // Attempt repair
      if (repairAttempts < MAX_REPAIR_ATTEMPTS) {
        repairAttempts++;
        state.status = "repairing";
        emit({
          type: "repair_start",
          reason: result?.error ?? "unknown error",
          attempt: repairAttempts,
        });

        const repaired = await attemptRepair(state, result!, ctx, emit);
        state.status = "running";

        if (!repaired) {
          emit({
            type: "log",
            level: "error",
            message: `Repair failed after ${repairAttempts} attempts. Stopping.`,
          });
          state.status = "failed";
          emit({
            type: "failed",
            reason: `Could not repair step ${stepIndex}: ${result?.error}`,
            accumulatedErrors: state.accumulatedErrors,
          });
          break;
        }
        step.status = "repaired";
      } else {
        state.status = "failed";
        emit({
          type: "failed",
          reason: `Exceeded repair attempts for step ${stepIndex}`,
          accumulatedErrors: state.accumulatedErrors,
        });
        break;
      }
    }

    state.currentStep = state.steps.length;

    // Refresh file tree summary periodically
    if (state.currentStep % 5 === 0) {
      const updatedInfo = await getWorkspaceInfo(projectId);
      state.fileTreeSummary = formatFileTreeSummary(updatedInfo.fileTree);
    }

    // Refresh runtime status
    const updatedRuntime = await getRuntimeStatus(projectId);
    state.runtimeStatus = updatedRuntime.status;
  }

  if (state.status === "running") {
    state.status = "failed";
    const reason = `Execution exceeded maximum steps (${MAX_STEPS})`;
    emit({
      type: "failed",
      reason,
      accumulatedErrors: state.accumulatedErrors,
    });
  }

  state.updatedAt = new Date().toISOString();
  logger.info(
    {
      projectId,
      status: state.status,
      steps: state.steps.length,
      retries: state.totalRetries,
    },
    "execution orchestrator finished",
  );

  return state;
}

// ── AI Decision Making ────────────────────────────────────────────────────────

async function chooseNextAction(
  state: ExecutionState,
  dnaContext?: string,
  existingPlan?: string,
): Promise<unknown | null> {
  const systemPrompt = buildSystemPrompt();
  const userMessage = buildStateMessage(state, dnaContext, existingPlan);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Check for completion signal
  if (
    text.includes('"action": "done"') ||
    text.includes('"done"') ||
    text.trim().toLowerCase().startsWith("done")
  ) {
    return null;
  }

  // Extract JSON action from response
  const jsonMatch =
    text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ??
    text.match(/(\{[\s\S]*?"action"\s*:\s*"[^"]+[\s\S]*?\})/);

  if (!jsonMatch) {
    logger.warn(
      { text: text.slice(0, 500) },
      "execution-orchestrator: could not extract action JSON",
    );
    throw new Error("Model did not return a valid action JSON");
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    const validated = AnyToolActionSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`Invalid action schema: ${validated.error.message}`);
    }
    return validated.data;
  } catch (err) {
    throw new Error(
      `Failed to parse action: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function attemptRepair(
  state: ExecutionState,
  failedResult: ToolResult,
  ctx: ExecutorContext,
  emit: (event: ExecutionEvent) => void,
): Promise<boolean> {
  const systemPrompt = buildRepairSystemPrompt();
  const userMessage = buildRepairMessage(state, failedResult);

  let repairAction: unknown;
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonMatch =
      text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ??
      text.match(/(\{[\s\S]*?"action"\s*:\s*"[^"]+[\s\S]*?\})/);

    if (!jsonMatch) return false;
    repairAction = JSON.parse(jsonMatch[1]);
  } catch {
    return false;
  }

  const repairResult = await executeToolAction(repairAction, ctx);
  emit({
    type: "action_result",
    result: repairResult,
    stepIndex: state.steps.length,
  });

  if (repairResult.ok) {
    emit({ type: "log", level: "info", message: "Repair action succeeded" });
    return true;
  }

  return false;
}

// ── Prompt Builders ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an AI execution engine for a code builder platform.
Your job is to decide ONE action to take next to achieve a user's goal.

Available actions (return EXACTLY one as JSON):
- create_file: { action: "create_file", input: { path, content, overwrite? } }
- update_file: { action: "update_file", input: { path, content } }
- read_file: { action: "read_file", input: { path } }
- delete_file: { action: "delete_file", input: { path } }
- list_files: { action: "list_files", input: { directory?, recursive? } }
- ensure_directory: { action: "ensure_directory", input: { path } }
- install_dependencies: { action: "install_dependencies", input: { packages: string[], dev?, packageManager? } }
- run_command: { action: "run_command", input: { command, args?, timeoutMs? } }
- start_runtime: { action: "start_runtime", input: { command, args?, port?, env? } }
- stop_runtime: { action: "stop_runtime", input: {} }
- get_project_state: { action: "get_project_state", input: {} }

When the goal is complete, respond with: { "action": "done" }

Rules:
1. Return ONE action wrapped in \`\`\`json ... \`\`\`
2. Never invent actions outside the list above
3. Prefer small incremental steps
4. If you're unsure about state, use get_project_state or list_files first
5. Write complete, working file contents — never placeholders`;
}

function buildRepairSystemPrompt(): string {
  return `You are an AI repair engine. A tool action failed. Choose ONE corrective action.
Return the action as \`\`\`json { "action": "...", "input": {...} } \`\`\`
If the failure cannot be repaired, return { "action": "done" }.`;
}

function buildStateMessage(
  state: ExecutionState,
  dnaContext?: string,
  existingPlan?: string,
): string {
  const lastSteps = state.steps
    .slice(-5)
    .map(
      (s) =>
        `  ${s.stepIndex}. ${s.action} → ${s.result?.ok ? "✓" : `✗ ${!s.result?.ok ? (s.result as { error: string }).error : ""}`}`,
    )
    .join("\n");

  return `GOAL: ${state.goal}

WORKSPACE FILES:
${state.fileTreeSummary || "(empty workspace)"}

RUNTIME STATUS: ${state.runtimeStatus}

RECENT STEPS:
${lastSteps || "(none yet)"}

LAST ACTION: ${state.lastAction ?? "none"}
LAST RESULT: ${state.lastActionResult ? (state.lastActionResult.ok ? "SUCCESS" : `FAILED: ${(state.lastActionResult as { error: string }).error}`) : "none"}

ERRORS SO FAR: ${state.accumulatedErrors.length === 0 ? "none" : state.accumulatedErrors.slice(-3).join("; ")}
${dnaContext ? `\nPROJECT DNA: ${dnaContext}` : ""}
${existingPlan ? `\nEXISTING PLAN:\n${existingPlan}` : ""}

What is the NEXT single action to take? Return ONLY valid JSON.`;
}

function buildRepairMessage(
  state: ExecutionState,
  failedResult: ToolResult,
): string {
  const err = failedResult as { error: string; errorType: string };
  return `GOAL: ${state.goal}

FAILED ACTION: ${failedResult.action}
ERROR TYPE: ${err.errorType}
ERROR: ${err.error}

RECENT WORKSPACE:
${state.fileTreeSummary || "(empty)"}

Choose a single corrective action:`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRetryableError(errorType: string | undefined): boolean {
  return errorType === "runtime_error" || errorType === "workspace_error";
}

function emitFileEvent(
  action: string,
  result: ToolResult,
  emit: (e: ExecutionEvent) => void,
): void {
  if (!result.ok) return;
  const data = result.data as { path?: string };
  if (!data?.path) return;

  if (action === "create_file") {
    emit({ type: "file_changed", path: data.path, operation: "created" });
  } else if (action === "update_file") {
    emit({ type: "file_changed", path: data.path, operation: "updated" });
  } else if (action === "delete_file") {
    emit({ type: "file_changed", path: data.path, operation: "deleted" });
  }
}

function buildCompletionSummary(state: ExecutionState): string {
  const successSteps = state.steps.filter(
    (s) => s.status === "success" || s.status === "repaired",
  ).length;
  return `Goal achieved in ${state.steps.length} steps (${successSteps} successful, ${state.totalRetries} retries)`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
