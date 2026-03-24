/**
 * Agent Orchestrator
 *
 * Coordinates a sequential multi-agent pipeline where each agent receives
 * ALL previous agents' outputs as context before producing its own.
 *
 * Pipeline:
 *   1. Architect   → system design, tech stack, data models, API contracts
 *   2. Frontend    → UI/UX plan, component breakdown, design system
 *   3. Backend     → API implementation plan, DB queries, auth flow
 *   4. DevOps      → deployment config, environment variables, CI/CD
 *   5. QA          → test plan, edge cases, accessibility checks
 *
 * Each agent emits a status event so callers can stream progress to the UI.
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  runArchitectAgent,
  formatArchitecturePlan,
  type ArchitecturePlan,
  type ArchitectAgentInput,
} from "./architect_agent";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type OrchestratorAgentId =
  | "architect"
  | "frontend"
  | "backend"
  | "devops"
  | "qa";

export interface AgentOutput {
  agentId: OrchestratorAgentId;
  agentName: string;
  emoji: string;
  summary: string;
  details: Record<string, unknown>;
  contextForNext: string;
  durationMs: number;
}

export interface OrchestratorResult {
  userRequest: string;
  stack: string;
  architecturePlan: ArchitecturePlan;
  agentOutputs: AgentOutput[];
  unifiedBuildDirective: string;
  totalDurationMs: number;
}

export type OrchestratorStatus =
  | { phase: "starting" }
  | {
      phase: "agent_start";
      agentId: OrchestratorAgentId;
      agentName: string;
      emoji: string;
    }
  | {
      phase: "agent_done";
      agentId: OrchestratorAgentId;
      agentName: string;
      emoji: string;
      durationMs: number;
      summary: string;
    }
  | { phase: "done"; result: OrchestratorResult }
  | { phase: "error"; agentId?: OrchestratorAgentId; message: string };

export type StatusCallback = (status: OrchestratorStatus) => void;

export interface OrchestratorInput extends ArchitectAgentInput {
  onStatus?: StatusCallback;
}

// ─────────────────────────────────────────────────────────────
// Per-agent prompts (each receives accumulated context)
// ─────────────────────────────────────────────────────────────

const FRONTEND_SYSTEM = `You are an expert Frontend Developer AI agent.
You receive an architect's blueprint and produce a detailed UI/UX implementation plan.

Return ONLY valid JSON (no markdown fences):
{
  "summary": "One paragraph on the UI approach",
  "designSystem": {
    "colorPalette": ["#hex primary", "#hex secondary", "#hex accent"],
    "typography": "Font family + scale",
    "layoutPattern": "bento|sidebar|centered|full-width",
    "animationStyle": "minimal|smooth|rich",
    "darkMode": true
  },
  "componentPlan": [
    { "name": "ComponentName", "purpose": "What it does", "props": ["prop1", "prop2"], "state": ["state1"] }
  ],
  "screenFlow": ["Screen1 → Screen2 → Screen3"],
  "accessibilityNotes": ["ARIA labels on all interactive elements"],
  "mobileBreakpoints": ["375px", "768px", "1280px"],
  "implementationNotes": "Key frontend decisions"
}`;

const BACKEND_SYSTEM = `You are an expert Backend Developer AI agent.
You receive an architect's blueprint and frontend plan, and produce a backend implementation plan.

Return ONLY valid JSON (no markdown fences):
{
  "summary": "One paragraph on the backend approach",
  "apiImplementation": [
    {
      "endpoint": "POST /api/auth/login",
      "handler": "Validate credentials → sign JWT → return token",
      "validation": "Zod schema: { email: z.string().email(), password: z.string().min(8) }",
      "errorCases": ["401 invalid credentials", "429 rate limit"]
    }
  ],
  "databaseQueries": [
    { "name": "getUserByEmail", "sql": "SELECT * FROM users WHERE email = $1", "index": "CREATE INDEX ON users(email)" }
  ],
  "authFlow": "JWT | Session | None — description of implementation",
  "middlewares": ["rateLimiter", "authGuard", "requestLogger"],
  "environmentVariables": ["DATABASE_URL", "JWT_SECRET"],
  "implementationNotes": "Key backend decisions"
}`;

const DEVOPS_SYSTEM = `You are an expert DevOps AI agent.
You receive the full system blueprint and produce a deployment and infrastructure plan.

Return ONLY valid JSON (no markdown fences):
{
  "summary": "One paragraph on the deployment approach",
  "deploymentTarget": "Netlify | Vercel | Railway | Docker",
  "buildConfig": {
    "buildCommand": "npm run build",
    "outputDir": "dist",
    "nodeVersion": "20"
  },
  "environmentVariables": [
    { "name": "DATABASE_URL", "required": true, "description": "PostgreSQL connection string" }
  ],
  "cicdSteps": ["Install → Lint → Test → Build → Deploy"],
  "healthCheck": "GET /api/health → 200 OK",
  "scalingNotes": "Auto-scaling strategy",
  "costEstimateMonthly": 15,
  "implementationNotes": "Key DevOps decisions"
}`;

const QA_SYSTEM = `You are an expert QA AI agent.
You receive the complete system blueprint and produce a test plan and quality checklist.

Return ONLY valid JSON (no markdown fences):
{
  "summary": "One paragraph on the QA approach",
  "criticalPaths": ["User can register → login → complete core action → logout"],
  "unitTests": [
    { "name": "validateUserEmail", "input": "invalid@", "expected": "ValidationError" }
  ],
  "integrationTests": [
    { "name": "POST /api/auth/login returns JWT on valid credentials", "type": "API" }
  ],
  "e2eScenarios": [
    { "name": "Happy path — new user onboarding", "steps": ["Open app", "Click Sign Up", "Fill form", "Submit"] }
  ],
  "accessibilityChecks": ["Keyboard navigation works", "Screen reader labels present"],
  "performanceChecks": ["LCP < 2.5s", "No render-blocking resources"],
  "edgeCases": ["Empty state", "Network error", "Concurrent requests"],
  "implementationNotes": "Key QA findings"
}`;

// ─────────────────────────────────────────────────────────────
// Agent runner helper
// ─────────────────────────────────────────────────────────────

async function runSpecialistAgent(
  agentId: OrchestratorAgentId,
  agentName: string,
  emoji: string,
  systemPrompt: string,
  userContent: string,
  onStatus: StatusCallback,
): Promise<AgentOutput> {
  const t0 = Date.now();
  onStatus({ phase: "agent_start", agentId, agentName, emoji });

  let details: Record<string, unknown> = {};
  let summary = "";

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        details = JSON.parse(match[0]) as Record<string, unknown>;
        summary = (details["summary"] as string) || "";
      } catch {
        summary = raw.slice(0, 200);
      }
    }
  } catch (e: unknown) {
    summary = e instanceof Error ? e.message : "Agent error";
  }

  const durationMs = Date.now() - t0;
  const output: AgentOutput = {
    agentId,
    agentName,
    emoji,
    summary,
    details,
    contextForNext: JSON.stringify(details, null, 2).slice(0, 2000),
    durationMs,
  };

  onStatus({
    phase: "agent_done",
    agentId,
    agentName,
    emoji,
    durationMs,
    summary,
  });
  return output;
}

// ─────────────────────────────────────────────────────────────
// Build unified directive from all agent outputs
// ─────────────────────────────────────────────────────────────

function buildUnifiedDirective(
  plan: ArchitecturePlan,
  outputs: AgentOutput[],
): string {
  const frontend = outputs.find((o) => o.agentId === "frontend");
  const backend = outputs.find((o) => o.agentId === "backend");
  const devops = outputs.find((o) => o.agentId === "devops");
  const qa = outputs.find((o) => o.agentId === "qa");

  const lines: string[] = [
    "╔══════════════════════════════════════════════════════════════╗",
    "║      🤖 MULTI-AGENT ORCHESTRATOR — UNIFIED BUILD DIRECTIVE  ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `🏛️  ARCHITECT: ${plan.summary}`,
    `  Stack: ${plan.techStack.frontend} | ${plan.techStack.backend} | ${plan.techStack.database}`,
    `  Complexity: ${plan.estimatedComplexity}`,
    "",
  ];

  if (frontend?.summary) {
    lines.push(`🎨 FRONTEND AGENT: ${frontend.summary}`);
    const ds = frontend.details["designSystem"] as
      | Record<string, unknown>
      | undefined;
    if (ds) {
      lines.push(
        `  Layout: ${ds["layoutPattern"]} | Animations: ${ds["animationStyle"]} | Dark mode: ${ds["darkMode"]}`,
      );
    }
    lines.push("");
  }

  if (backend?.summary) {
    lines.push(`⚙️  BACKEND AGENT: ${backend.summary}`);
    const envVars = backend.details["environmentVariables"] as
      | string[]
      | undefined;
    if (envVars?.length) lines.push(`  Env vars needed: ${envVars.join(", ")}`);
    lines.push("");
  }

  if (devops?.summary) {
    lines.push(`🚀 DEVOPS AGENT: ${devops.summary}`);
    lines.push("");
  }

  if (qa?.summary) {
    lines.push(`🔍 QA AGENT: ${qa.summary}`);
    const edges = qa.details["edgeCases"] as string[] | undefined;
    if (edges?.length)
      lines.push(`  Edge cases to handle: ${edges.slice(0, 3).join(", ")}`);
    lines.push("");
  }

  if (plan.securityConsiderations.length) {
    lines.push(`🔒 SECURITY: ${plan.securityConsiderations.join(" | ")}`);
  }
  if (plan.performancePatterns.length) {
    lines.push(`⚡ PERFORMANCE: ${plan.performancePatterns.join(" | ")}`);
  }

  lines.push("═══════════════════════════════════════════════════════════════");
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Main orchestrator entry point
// ─────────────────────────────────────────────────────────────

/**
 * Run the full multi-agent orchestration pipeline.
 *
 * Agents execute sequentially so each can build on the previous agent's output.
 * Progress is reported via the `onStatus` callback (suitable for SSE streaming).
 */
export async function runOrchestrator(
  input: OrchestratorInput,
): Promise<OrchestratorResult> {
  const t0 = Date.now();
  const { onStatus = () => {} } = input;

  onStatus({ phase: "starting" });

  // ── Phase 1: Architect ─────────────────────────────────────
  onStatus({
    phase: "agent_start",
    agentId: "architect",
    agentName: "ארכיטקט",
    emoji: "🏛️",
  });
  const archT0 = Date.now();
  const architecturePlan = await runArchitectAgent(input);
  const archDuration = Date.now() - archT0;
  onStatus({
    phase: "agent_done",
    agentId: "architect",
    agentName: "ארכיטקט",
    emoji: "🏛️",
    durationMs: archDuration,
    summary: architecturePlan.summary,
  });

  const architectContext = formatArchitecturePlan(architecturePlan);
  const agentOutputs: AgentOutput[] = [];

  // ── Phase 2+3: Frontend & Backend in parallel ──────────────
  // Neither agent depends on the other — both receive only the architect context.
  // This saves ~40% wall-clock time compared to sequential execution.
  const [frontendOutput, backendOutput] = await Promise.all([
    runSpecialistAgent(
      "frontend",
      "מפתח צד לקוח",
      "🎨",
      FRONTEND_SYSTEM,
      `${architectContext}\n\nUSER REQUEST: "${input.userRequest}"\n\nProduce the frontend implementation plan.`,
      onStatus,
    ),
    runSpecialistAgent(
      "backend",
      "מפתח צד שרת",
      "⚙️",
      BACKEND_SYSTEM,
      `${architectContext}\n\nUSER REQUEST: "${input.userRequest}"\n\nProduce the backend implementation plan.`,
      onStatus,
    ),
  ]);
  agentOutputs.push(frontendOutput, backendOutput);

  // ── Phase 4+5: DevOps & QA in parallel ────────────────────
  // Both see the combined frontend + backend context. Neither depends on the other.
  const [devopsOutput, qaOutput] = await Promise.all([
    runSpecialistAgent(
      "devops",
      "תשתיות ופריסה",
      "🚀",
      DEVOPS_SYSTEM,
      `${architectContext}\n\nFRONTEND:\n${frontendOutput.contextForNext}\n\nBACKEND:\n${backendOutput.contextForNext}\n\nUSER REQUEST: "${input.userRequest}"\n\nProduce the deployment plan.`,
      onStatus,
    ),
    runSpecialistAgent(
      "qa",
      "בקרת איכות",
      "🔍",
      QA_SYSTEM,
      `${architectContext}\n\nFRONTEND:\n${frontendOutput.contextForNext}\n\nBACKEND:\n${backendOutput.contextForNext}\n\nUSER REQUEST: "${input.userRequest}"\n\nProduce the QA and test plan.`,
      onStatus,
    ),
  ]);
  agentOutputs.push(devopsOutput, qaOutput);

  // ── Assemble result ────────────────────────────────────────
  const unifiedBuildDirective = buildUnifiedDirective(
    architecturePlan,
    agentOutputs,
  );

  const result: OrchestratorResult = {
    userRequest: input.userRequest,
    stack: input.stack,
    architecturePlan,
    agentOutputs,
    unifiedBuildDirective,
    totalDurationMs: Date.now() - t0,
  };

  onStatus({ phase: "done", result });
  return result;
}
