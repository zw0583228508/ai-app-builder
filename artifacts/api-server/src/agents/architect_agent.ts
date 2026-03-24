/**
 * Architect Agent
 *
 * A dedicated system-architect that analyses user requirements and produces
 * a comprehensive technical blueprint BEFORE code generation begins.
 *
 * Unlike the lightweight Haiku-based agents in services/ai/agents.ts,
 * this agent uses Claude Sonnet for deeper reasoning and returns a rich,
 * fully-typed ArchitecturePlan that downstream agents can build on.
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "../lib/logger";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  hosting: string;
  auth: string;
  payments?: string;
  realtime?: string;
}

export interface DataModel {
  entity: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  relationships: string[];
}

export interface ApiContract {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
  requestBody?: string;
  responseShape?: string;
}

export interface FolderStructure {
  path: string;
  type: "file" | "directory";
  purpose: string;
}

export interface ArchitecturePlan {
  summary: string;
  techStack: TechStack;
  dataModels: DataModel[];
  apiContracts: ApiContract[];
  folderStructure: FolderStructure[];
  keyComponents: string[];
  integrations: string[];
  securityConsiderations: string[];
  performancePatterns: string[];
  implementationOrder: string[];
  estimatedComplexity: "simple" | "medium" | "complex" | "enterprise";
  reasoning: string;
}

export interface ArchitectAgentInput {
  userRequest: string;
  stack: string;
  projectType?: string | null;
  dnaContext?: string;
  userDnaContext?: string;
  existingCodeSummary?: string;
}

// ─────────────────────────────────────────────────────────────
// Architect Agent
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a world-class Software Architect AI agent.

Your responsibility is to analyse a user's product idea and produce a comprehensive
technical blueprint that all other agents (Frontend, Backend, DevOps, QA) will use
as their source of truth.

Return ONLY valid JSON that conforms exactly to the schema provided. No markdown fences.
No extra keys. No comments. Ensure the JSON is complete and parseable.`;

function buildUserMessage(input: ArchitectAgentInput): string {
  const parts: string[] = [
    `USER REQUEST:\n"${input.userRequest}"`,
    `TECH STACK: ${input.stack}`,
  ];
  if (input.projectType) parts.push(`PROJECT TYPE: ${input.projectType}`);
  if (input.dnaContext)
    parts.push(`PROJECT CONTEXT (DNA):\n${input.dnaContext}`);
  if (input.userDnaContext)
    parts.push(`USER PREFERENCES:\n${input.userDnaContext}`);
  if (input.existingCodeSummary)
    parts.push(`EXISTING CODE SUMMARY:\n${input.existingCodeSummary}`);

  parts.push(`
Produce a ArchitecturePlan JSON with this exact schema:
{
  "summary": "One paragraph describing what will be built",
  "techStack": {
    "frontend": "e.g. Vanilla HTML/CSS/JS with Alpine.js",
    "backend": "e.g. None (static) | Express.js | FastAPI",
    "database": "e.g. None | PostgreSQL | SQLite",
    "hosting": "e.g. Netlify | Vercel | Railway",
    "auth": "e.g. None | JWT | Clerk | Supabase Auth",
    "payments": "e.g. None | Stripe",
    "realtime": "e.g. None | Socket.io | Supabase Realtime"
  },
  "dataModels": [
    {
      "entity": "User",
      "fields": [
        { "name": "id", "type": "uuid", "required": true, "description": "Primary key" }
      ],
      "relationships": ["has many Orders"]
    }
  ],
  "apiContracts": [
    {
      "method": "POST",
      "path": "/api/auth/login",
      "description": "Authenticate user",
      "auth": false,
      "requestBody": "{ email, password }",
      "responseShape": "{ token, user }"
    }
  ],
  "folderStructure": [
    { "path": "src/components", "type": "directory", "purpose": "Reusable UI components" },
    { "path": "src/App.js", "type": "file", "purpose": "Root component" }
  ],
  "keyComponents": ["Navbar", "HeroSection", "PricingCard", "Footer"],
  "integrations": ["Stripe.js CDN", "Google Fonts"],
  "securityConsiderations": ["Sanitize form inputs", "Add CSP headers"],
  "performancePatterns": ["Lazy-load images", "Inline critical CSS"],
  "implementationOrder": [
    "1. Set up HTML skeleton and CSS variables",
    "2. Implement Navbar and routing",
    "3. Build core feature sections"
  ],
  "estimatedComplexity": "medium",
  "reasoning": "One sentence on why this approach was chosen"
}`);

  return parts.join("\n\n");
}

const EMPTY_PLAN: ArchitecturePlan = {
  summary: "",
  techStack: {
    frontend: "HTML/CSS/JS",
    backend: "None",
    database: "None",
    hosting: "Netlify",
    auth: "None",
  },
  dataModels: [],
  apiContracts: [],
  folderStructure: [],
  keyComponents: [],
  integrations: [],
  securityConsiderations: [],
  performancePatterns: [],
  implementationOrder: [],
  estimatedComplexity: "simple",
  reasoning: "",
};

/**
 * Run the Architect Agent.
 *
 * Uses Claude Sonnet for richer technical reasoning than the lightweight
 * Haiku agents. Falls back gracefully on any parse failure.
 */
export async function runArchitectAgent(
  input: ArchitectAgentInput,
): Promise<ArchitecturePlan> {
  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });

    const responseText =
      res.content[0].type === "text" ? res.content[0].text : "{}";
    const match = responseText.match(/\{[\s\S]*\}/);
    if (!match) return EMPTY_PLAN;

    const raw = JSON.parse(match[0]) as Record<string, unknown>;

    // Validate required fields — log a warning instead of silently degrading (Fix 6)
    const hasSummary =
      typeof raw["summary"] === "string" && raw["summary"].length > 0;
    const hasTechStack =
      raw["techStack"] !== null &&
      typeof raw["techStack"] === "object" &&
      !Array.isArray(raw["techStack"]);

    if (!hasSummary || !hasTechStack) {
      logger.warn(
        {
          hasSummary,
          hasTechStack,
          userRequest: input.userRequest.slice(0, 120),
        },
        "Architect agent returned incomplete schema — using EMPTY_PLAN fallback",
      );
      return EMPTY_PLAN;
    }

    const parsed = raw as Partial<ArchitecturePlan>;
    return {
      ...EMPTY_PLAN,
      ...parsed,
      techStack: { ...EMPTY_PLAN.techStack, ...(parsed.techStack ?? {}) },
    };
  } catch {
    return EMPTY_PLAN;
  }
}

/**
 * Format an ArchitecturePlan as a rich context string for downstream agents.
 */
export function formatArchitecturePlan(plan: ArchitecturePlan): string {
  const lines: string[] = [
    "╔══════════════════════════════════════════════════════════════╗",
    "║           🏛️  ARCHITECT AGENT — SYSTEM BLUEPRINT            ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `📋 SUMMARY\n${plan.summary}`,
    "",
    "🔧 TECH STACK",
    `  Frontend : ${plan.techStack.frontend}`,
    `  Backend  : ${plan.techStack.backend}`,
    `  Database : ${plan.techStack.database}`,
    `  Hosting  : ${plan.techStack.hosting}`,
    `  Auth     : ${plan.techStack.auth}`,
    ...(plan.techStack.payments
      ? [`  Payments : ${plan.techStack.payments}`]
      : []),
    ...(plan.techStack.realtime
      ? [`  Realtime : ${plan.techStack.realtime}`]
      : []),
    "",
  ];

  if (plan.keyComponents.length) {
    lines.push(
      `🧩 KEY COMPONENTS\n${plan.keyComponents.map((c) => `  • ${c}`).join("\n")}`,
      "",
    );
  }

  if (plan.dataModels.length) {
    lines.push("🗄️  DATA MODELS");
    for (const m of plan.dataModels) {
      lines.push(`  ${m.entity}: ${m.fields.map((f) => f.name).join(", ")}`);
      if (m.relationships.length)
        lines.push(`    ↳ ${m.relationships.join(" | ")}`);
    }
    lines.push("");
  }

  if (plan.apiContracts.length) {
    lines.push("🔌 API CONTRACTS");
    for (const api of plan.apiContracts.slice(0, 8)) {
      lines.push(`  ${api.method} ${api.path} — ${api.description}`);
    }
    lines.push("");
  }

  if (plan.securityConsiderations.length) {
    lines.push(
      `🔒 SECURITY\n${plan.securityConsiderations.map((s) => `  • ${s}`).join("\n")}`,
      "",
    );
  }

  if (plan.performancePatterns.length) {
    lines.push(
      `⚡ PERFORMANCE\n${plan.performancePatterns.map((p) => `  • ${p}`).join("\n")}`,
      "",
    );
  }

  if (plan.implementationOrder.length) {
    lines.push(
      `📐 IMPLEMENTATION ORDER\n${plan.implementationOrder.map((s) => `  ${s}`).join("\n")}`,
      "",
    );
  }

  lines.push(`💡 REASONING: ${plan.reasoning}`);
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}
