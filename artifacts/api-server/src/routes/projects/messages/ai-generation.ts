import { createHash } from "node:crypto";
import { eq, desc } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectMessagesTable,
  projectFilesTable,
  projectSnapshotsTable,
  promptCacheTable,
  userDnaTable,
  projectDnaTable,
  qaTestResultsTable,
} from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "../../../lib/logger";
import { autoCdnInject, sanitizeImageUrls } from "../../../services/ai/preview";
import type { DetectedIntent } from "../../../services/ai/intent";
import {
  detectContextualSuggestions,
  detectNextStep,
} from "../../../services/ai/intent";
import { PROMPT_VERSION } from "../../../services/ai/prompts/index";
import { buildSystemPrompt } from "./prompt-builder";
import { getIntegrationCapabilities } from "../../../services/integrations/vault";
import {
  withRetry,
  extractAndSaveDNA,
  extractAndSaveMemoryChunks,
} from "../../../services/memory/project-dna";
import type { MemoryChunk } from "../../../services/memory/project-dna";
import { recordAiCall, startTimer } from "../../../services/telemetry";
import { broadcastProjectUpdate } from "../../collab";
import { invalidateBundleCache } from "../bundle";
import { computeChangeSummary } from "../../../services/ai/change-summary";
import { calculateSkillScore } from "../../../services/ai/agents";
import {
  extractHtml,
  extractReactFiles,
  type ExtractedFile,
} from "../../../services/ai/code-extractor";
import { writeSnapshot, isHtmlUsable } from "./snapshot-writer";

export interface AiGenerationCtx {
  body: {
    content: string;
    attachments?: { name: string }[];
    userLang?: string;
  };
  project: {
    id: number;
    stack?: string | null;
    previewHtml?: string | null;
    githubRepoUrl?: string | null;
    title?: string | null;
    userId?: string | null;
    type?: string | null;
  };
  params: { id: number };
  existingMessages: {
    role: string;
    content: string;
    createdAt?: Date | null;
  }[];
  messageHistory: Parameters<typeof anthropic.messages.stream>[0]["messages"];
  isFirstMessage: boolean;
  currentMode: string;
  detectedIntent: DetectedIntent;
  agentFlow: boolean;
  useAutoFix: boolean;
  agentContext: string;
  designBriefBlock: string;
  userDnaContext: string;
  dnaContext: string;
  memoryChunkContext: string;
  rawChunks: MemoryChunk[];
  projectDna: {
    lastGrowSuggestionAt?: string | Date | null;
    growSuggestionCount?: number | null;
    memoryChunks?: unknown;
  } | null;
  disconnected: { flag: boolean };
  sendEvent: (data: object) => void;
  userId: string | null;
}

/**
 * Build system prompt, run Claude streaming generation, extract code,
 * save to DB, and send the final done SSE event.
 */
export async function runAiGeneration(ctx: AiGenerationCtx): Promise<void> {
  const {
    body,
    project,
    params,
    existingMessages,
    messageHistory,
    isFirstMessage,
    currentMode,
    detectedIntent,
    agentFlow,
    useAutoFix,
    agentContext,
    designBriefBlock,
    userDnaContext,
    dnaContext,
    memoryChunkContext,
    rawChunks,
    projectDna,
    disconnected,
    sendEvent,
    userId,
  } = ctx;

  // ── Server-side integration capabilities (no secrets leave the server) ────
  const capabilities: Record<string, boolean> = project.userId
    ? await getIntegrationCapabilities(project.userId)
    : {};

  // ── System prompt (built by prompt-builder.ts) ───────────────────────────
  // buildSystemPrompt assembles all prompt layers and calls assertPromptSafe.
  const systemPrompt = buildSystemPrompt({
    currentMode,
    capabilities,
    projectType: project.type,
    stack: project.stack ?? "html",
    detectedIntent,
    userContent: body.content,
    designBriefBlock,
    userDnaContext,
    dnaContext,
    memoryChunkContext,
    agentContext,
    userLang: body.userLang,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AGENT FLOW — Step-by-step building
  // ══════════════════════════════════════════════════════════════════════════
  if (agentFlow) {
    const existingHtml = project.previewHtml || "";

    sendEvent({
      type: "agent_phase",
      phase: "planning",
      message: "מתכנן שלבים...",
    });

    let plan: {
      steps: Array<{
        id: number;
        emoji: string;
        title: string;
        prompt: string;
      }>;
    };
    try {
      const planRes = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1000,
        system: `You are a task planner for an AI app builder. Break the user's task into 3-5 focused implementation steps.
Return ONLY valid JSON with no other text: {"steps":[{"id":1,"emoji":"🏗️","title":"Hebrew title max 30 chars","prompt":"Detailed English implementation instruction for Claude Sonnet"}]}
Emojis: 🏗️ for layout/structure, 🎨 for styling/design, ⚡ for functionality/JS, 🔌 for API/data, 🧪 for testing/fixes.`,
        messages: [
          {
            role: "user",
            content: `Task: ${body.content}\nExisting code: ${existingHtml ? "YES — must modify and preserve existing content" : "NONE — build from scratch"}`,
          },
        ],
      });
      const planText =
        planRes.content[0].type === "text" ? planRes.content[0].text : "";
      const m = planText.match(/\{[\s\S]*\}/);
      plan = m
        ? JSON.parse(m[0])
        : {
            steps: [
              {
                id: 1,
                emoji: "🚀",
                title: body.content.slice(0, 30),
                prompt: body.content,
              },
            ],
          };
      if (!Array.isArray(plan.steps) || plan.steps.length === 0)
        throw new Error("empty plan");
    } catch {
      plan = {
        steps: [
          {
            id: 1,
            emoji: "🚀",
            title: body.content.slice(0, 30),
            prompt: body.content,
          },
        ],
      };
    }

    sendEvent({
      type: "agent_plan",
      steps: plan.steps.map((s) => ({
        id: s.id,
        emoji: s.emoji,
        title: s.title,
      })),
    });

    // ── Step 2: Execute each step with Sonnet ────────────────────────────────
    let currentHtml = existingHtml;
    let agentFullResponse = "";

    for (const step of plan.steps) {
      sendEvent({
        type: "agent_step_start",
        stepId: step.id,
        title: step.title,
        emoji: step.emoji,
      });

      const stepUserContent = currentHtml
        ? `[CURRENT APP — START]\n\`\`\`html\n${currentHtml}\n\`\`\`\n[CURRENT APP — END]\n\nIMPORTANT: Use the code above as your exact base. Return the COMPLETE updated HTML file.\n\nSTEP ${step.id}: ${step.prompt}`
        : `STEP ${step.id}: ${step.prompt}`;

      const stepHistory = [...messageHistory];
      if (
        stepHistory.length > 0 &&
        stepHistory[stepHistory.length - 1].role === "user"
      ) {
        stepHistory[stepHistory.length - 1] = {
          role: "user",
          content: stepUserContent,
        };
      } else {
        stepHistory.push({ role: "user", content: stepUserContent });
      }

      const stepStream = anthropic.messages.stream({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        system: systemPrompt,
        messages: stepHistory,
      });

      let stepFull = "";
      let stepPatchDepth = 0;
      for await (const chunk of stepStream) {
        if (disconnected.flag) break;
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          const text = chunk.delta.text;
          stepFull += text;
          agentFullResponse += text;
          const totalFences = (agentFullResponse.match(/```/g) ?? []).length;
          if (text.includes("<<<REPLACE>>>")) stepPatchDepth++;
          if (text.includes("<<<END>>>"))
            stepPatchDepth = Math.max(0, stepPatchDepth - 1);
          const inCode = totalFences % 2 === 1 || stepPatchDepth > 0;
          sendEvent({ type: inCode ? "code" : "text", content: text });
        }
      }

      // Extract HTML from step response
      const stepHtmlMatch = stepFull.match(/```html\r?\n([\s\S]*?)\n```/i);
      if (stepHtmlMatch?.[1]) currentHtml = stepHtmlMatch[1].trim();
      else {
        const bareMatch = stepFull.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>)/i);
        if (bareMatch?.[1]) currentHtml = bareMatch[1].trim();
      }

      sendEvent({ type: "agent_step_done", stepId: step.id });
    }

    // ── Step 3: Auto-fix ─────────────────────────────────────────────────────
    if (useAutoFix && currentHtml) {
      sendEvent({
        type: "agent_phase",
        phase: "fixing",
        message: "בודק ומתקן...",
      });
      try {
        const fixRes = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 4096,
          system:
            "You are a code reviewer. Fix any obvious bugs, missing closing tags, or broken JavaScript in this HTML app. Return the complete fixed HTML. If nothing needs fixing, return the HTML unchanged.",
          messages: [
            {
              role: "user",
              content: `Fix this HTML app:\n\`\`\`html\n${currentHtml.slice(0, 15000)}\n\`\`\``,
            },
          ],
        });
        const fixText =
          fixRes.content[0].type === "text" ? fixRes.content[0].text : "";
        const fixMatch = fixText.match(/```html\r?\n([\s\S]*?)\n```/i);
        if (fixMatch?.[1]) currentHtml = fixMatch[1].trim();
      } catch {
        /* non-critical */
      }
    }

    sendEvent({ type: "agent_phase", phase: null, message: null });

    // ── Step 4: Save everything ──────────────────────────────────────────────
    await db.insert(projectMessagesTable).values({
      projectId: params.id,
      role: "assistant",
      content:
        agentFullResponse ||
        `[סוכן] ביצע: ${body.content}\n\n\`\`\`html\n${currentHtml}\n\`\`\``,
    });

    const agentAllMessages = await db
      .select()
      .from(projectMessagesTable)
      .where(eq(projectMessagesTable.projectId, params.id));

    const agentSkillScore = calculateSkillScore(agentAllMessages);

    const agentUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
      skillScore: agentSkillScore,
    };
    if (currentHtml) agentUpdate.previewHtml = currentHtml;

    await db
      .update(projectsTable)
      .set(agentUpdate)
      .where(eq(projectsTable.id, params.id));

    if (currentHtml) {
      await db
        .insert(projectFilesTable)
        .values({
          projectId: params.id,
          path: "index.html",
          content: currentHtml,
          language: "html",
          isEntrypoint: true,
        })
        .onConflictDoUpdate({
          target: [projectFilesTable.projectId, projectFilesTable.path],
          set: { content: currentHtml, updatedAt: new Date() },
        });

      const msgCountForSnap = agentAllMessages.filter(
        (m) => m.role === "user",
      ).length;
      await db.insert(projectSnapshotsTable).values({
        projectId: params.id,
        html: currentHtml,
        label: `גרסה ${msgCountForSnap} (סוכן)`,
        snapshotType:
          project.stack === "react" || project.stack === "nextjs"
            ? "react"
            : "html",
      });
    }

    if (currentHtml)
      broadcastProjectUpdate(String(params.id), { previewUpdated: true });

    extractAndSaveDNA(
      params.id,
      body.content,
      agentFullResponse,
      currentMode,
      detectedIntent.intent,
    ).catch(() => {});
    extractAndSaveMemoryChunks(
      params.id,
      body.content,
      agentFullResponse,
      rawChunks,
      detectedIntent.intent,
    ).catch(() => {});

    sendEvent({
      done: true,
      previewUpdated: !!currentHtml,
      agentDone: true,
      stepsCompleted: plan.steps.length,
      skillScore: agentSkillScore,
      detectedMode: isFirstMessage ? currentMode : undefined,
    });
    return;
  }
  // ══════════════════════════════════════════════════════════════════════════
  // END AGENT FLOW
  // ══════════════════════════════════════════════════════════════════════════

  // ── Semantic cache check ──────────────────────────────────────────────────
  const currentHtmlHash = project.previewHtml
    ? createHash("sha256")
        .update(project.previewHtml.slice(0, 2000))
        .digest("hex")
        .slice(0, 16)
    : "empty";
  const cacheKey = createHash("sha256")
    .update(
      [
        String(params.id),
        body.content.slice(0, 500),
        currentMode,
        project.stack ?? "html",
        detectedIntent.intent,
        currentHtmlHash,
        isFirstMessage ? "new" : "existing",
      ].join("|"),
    )
    .digest("hex");

  const [cachedEntry] = await db
    .select()
    .from(promptCacheTable)
    .where(eq(promptCacheTable.hash, cacheKey))
    .catch(() => [null]);

  if (cachedEntry) {
    let fullResponse = "";
    const chunks = cachedEntry.response.match(/.{1,100}/g) ?? [
      cachedEntry.response,
    ];
    let cachedPatchDepth = 0;
    for (const chunk of chunks) {
      fullResponse += chunk;
      const totalFences = (fullResponse.match(/```/g) ?? []).length;
      if (chunk.includes("<<<REPLACE>>>")) cachedPatchDepth++;
      if (chunk.includes("<<<END>>>"))
        cachedPatchDepth = Math.max(0, cachedPatchDepth - 1);
      const inCode = totalFences % 2 === 1 || cachedPatchDepth > 0;
      sendEvent({ type: inCode ? "code" : "text", content: chunk });
    }
    await db.insert(projectMessagesTable).values({
      projectId: project.id,
      role: "assistant",
      content: fullResponse,
    });
    sendEvent({ done: true, previewUpdated: false, fromCache: true });
    return;
  }

  // ── Main Claude streaming call ────────────────────────────────────────────
  // PERF-02: cache_control:ephemeral on the system prompt caches it across
  // consecutive requests, reducing latency by ~85% on cache hits.
  const getLatencyMs = startTimer();
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: [
      {
        type: "text" as const,
        text: systemPrompt,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: messageHistory,
  });

  let fullResponse = "";
  let patchDepth = 0;

  for await (const chunk of stream) {
    if (disconnected.flag) break;
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      const text = chunk.delta.text;
      fullResponse += text;
      const totalFences = (fullResponse.match(/```/g) ?? []).length;
      if (text.includes("<<<REPLACE>>>")) patchDepth++;
      if (text.includes("<<<END>>>")) patchDepth = Math.max(0, patchDepth - 1);
      const inCode = totalFences % 2 === 1 || patchDepth > 0;
      sendEvent({ type: inCode ? "code" : "text", content: text });
    }
  }

  if (disconnected.flag) return;

  // ── Auto-continuation when output token limit hit mid-code ───────────────
  const isReactStack = project.stack === "react" || project.stack === "nextjs";
  if (!isReactStack) {
    try {
      const finalMsg = await stream.finalMessage();
      if (finalMsg.stop_reason === "max_tokens") {
        const isInsideCodeBlock =
          (fullResponse.match(/```/g) ?? []).length % 2 === 1;
        const lastChars = fullResponse.slice(-300);

        const continuationMessages: {
          role: "user" | "assistant";
          content: string;
        }[] = [
          ...messageHistory.map((m) => ({
            role: m.role as "user" | "assistant",
            content:
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content),
          })),
          { role: "assistant", content: fullResponse },
          {
            role: "user",
            content: isInsideCodeBlock
              ? "המשך את הקוד בדיוק מהמקום שעצרת. אל תוסיף הסבר — רק המשך את הקוד."
              : `המשך בדיוק מהמקום שעצרת. הטקסט האחרון שכתבת: "${lastChars}"`,
          },
        ];

        const continuationStream = anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 8192,
          system: systemPrompt,
          messages: continuationMessages,
        });

        for await (const chunk of continuationStream) {
          if (disconnected.flag) break;
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            fullResponse += text;
            const totalFences = (fullResponse.match(/```/g) ?? []).length;
            if (text.includes("<<<REPLACE>>>")) patchDepth++;
            if (text.includes("<<<END>>>"))
              patchDepth = Math.max(0, patchDepth - 1);
            const inCode = totalFences % 2 === 1 || patchDepth > 0;
            sendEvent({ type: inCode ? "code" : "text", content: text });
          }
        }
      }
    } catch {
      /* non-critical — extraction will still work on what we have */
    }
  }

  // ── Extract HTML preview + React manifest ────────────────────────────────
  let extractedHtml = extractHtml(fullResponse, {
    isReactStack,
    previewHtml: project.previewHtml,
    intent: detectedIntent.intent,
  });

  // Sanitize image URLs before saving — blocks javascript:, data:, http: sources
  if (extractedHtml) {
    extractedHtml = sanitizeImageUrls(extractedHtml);
  }
  const extractedReactFiles: ExtractedFile[] = isReactStack
    ? extractReactFiles(fullResponse)
    : [];

  // ── Save AI response to DB ────────────────────────────────────────────────
  await db.insert(projectMessagesTable).values({
    projectId: params.id,
    role: "assistant",
    content: fullResponse,
  });

  // ── DNA + memory (fire-and-forget) ────────────────────────────────────────
  withRetry(() =>
    extractAndSaveDNA(
      params.id,
      body.content,
      fullResponse,
      currentMode,
      detectedIntent.intent,
    ),
  ).catch((err) =>
    logger.warn(
      { err, projectId: params.id },
      "[Memory] DNA extraction failed",
    ),
  );

  extractAndSaveMemoryChunks(
    params.id,
    body.content,
    fullResponse,
    rawChunks,
    detectedIntent.intent,
  ).catch((err) =>
    logger.warn(
      { err, projectId: params.id },
      "[Memory] Chunk extraction failed",
    ),
  );

  // ── Prompt cache (fire-and-forget) ───────────────────────────────────────
  if (fullResponse.length < 50_000) {
    db.insert(promptCacheTable)
      .values({ hash: cacheKey, response: fullResponse, mode: currentMode })
      .onConflictDoNothing()
      .catch(() => {});
  }

  // ── User DNA update ───────────────────────────────────────────────────────
  if (project.userId) {
    const stackSignal = project.stack ?? "html";
    const skillSignal =
      body.content.toLowerCase().includes("api") ||
      body.content.toLowerCase().includes("backend")
        ? "intermediate"
        : undefined;
    db.insert(userDnaTable)
      .values({
        userId: project.userId,
        preferredStack: stackSignal,
        ...(skillSignal ? { skillLevel: skillSignal } : {}),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userDnaTable.userId,
        set: {
          preferredStack: stackSignal,
          ...(skillSignal ? { skillLevel: skillSignal } : {}),
          updatedAt: new Date(),
        },
      })
      .catch(() => {});
  }

  // ── Telemetry ─────────────────────────────────────────────────────────────
  let lastInputTokens = 0;
  let lastOutputTokens = 0;
  try {
    const finalMsg = await stream.finalMessage();
    const latencyMs = getLatencyMs();
    lastInputTokens = finalMsg.usage?.input_tokens ?? 0;
    lastOutputTokens = finalMsg.usage?.output_tokens ?? 0;
    await recordAiCall({
      projectId: params.id,
      userId,
      type: "ai_message",
      model: "claude-sonnet-4-5",
      inputTokens: lastInputTokens,
      outputTokens: lastOutputTokens,
      latencyMs,
      promptVersion: PROMPT_VERSION,
      intentType: detectedIntent.intent,
    });
  } catch {
    /* non-critical */
  }

  // ── Skill score + update project ──────────────────────────────────────────
  const allMessages = await db
    .select()
    .from(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, params.id));

  const newSkillScore = calculateSkillScore(allMessages);

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
    skillScore: newSkillScore,
  };

  const isPatchForSummary =
    !isFirstMessage &&
    (detectedIntent.intent === "fix" || detectedIntent.intent === "edit");
  const changeSummary = extractedHtml
    ? computeChangeSummary(
        project.previewHtml,
        extractedHtml,
        isPatchForSummary,
        extractedReactFiles.length > 0
          ? extractedReactFiles.map((f) => f.path)
          : undefined,
      )
    : undefined;

  // ── Atomic DB transaction: files + snapshot + project update ─────────────
  const userMsgCount = allMessages.filter((m) => m.role === "user").length;
  await writeSnapshot(
    {
      projectId: params.id,
      stack: project.stack ?? null,
      extractedHtml,
      extractedReactFiles,
      changeSummary: changeSummary ?? null,
      messageCount: userMsgCount,
    },
    updateData,
  );

  // ── Grow-With-Me suggestion ───────────────────────────────────────────────
  let growWithMeSuggestion: string | null = null;
  const lowerUserMsg = body.content.toLowerCase();
  const lastSuggestion = projectDna?.lastGrowSuggestionAt;
  const cooldownOk =
    !lastSuggestion ||
    Date.now() - new Date(lastSuggestion).getTime() > 48 * 60 * 60 * 1000;

  if (cooldownOk) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMessages = allMessages.filter(
      (m) => m.role === "user" && new Date(m.createdAt ?? 0) >= weekAgo,
    );
    const sessionCount = Math.ceil(recentMessages.length / 3);

    const last3UserMsgs = allMessages
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content.toLowerCase())
      .join(" ");

    const builderSignals = [
      "api",
      "database",
      "react",
      "component",
      "deploy",
      "backend",
      "frontend",
      "hook",
      "typescript",
      "github",
      "ci/cd",
      "docker",
    ];
    const developerSignals = [
      "typescript",
      "testing",
      "unit test",
      "ci/cd",
      "docker",
      "kubernetes",
      "microservice",
      "performance",
      "benchmark",
      "algorithm",
    ];
    const makerSignals = [
      "כיף",
      "לעצמי",
      "אישי",
      "for fun",
      "hobby",
      "game",
      "משחק",
      "three.js",
      "canvas",
      "animation",
      "creative",
    ];
    const entrepreneurSignals = [
      "לקוחות",
      "מכירות",
      "עסק",
      "תשלום",
      "הכנסה",
      "customers",
      "revenue",
      "business",
      "sell",
      "payment",
      "pricing",
      "saas",
    ];
    const shareDeploySignals = [
      "שתף",
      "חברים",
      "domain",
      "deploy",
      "public",
      "share",
      "publish",
      "host",
    ];

    const countSignals = (signals: string[], text: string) =>
      signals.filter((s) => text.includes(s)).length;

    if (currentMode === "entrepreneur") {
      const techCount = countSignals(builderSignals, last3UserMsgs);
      const funCount = countSignals(makerSignals, last3UserMsgs);
      if (techCount >= 3 && newSkillScore >= 30 && sessionCount >= 2)
        growWithMeSuggestion = "builder";
      else if (funCount >= 2) growWithMeSuggestion = "maker";
    } else if (currentMode === "builder") {
      const devCount = countSignals(developerSignals, last3UserMsgs);
      if (devCount >= 3 && newSkillScore >= 70)
        growWithMeSuggestion = "developer";
      else if (countSignals(entrepreneurSignals, last3UserMsgs) >= 2)
        growWithMeSuggestion = "entrepreneur";
    } else if (currentMode === "developer") {
      const bizCount = countSignals(entrepreneurSignals, last3UserMsgs);
      if (bizCount >= 3) growWithMeSuggestion = "entrepreneur";
    } else if (currentMode === "maker") {
      const shareCount = countSignals(shareDeploySignals, lowerUserMsg);
      const bizCount = countSignals(entrepreneurSignals, last3UserMsgs);
      if (shareCount >= 1 && sessionCount >= 2)
        growWithMeSuggestion = "builder";
      else if (bizCount >= 2) growWithMeSuggestion = "entrepreneur";
    }

    if (growWithMeSuggestion) {
      const currentCount = projectDna?.growSuggestionCount ?? 0;
      db.update(projectDnaTable)
        .set({
          lastGrowSuggestionAt: new Date(),
          growSuggestionCount: currentCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(projectDnaTable.projectId, params.id))
        .catch(() => {});
    }
  }

  // ── Broadcast + contextual suggestions + next step ───────────────────────
  const hasUpdate = !!extractedHtml || extractedReactFiles.length > 0;
  if (hasUpdate)
    broadcastProjectUpdate(String(params.id), { previewUpdated: true });

  const codeForSuggestions = extractedHtml || fullResponse;
  const contextSuggestions = codeForSuggestions
    ? detectContextualSuggestions(codeForSuggestions, capabilities)
    : [];
  if (contextSuggestions.length > 0) {
    sendEvent({ type: "suggestions", suggestions: contextSuggestions });
  }

  if (hasUpdate && codeForSuggestions) {
    const userLang = /[\u0590-\u05FF]/.test(body.content) ? "he" : "en";
    const nextStepText = detectNextStep(
      body.content,
      codeForSuggestions,
      existingMessages.length,
      userLang,
    );
    if (nextStepText) {
      sendEvent({ type: "next_step", text: nextStepText });
    }
  }

  // ── Auto QA (fire-and-forget) ─────────────────────────────────────────────
  if (hasUpdate && extractedHtml) {
    setImmediate(async () => {
      try {
        const code = extractedHtml.slice(0, 8000);
        const msg = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 800,
          messages: [
            {
              role: "user",
              content: `Analyze this HTML app and return a JSON object with: {"quality_score": number (0-100), "critical_issues": string[], "auto_fix_suggestions": [{"issue":string,"fix":string}]}. Code:\n${code}`,
            },
          ],
          system:
            "You are a QA engineer. Return only valid JSON, no explanation.",
        });
        const text =
          msg.content[0].type === "text" ? msg.content[0].text : "{}";
        const qa = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
        if (qa.quality_score !== undefined) {
          const coveragePct: number = Number(qa.quality_score) || 0;
          await db
            .insert(qaTestResultsTable)
            .values({
              projectId: params.id,
              testSuite: { auto_triggered: true, ...qa },
              coveragePercent: coveragePct,
              autoFixSuggestions: qa.auto_fix_suggestions ?? [],
              passed: coveragePct >= 70 ? 1 : 0,
              failed: coveragePct < 70 ? 1 : 0,
            })
            .catch(() => {});
        }
      } catch {
        /* non-critical, fire-and-forget */
      }
    });
  }

  sendEvent({
    done: true,
    previewUpdated: hasUpdate,
    filesUpdated:
      extractedReactFiles.length > 0
        ? extractedReactFiles.map((f) => f.path)
        : undefined,
    detectedMode: isFirstMessage ? currentMode : undefined,
    skillScore: newSkillScore,
    growWithMeSuggestion,
    changeSummary,
    inputTokens: lastInputTokens,
    outputTokens: lastOutputTokens,
  });
}
