/**
 * Multi-Agent Pipeline + Design Brain
 *
 * Extracted from messages.ts to keep the main send handler focused.
 * Runs the 4-agent sequential/parallel pipeline (Architecture → UI + Security + Performance)
 * and the Design Brain in parallel, then returns the combined context strings.
 */

import { eq } from "drizzle-orm";
import { db, projectDnaTable } from "@workspace/db";
import {
  runArchitectureAgent,
  runUiAgent,
  runSecurityAgent,
  runPerformanceAgent,
  buildAgentContext,
} from "../../../services/ai/agents";
import type { AgentAnalysis } from "../../../services/ai/agents";
import {
  buildDesignBrief,
  formatDesignBriefForPrompt,
  DEFAULT_DESIGN_BRIEF,
} from "../../../services/ai/design-brain";
import type { DesignBrief } from "../../../services/ai/design-brain";
import type { DetectedIntent } from "../../../services/ai/intent";

export interface AgentPipelineOptions {
  content: string;
  stack: string;
  currentMode: string;
  detectedIntent: DetectedIntent;
  isFirstMessage: boolean;
  isPlanningAnswerMessage: boolean;
  isAfterSpecPhase: boolean;
  existingMessages: Array<{ role: string; content: string }>;
  agentFlow: boolean;
  projectId: number;
  projectDna: Record<string, unknown> | null;
  sendEvent: (data: object) => void;
}

export interface AgentPipelineResult {
  agentContext: string;
  designBriefBlock: string;
}

/**
 * Runs the Design Brain + optional 4-agent pipeline in parallel.
 * Returns the concatenated prompt context strings for the main LLM call.
 */
export async function runAgentAndDesignBrain(
  opts: AgentPipelineOptions,
): Promise<AgentPipelineResult> {
  const {
    content,
    stack,
    currentMode,
    detectedIntent,
    isFirstMessage,
    isPlanningAnswerMessage,
    isAfterSpecPhase,
    existingMessages,
    agentFlow,
    projectId,
    projectDna,
    sendEvent,
  } = opts;

  const isCreateIntent = detectedIntent.intent === "create";

  // Design Brain runs for all create intents in parallel with the agent pipeline.
  const designBriefPromise = isCreateIntent
    ? buildDesignBrief(content, currentMode, stack).catch(
        () => DEFAULT_DESIGN_BRIEF,
      )
    : Promise.resolve(null);

  const isComplexRequest =
    isCreateIntent &&
    (isFirstMessage ||
      isPlanningAnswerMessage ||
      (content.length > 350 && content.split(" ").length > 25));

  let agentContext = "";

  if (isComplexRequest && !agentFlow) {
    sendEvent({
      type: "pipeline_start",
      message: "מנתח בקשה עם 4 agents מתמחים...",
    });

    const fullRequestContext = isAfterSpecPhase
      ? `ORIGINAL REQUEST: ${existingMessages[0]?.content ?? ""}

PLANNING Q&A:
${existingMessages[1]?.content ?? ""}

USER ANSWERS:
${existingMessages[2]?.content ?? ""}

CONFIRMED PRODUCT SPEC:
${existingMessages[3]?.content ?? ""}

USER CONFIRMATION: ${content}

Build exactly what the Product Spec says. Follow the design style, pages, and features listed.`
      : isPlanningAnswerMessage
        ? `Initial request: ${existingMessages[0]?.content ?? ""}\n\nClarification answers: ${content}`
        : content;

    // Architecture agent first (others depend on its output)
    const archResult = await runArchitectureAgent(
      fullRequestContext,
      stack,
      currentMode,
    );
    sendEvent({
      type: "pipeline_step",
      step: "architecture",
      data: archResult,
    });

    // UI, Security, Performance in parallel
    const [uiResult, secResult, perfResult] = await Promise.all([
      runUiAgent(fullRequestContext, currentMode),
      runSecurityAgent(fullRequestContext),
      runPerformanceAgent(fullRequestContext),
    ]);

    sendEvent({ type: "pipeline_step", step: "ui", data: uiResult });
    sendEvent({ type: "pipeline_step", step: "security", data: secResult });
    sendEvent({ type: "pipeline_step", step: "performance", data: perfResult });

    const fullAnalysis: AgentAnalysis = {
      architecture: archResult,
      ui: uiResult,
      security: secResult,
      performance: perfResult,
    };
    agentContext = buildAgentContext(fullAnalysis);

    // Save decision log to project_dna (fire-and-forget)
    const decisionEntry = {
      timestamp: new Date().toISOString(),
      userMessage: content.slice(0, 200),
      architecture: archResult.reasoning,
      design: uiResult.designNotes,
      security: secResult.mitigations.slice(0, 2),
      performance: perfResult.patterns.slice(0, 2),
    };
    const existingLog = (projectDna?.decisionLog as unknown[]) ?? [];
    db.update(projectDnaTable)
      .set({
        decisionLog: [...existingLog, decisionEntry].slice(
          -20,
        ) as unknown as Record<string, unknown>[],
        updatedAt: new Date(),
      })
      .where(eq(projectDnaTable.projectId, projectId))
      .catch(() => {});

    sendEvent({
      type: "pipeline_done",
      message: "ניתוח הושלם — בונה עכשיו...",
    });
  }

  const designBrief = await designBriefPromise;
  const designBriefBlock = designBrief
    ? formatDesignBriefForPrompt(designBrief as DesignBrief)
    : "";

  return { agentContext, designBriefBlock };
}
