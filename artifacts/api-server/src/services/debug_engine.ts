/**
 * Debug Engine
 *
 * A formal debugging service that classifies JavaScript/HTML errors,
 * generates targeted AI fix prompts, applies patches, and iterates
 * until the code passes validation or the attempt limit is reached.
 *
 * Used by:
 *   - errors.ts auto-fix route
 *   - agent-run.ts post-build fix loop
 *   - Future: real-time preview error interception
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ErrorCategory =
  | "syntax" // SyntaxError, malformed HTML/JS
  | "reference" // ReferenceError, undefined variable
  | "type" // TypeError, wrong type used
  | "network" // fetch failed, CORS, 404
  | "dom" // Cannot read property of null, missing element
  | "async" // Unhandled promise rejection, async/await issues
  | "style" // CSS parsing error, layout breakage
  | "logic" // Runtime logic error (wrong output, infinite loop)
  | "unknown";

export interface DebugInput {
  errorMessage: string;
  errorStack?: string;
  errorLine?: number;
  sourceCode: string;
  url?: string;
  context?: string;
}

export interface DebugDiagnosis {
  category: ErrorCategory;
  rootCause: string;
  affectedSection: string;
  fixStrategy: string;
  confidence: "high" | "medium" | "low";
}

export interface FixAttempt {
  iteration: number;
  diagnosis: DebugDiagnosis;
  fixedCode: string;
  issuesFound: string[];
  applied: boolean;
  durationMs: number;
}

export interface DebugResult {
  success: boolean;
  fixedCode: string;
  attempts: FixAttempt[];
  finalDiagnosis: DebugDiagnosis | null;
  totalDurationMs: number;
}

// ─────────────────────────────────────────────────────────────
// Error classification
// ─────────────────────────────────────────────────────────────

const ERROR_PATTERNS: Array<{ category: ErrorCategory; patterns: RegExp[] }> = [
  {
    category: "syntax",
    patterns: [
      /SyntaxError/i,
      /Unexpected token/i,
      /Unexpected end of/i,
      /unterminated/i,
    ],
  },
  {
    category: "reference",
    patterns: [
      /ReferenceError/i,
      /is not defined/i,
      /Cannot access.*before initialization/i,
    ],
  },
  {
    category: "type",
    patterns: [
      /TypeError/i,
      /is not a function/i,
      /Cannot read prop/i,
      /Cannot set prop/i,
      /null is not/i,
    ],
  },
  {
    category: "network",
    patterns: [
      /Failed to fetch/i,
      /NetworkError/i,
      /CORS/i,
      /net::ERR/i,
      /404/i,
      /500/i,
    ],
  },
  {
    category: "dom",
    patterns: [
      /Cannot read properties of null/i,
      /querySelector.*null/i,
      /getElementById.*null/i,
    ],
  },
  {
    category: "async",
    patterns: [
      /UnhandledPromiseRejection/i,
      /await.*outside async/i,
      /Promise.*rejected/i,
    ],
  },
  {
    category: "style",
    patterns: [/CSS.*invalid/i, /parse error/i, /Unknown property/i],
  },
];

export function classifyError(
  errorMessage: string,
  stack?: string,
): ErrorCategory {
  const combined = `${errorMessage} ${stack ?? ""}`;
  for (const { category, patterns } of ERROR_PATTERNS) {
    if (patterns.some((p) => p.test(combined))) return category;
  }
  return "unknown";
}

// ─────────────────────────────────────────────────────────────
// Diagnosis
// ─────────────────────────────────────────────────────────────

const DIAGNOSIS_SYSTEM = `You are an expert JavaScript/HTML debugger AI.
Analyze the error and source code, then return ONLY valid JSON (no markdown):
{
  "category": "syntax|reference|type|network|dom|async|style|logic|unknown",
  "rootCause": "Short, specific description of the root cause",
  "affectedSection": "Function name, line range, or component name",
  "fixStrategy": "Concrete step-by-step fix approach",
  "confidence": "high|medium|low"
}`;

export async function diagnoseError(
  input: DebugInput,
): Promise<DebugDiagnosis> {
  const category = classifyError(input.errorMessage, input.errorStack);

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: DIAGNOSIS_SYSTEM,
      messages: [
        {
          role: "user",
          content: `ERROR: ${input.errorMessage}
${input.errorStack ? `STACK:\n${input.errorStack.slice(0, 800)}` : ""}
${input.errorLine ? `LINE: ${input.errorLine}` : ""}
${input.context ? `CONTEXT: ${input.context}` : ""}

SOURCE CODE (first 3000 chars):
${input.sourceCode.slice(0, 3000)}`,
        },
      ],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Partial<DebugDiagnosis>;
      return {
        category: (parsed.category as ErrorCategory) ?? category,
        rootCause: parsed.rootCause ?? input.errorMessage,
        affectedSection: parsed.affectedSection ?? "unknown",
        fixStrategy: parsed.fixStrategy ?? "Review and fix the reported error",
        confidence: parsed.confidence ?? "low",
      };
    }
  } catch {}

  return {
    category,
    rootCause: input.errorMessage,
    affectedSection: "unknown",
    fixStrategy: "Review and fix the reported error",
    confidence: "low",
  };
}

// ─────────────────────────────────────────────────────────────
// Code fixer
// ─────────────────────────────────────────────────────────────

function buildFixSystemPrompt(category: ErrorCategory): string {
  const categoryInstructions: Partial<Record<ErrorCategory, string>> = {
    syntax:
      "Focus on fixing syntax errors — missing brackets, semicolons, unclosed tags.",
    reference:
      "Ensure all variables are declared before use. Check for typos in names.",
    type: "Check null/undefined safety. Add optional chaining (?.) and nullish coalescing (??).",
    network:
      "Add proper error handling for fetch calls. Handle CORS issues. Add fallback UI.",
    dom: "Check that DOM elements exist before accessing. Use optional chaining. Add null guards.",
    async:
      "Ensure async/await is used correctly. Add .catch() handlers. Avoid race conditions.",
    style:
      "Fix invalid CSS properties. Ensure proper units. Fix media query syntax.",
    logic:
      "Fix the logical error in the implementation. Trace the data flow carefully.",
  };

  return `You are an expert code fixer AI. Your job is to fix buggy HTML/CSS/JavaScript code.

${categoryInstructions[category] ?? "Carefully analyze and fix the reported error."}

Rules:
- Return the COMPLETE fixed HTML file — never partial code
- Wrap it in a single \`\`\`html ... \`\`\` block
- Preserve ALL existing functionality and design
- Do not add placeholder comments or TODOs
- Make the minimal change needed to fix the error
- Verify your fix doesn't introduce new bugs`;
}

const FIX_VALIDATION_SYSTEM = `You are a code quality AI. Review the fixed code for issues.
Return ONLY valid JSON (no markdown):
{
  "hasIssues": boolean,
  "issues": ["description of each issue found"],
  "isProductionReady": boolean
}`;

// ─────────────────────────────────────────────────────────────
// Debug Engine class
// ─────────────────────────────────────────────────────────────

/**
 * DebugEngine runs the fix → validate → iterate loop.
 *
 * @example
 * const engine = new DebugEngine({ maxAttempts: 3 });
 * const result = await engine.fix({ errorMessage, sourceCode });
 */
export class DebugEngine {
  private readonly maxAttempts: number;

  constructor(options: { maxAttempts?: number } = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
  }

  async fix(input: DebugInput): Promise<DebugResult> {
    const t0 = Date.now();
    const attempts: FixAttempt[] = [];
    let currentCode = input.sourceCode;
    let success = false;
    let finalDiagnosis: DebugDiagnosis | null = null;

    for (let i = 1; i <= this.maxAttempts; i++) {
      const attemptT0 = Date.now();

      const diagnosis = await diagnoseError({
        ...input,
        sourceCode: currentCode,
      });
      finalDiagnosis = diagnosis;

      let fixedCode = currentCode;
      let issuesFound: string[] = [];

      try {
        const fixRes = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8000,
          system: buildFixSystemPrompt(diagnosis.category),
          messages: [
            {
              role: "user",
              content: `ROOT CAUSE: ${diagnosis.rootCause}
FIX STRATEGY: ${diagnosis.fixStrategy}
AFFECTED: ${diagnosis.affectedSection}

BUGGY CODE:
\`\`\`html
${currentCode}
\`\`\`

Fix this code. Return the complete fixed HTML.`,
            },
          ],
        });

        const fixText =
          fixRes.content[0].type === "text" ? fixRes.content[0].text : "";
        const htmlMatch = fixText.match(/```html\n([\s\S]*?)\n```/);
        if (htmlMatch) {
          fixedCode = htmlMatch[1];
        }

        const validRes = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: FIX_VALIDATION_SYSTEM,
          messages: [
            {
              role: "user",
              content: `Original error: ${input.errorMessage}\n\nFixed code (first 2000 chars):\n${fixedCode.slice(0, 2000)}`,
            },
          ],
        });

        const validText =
          validRes.content[0].type === "text" ? validRes.content[0].text : "{}";
        const validMatch = validText.match(/\{[\s\S]*\}/);
        if (validMatch) {
          const validation = JSON.parse(validMatch[0]) as {
            hasIssues: boolean;
            issues: string[];
            isProductionReady: boolean;
          };
          issuesFound = validation.issues ?? [];
          if (!validation.hasIssues || validation.isProductionReady) {
            currentCode = fixedCode;
            success = true;
          } else {
            currentCode = fixedCode;
          }
        } else {
          currentCode = fixedCode;
          success = true;
        }
      } catch {
        issuesFound = ["Fix attempt failed — retrying"];
      }

      attempts.push({
        iteration: i,
        diagnosis,
        fixedCode,
        issuesFound,
        applied: true,
        durationMs: Date.now() - attemptT0,
      });

      if (success) break;
    }

    return {
      success,
      fixedCode: currentCode,
      attempts,
      finalDiagnosis,
      totalDurationMs: Date.now() - t0,
    };
  }

  /**
   * Quick single-shot fix without the validation loop.
   * Useful for fast interactive fixing in the preview pane.
   */
  async quickFix(
    input: Pick<DebugInput, "errorMessage" | "sourceCode">,
  ): Promise<string> {
    const category = classifyError(input.errorMessage);

    try {
      const res = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        system: buildFixSystemPrompt(category),
        messages: [
          {
            role: "user",
            content: `ERROR: ${input.errorMessage}\n\nFIX THIS CODE:\n\`\`\`html\n${input.sourceCode}\n\`\`\``,
          },
        ],
      });
      const text = res.content[0].type === "text" ? res.content[0].text : "";
      const match = text.match(/```html\n([\s\S]*?)\n```/);
      return match ? match[1] : input.sourceCode;
    } catch {
      return input.sourceCode;
    }
  }
}

export const debugEngine = new DebugEngine({ maxAttempts: 3 });
