import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectMessagesTable,
  projectFilesTable,
  userDnaTable,
  userSubscriptionsTable,
} from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { detectUserMode } from "../../../services/ai/mode";
import { detectChatIntent } from "../../../services/ai/intent";
import {
  getProjectDNA,
  buildDNAContext,
  buildUserDNAContext,
  scoreMemoryChunks,
  buildMemoryChunkContext,
} from "../../../services/memory/project-dna";
import type { MemoryChunk } from "../../../services/memory/project-dna";
import { trimMessagesToTokenBudget } from "../../../services/messages/context-trimmer";
import { checkUsageAlert } from "../../../services/notifications/usage-alert";
import { checkRateLimit } from "../../../services/rate-limit";
import {
  SendProjectMessageBody,
  SendProjectMessageParams,
} from "@workspace/api-zod";
import { runAgentAndDesignBrain } from "./agent";
import { handleIntentRouting } from "./intent-handler";
import { runAiGeneration } from "./ai-generation";
import { buildFinalUserContent, type Attachment } from "./message-builder";
import { checkPromptInjection } from "../../../lib/prompt-guard";

const router = Router({ mergeParams: true });

// ── AI Message (SSE streaming) ───────────────────────────────
router.post("/:id/messages", async (req, res) => {
  const params = SendProjectMessageParams.parse(req.params);
  const agentFlow = Boolean((req.body as Record<string, unknown>).agentFlow);
  const useAutoFix = (req.body as Record<string, unknown>).useAutoFix !== false;
  const body = SendProjectMessageBody.parse(req.body);

  // ── Input sanitization ────────────────────────────────────────────────────
  const MAX_MSG_CHARS = 8_000;
  const sanitizedContent = body.content
    .replace(/\x00/g, "")
    .replace(/[\x01-\x08\x0B-\x1F]/g, "")
    .trim()
    .slice(0, MAX_MSG_CHARS);
  if (!sanitizedContent) {
    res.status(400).json({ error: "תוכן ההודעה לא יכול להיות ריק" });
    return;
  }
  const injectionCheck = checkPromptInjection(sanitizedContent);
  if (injectionCheck.blocked) {
    res.status(400).json({ error: injectionCheck.reason });
    return;
  }
  (body as { content: string }).content = sanitizedContent;

  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((rows) => rows[0]);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const existingMessages = await db
    .select()
    .from(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, params.id))
    .orderBy(asc(projectMessagesTable.createdAt));

  const isFirstMessage = existingMessages.length === 0;

  // ── Plan Limits Enforcement ───────────────────────────────────────────────
  const PLAN_LIMITS: Record<string, { maxMessages: number; name: string }> = {
    free: { maxMessages: 50, name: "Free" },
    pro: { maxMessages: 200, name: "Pro" },
    studio: { maxMessages: 2000, name: "Studio" },
  };
  const userPlanId = project.userId
    ? await db
        .select({ planId: userSubscriptionsTable.planId })
        .from(userSubscriptionsTable)
        .where(eq(userSubscriptionsTable.userId, project.userId))
        .then((rows) => rows[0]?.planId ?? "free")
        .catch(() => "free")
    : "free";
  const planConfig = PLAN_LIMITS[userPlanId] ?? PLAN_LIMITS.free;
  const sentMessageCount = existingMessages.filter(
    (m) => m.role === "user",
  ).length;
  if (sentMessageCount >= planConfig.maxMessages) {
    res.status(402).json({
      error: `הגעת למגבלת ${planConfig.maxMessages} הודעות של פלן ${planConfig.name}. שדרג את החשבון כדי להמשיך.`,
      limitReached: true,
      plan: userPlanId,
      limit: planConfig.maxMessages,
    });
    return;
  }

  // ── Per-minute rate limiting ──────────────────────────────────────────────
  if (project.userId) {
    const rl = checkRateLimit(project.userId, userPlanId);
    if (!rl.allowed) {
      res.status(429).json({
        error: `שלחת יותר מדי הודעות דקה. נסה שוב בעוד ${Math.ceil(rl.resetInMs / 1000)} שניות.`,
        retryAfterMs: rl.resetInMs,
      });
      return;
    }
  }

  // ── Intent + mode detection ───────────────────────────────────────────────
  const hasExistingCode =
    !isFirstMessage && (!!project.previewHtml || existingMessages.length > 0);
  const detectedIntent = detectChatIntent(body.content, hasExistingCode);

  // Planning phases disabled
  const usePlanningPhase = false,
    useSpecGeneration = false,
    isAfterPlanningQA = false;
  const isAfterSpecPhase = false,
    isPlanningAnswerMessage = false;

  let currentMode = project.userMode;
  if (isFirstMessage) {
    const detectedMode = detectUserMode(body.content);
    if (detectedMode !== currentMode) {
      currentMode = detectedMode;
      await db
        .update(projectsTable)
        .set({ userMode: currentMode, updatedAt: new Date() })
        .where(eq(projectsTable.id, params.id));
    }
  }

  // ── Fetch Project DNA + User DNA in parallel ─────────────────────────────
  const [projectDna, userDnaRows] = await Promise.all([
    getProjectDNA(params.id),
    db
      .select()
      .from(userDnaTable)
      .where(eq(userDnaTable.userId, project.userId ?? ""))
      .catch(() => [] as (typeof userDnaTable.$inferSelect)[]),
  ]);
  const dnaContext = buildDNAContext(projectDna, currentMode);
  const [userDna] = userDnaRows;
  const userDnaContext = buildUserDNAContext(userDna ?? null);
  const rawChunks = (projectDna?.memoryChunks as MemoryChunk[] | null) ?? [];
  const relevantChunks = scoreMemoryChunks(rawChunks, body.content);
  const memoryChunkContext = buildMemoryChunkContext(relevantChunks);

  // ── Save user message ─────────────────────────────────────────────────────
  const attachmentNote =
    body.attachments && body.attachments.length > 0
      ? "\n\n" + body.attachments.map((a) => `[📎 ${a.name}]`).join(" ")
      : "";
  await db.insert(projectMessagesTable).values({
    projectId: params.id,
    role: "user",
    content: body.content + attachmentNote,
  });

  // ── Build AI message history ──────────────────────────────────────────────
  const isReactStackForPrompt =
    project.stack === "react" || project.stack === "nextjs";
  const existingProjectFiles =
    isReactStackForPrompt && !isFirstMessage
      ? await db
          .select()
          .from(projectFilesTable)
          .where(eq(projectFilesTable.projectId, params.id))
          .orderBy(asc(projectFilesTable.path))
      : [];

  const MAX_HIST_MSG_CHARS_OLD = 4_000;
  const MAX_HIST_MSG_CHARS_RECENT = 40_000;
  const RECENT_COUNT = 4;
  const trimmedHistory = trimMessagesToTokenBudget(
    existingMessages.map((m, idx) => {
      const isRecent = idx >= existingMessages.length - RECENT_COUNT;
      const maxChars = isRecent ? MAX_HIST_MSG_CHARS_RECENT : MAX_HIST_MSG_CHARS_OLD;
      return {
        role: m.role as "user" | "assistant",
        content:
          m.role === "assistant" && m.content.length > maxChars
            ? m.content.slice(0, maxChars) +
              "\n\n[... content truncated for context ...]"
            : m.content,
      };
    }),
    60_000,
  );

  const messageHistory = [
    ...trimmedHistory,
    {
      role: "user" as const,
      content: buildFinalUserContent(
        body.content,
        body.attachments as Attachment[] | undefined,
        {
          isAfterSpecPhase,
          previewHtml: project.previewHtml,
          existingMessages: existingMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          isReactStackForPrompt,
          existingProjectFiles,
          intent: detectedIntent.intent,
          isFirstMessage,
        },
      ),
    },
  ] as Parameters<typeof anthropic.messages.stream>[0]["messages"];

  // ── Setup SSE ─────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const socket = res.socket;
  if (socket) socket.setNoDelay(true);

  const disconnected = { flag: false };
  req.on("close", () => {
    disconnected.flag = true;
  });

  const sendEvent = (data: object) => {
    if (!disconnected.flag) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (project.userId && planConfig) {
    checkUsageAlert(
      project.userId,
      sentMessageCount,
      planConfig.maxMessages,
      sendEvent,
    );
  }

  const heartbeatInterval = setInterval(() => {
    if (!disconnected.flag) res.write(": heartbeat\n\n");
  }, 15_000);
  req.on("close", () => clearInterval(heartbeatInterval));

  try {
    // ── Intent routing (deploy, git push, inspect, planning, spec, image gen) ─
    const handled = await handleIntentRouting({
      body,
      project,
      params,
      userId: req.user?.id ?? null,
      existingMessages,
      isFirstMessage,
      isPlanningAnswerMessage,
      isAfterSpecPhase,
      isAfterPlanningQA,
      usePlanningPhase,
      useSpecGeneration,
      detectedIntent,
      currentMode,
      hasExistingCode,
      sendEvent,
      res,
    });
    if (handled) return;

    // ── Agent + Design Brain pipeline ─────────────────────────────────────────
    const { agentContext, designBriefBlock } = await runAgentAndDesignBrain({
      content: body.content,
      stack: project.stack ?? "html",
      currentMode,
      detectedIntent,
      isFirstMessage,
      isPlanningAnswerMessage,
      isAfterSpecPhase,
      existingMessages: existingMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      agentFlow,
      projectId: params.id,
      projectDna,
      sendEvent,
    });

    // ── Main AI generation ────────────────────────────────────────────────────
    await runAiGeneration({
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
      userId: req.user?.id ?? null,
    });
  } catch (err) {
    console.error("[AI Stream Error]", err);
    sendEvent({ error: "AI generation failed. Please try again." });
  } finally {
    clearInterval(heartbeatInterval);
    res.end();
  }
});

export default router;
