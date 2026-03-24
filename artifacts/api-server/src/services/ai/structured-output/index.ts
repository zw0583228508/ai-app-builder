/**
 * Structured Output Contracts
 *
 * TypeScript interfaces for all structured AI outputs.
 * All JSON responses from AI must be typed here.
 * Validation is done at runtime using type guards.
 */

// ── Project Plan ──────────────────────────────────────────────
export interface ProjectPlan {
  summary: string;
  features: string[];
  screens: string[];
  apis?: string[];
  dbSchema?: string[];
  techStack?: string;
  estimatedComplexity?: "simple" | "medium" | "complex";
}

export function isProjectPlan(v: unknown): v is ProjectPlan {
  return (
    typeof v === "object" &&
    v !== null &&
    "summary" in v &&
    "features" in v &&
    Array.isArray((v as ProjectPlan).features)
  );
}

// ── Code Review ────────────────────────────────────────────────
export interface CodeReviewItem {
  issue: string;
  severity: "error" | "warn" | "info";
  fix: string;
}
export interface CodeReview {
  overall: { score: number; grade: "A" | "B" | "C" | "D" | "F"; summary: string };
  performance: CodeReviewItem[];
  security: CodeReviewItem[];
  accessibility: CodeReviewItem[];
  codeQuality: CodeReviewItem[];
  bestPractices: CodeReviewItem[];
}

// ── Project DNA ────────────────────────────────────────────────
export interface ProjectDNAExtracted {
  purpose?: string;
  audience?: string;
  techDecisions?: Record<string, string>;
  preferences?: Record<string, string>;
  avoidList?: string[];
  qualityNotes?: string;
}

// ── Memory Chunk ───────────────────────────────────────────────
export interface MemoryChunkExtracted {
  summary: string;
  tags: string[];
  importance?: "low" | "medium" | "high";
}

// ── QA Test Plan ────────────────────────────────────────────────
export interface QATest {
  name: string;
  description: string;
  steps: string[];
  expectedResult: string;
  selector?: string;
}
export type QATestPlan = QATest[];

// ── Change Summary ─────────────────────────────────────────────
export interface ChangeSummary {
  summary: string;
  changePercent: number;
  filesChanged?: string[];
  addedLines?: number;
  removedLines?: number;
  keyChanges?: string[];
}

// ── Deployment Brain ────────────────────────────────────────────
export interface DeploymentRecommendation {
  provider: string;
  reason: string;
  estimatedCost?: string;
  tips?: string[];
}
