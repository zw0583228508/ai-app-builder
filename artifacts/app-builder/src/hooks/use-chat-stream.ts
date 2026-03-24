import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProjectQueryKey } from "@workspace/api-client-react";
import type { ChangeSummary } from "@/components/TrustCard";
import { trackStreamError, trackRetry } from "@/lib/telemetry";

export interface Attachment {
  name: string;
  type: string;
  data: string;
  size: number;
  preview?: string;
}

export interface PipelineStep {
  step: "architecture" | "ui" | "security" | "performance";
  done: boolean;
}

export interface AgentStepUI {
  id: number;
  emoji: string;
  title: string;
  status: "pending" | "running" | "done";
}

export interface AgentFixEntry {
  iteration: number;
  fixed: boolean;
  issues: string[];
}

export type AgentPhase = "planning" | "executing" | "fixing" | null;

export interface ChatSuggestion {
  type: string;
  title: string;
  desc: string;
  action: string;
}

export interface DetectedChatIntent {
  intent: string;
  label: string;
  emoji: string;
}

interface UseChatStreamOptions {
  projectId: number;
  onPreviewUpdated?: () => void;
  onModeDetected?: (mode: string) => void;
  onGrowWithMe?: (suggestedMode: string) => void;
  onError?: (err: Error) => void;
  onActionResult?: (action: string, data: Record<string, unknown>) => void;
}

export function useChatStream({
  projectId,
  onPreviewUpdated,
  onModeDetected,
  onGrowWithMe,
  onError,
  onActionResult,
}: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeLines, setCodeLines] = useState(0);
  const [skillScore, setSkillScore] = useState<number | null>(null);
  const [pipelineMessage, setPipelineMessage] = useState<string | null>(null);
  const [entrepreneurPlan, setEntrepreneurPlan] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);

  // ── Agent flow state ──────────────────────────────────────────────────────
  const [agentPhase, setAgentPhase] = useState<AgentPhase>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStepUI[]>([]);
  const [agentFixLog, setAgentFixLog] = useState<AgentFixEntry[]>([]);
  const [agentStepsCompleted, setAgentStepsCompleted] = useState<number | null>(
    null,
  );

  // ── Intent & Suggestions state ────────────────────────────────────────────
  const [currentIntent, setCurrentIntent] = useState<DetectedChatIntent | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [lastChangeSummary, setLastChangeSummary] =
    useState<ChangeSummary | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [lastMessageTokens, setLastMessageTokens] = useState<{ input: number; output: number } | null>(null);

  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const liveHtmlRef = useRef("");
  const lastSentRef = useRef<{
    content: string;
    attachments?: Attachment[];
    agentFlow?: boolean;
  } | null>(null);

  // Direct streaming — no typewriter buffering; chunks are rendered as they arrive
  // This eliminates "freeze then dump" behavior and gives a natural live feel
  const appendStreamedText = useCallback((chunk: string) => {
    setStreamedText((prev) => prev + chunk);
  }, []);

  const isGeneratingCodeRef = useRef(false);

  const sendMessage = useCallback(
    async (
      content: string,
      attachments?: Attachment[],
      agentFlow?: boolean,
    ) => {
      lastSentRef.current = { content, attachments, agentFlow };
      setIsStreaming(true);
      setStreamedText("");
      setIsGeneratingCode(false);
      setCodeLines(0);
      setLastChangeSummary(null);
      liveHtmlRef.current = "";
      // Reset agent state
      setAgentPhase(null);
      setAgentSteps([]);
      setAgentFixLog([]);
      setAgentStepsCompleted(null);
      // Reset intent, suggestions, next step, and any previous error
      setCurrentIntent(null);
      setSuggestions([]);
      setStreamError(null);
      setNextStep(null);

      abortControllerRef.current = new AbortController();

      try {
        // SECURITY: credentials are NEVER included in the chat request body.
        // The backend derives integration capabilities server-side from the
        // encrypted vault using the authenticated session's userId.
        const body: Record<string, unknown> = { content };
        if (attachments && attachments.length > 0) {
          body.attachments = attachments.map((a) => ({
            name: a.name,
            type: a.type,
            data: a.data,
            size: a.size,
          }));
        }
        if (agentFlow) body.agentFlow = true;

        const res = await fetch(`/api/projects/${projectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to send message");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;

            try {
              const dataStr = trimmedLine.slice(6);
              if (!dataStr) continue;
              const data = JSON.parse(dataStr);

              // ── Pipeline events (standard flow) ───────────────────────────
              if (data.type === "pipeline_start") {
                setPipelineMessage(data.message ?? "מנתח בקשה...");
                setPipelineSteps([]);
              } else if (data.type === "pipeline_step") {
                setPipelineSteps((prev) => {
                  const already = prev.find((s) => s.step === data.step);
                  if (already) return prev;
                  return [...prev, { step: data.step, done: true }];
                });
              } else if (data.type === "pipeline_done") {
                setPipelineMessage(null);

                // ── Agent flow events ──────────────────────────────────────────
              } else if (data.type === "agent_phase") {
                setAgentPhase(data.phase ?? "planning");
                if (data.message) setPipelineMessage(data.message);
              } else if (
                data.type === "agent_plan" &&
                Array.isArray(data.steps)
              ) {
                setAgentPhase("executing");
                setPipelineMessage(null);
                setAgentSteps(
                  (
                    data.steps as Array<{
                      id: number;
                      emoji: string;
                      title: string;
                    }>
                  ).map((s) => ({
                    id: s.id,
                    emoji: s.emoji,
                    title: s.title,
                    status: "pending" as const,
                  })),
                );
              } else if (
                data.type === "agent_step_start" &&
                data.stepId != null
              ) {
                setAgentPhase("executing");
                setAgentSteps((prev) =>
                  prev.map((s) =>
                    s.id === data.stepId
                      ? { ...s, status: "running" as const }
                      : s,
                  ),
                );
              } else if (
                data.type === "agent_step_done" &&
                data.stepId != null
              ) {
                setAgentSteps((prev) =>
                  prev.map((s) =>
                    s.id === data.stepId
                      ? { ...s, status: "done" as const }
                      : s,
                  ),
                );
              } else if (data.type === "agent_fix_start") {
                setAgentPhase("fixing");
              } else if (data.type === "agent_fix_done") {
                setAgentFixLog((prev) => [
                  ...prev,
                  {
                    iteration: data.iteration ?? 1,
                    fixed: Boolean(data.fixed),
                    issues: Array.isArray(data.issues) ? data.issues : [],
                  },
                ]);

                // ── Entrepreneur planning phase (Issue 14) ─────────────────────
              } else if (data.type === "entrepreneur_plan" && data.plan) {
                setEntrepreneurPlan(data.plan as Record<string, unknown>);

                // ── Intent detection ───────────────────────────────────────────
              } else if (data.type === "intent_detected") {
                setCurrentIntent({
                  intent: data.intent,
                  label: data.label,
                  emoji: data.emoji,
                });

                // ── Next-step suggestion ───────────────────────────────────────
              } else if (
                data.type === "next_step" &&
                typeof data.text === "string"
              ) {
                setNextStep(data.text);

                // ── Contextual suggestions ─────────────────────────────────────
              } else if (
                data.type === "suggestions" &&
                Array.isArray(data.suggestions)
              ) {
                setSuggestions(data.suggestions as ChatSuggestion[]);

                // ── Done event ─────────────────────────────────────────────────
              } else if (data.done) {
                setPipelineMessage(null);
                setPipelineSteps([]);
                setIsGeneratingCode(false);
                if (data.agentDone) {
                  setAgentPhase(null);
                  if (data.stepsCompleted != null)
                    setAgentStepsCompleted(data.stepsCompleted);
                }
                if (data.previewUpdated) {
                  window.dispatchEvent(
                    new CustomEvent("builder-preview-updated", {
                      detail: { projectId },
                    }),
                  );
                  onPreviewUpdated?.();
                }
                if (data.filesUpdated) {
                  window.dispatchEvent(
                    new CustomEvent("builder-files-updated", {
                      detail: { projectId },
                    }),
                  );
                }
                if (data.detectedMode) onModeDetected?.(data.detectedMode);
                if (data.skillScore !== undefined)
                  setSkillScore(data.skillScore);
                if (data.growWithMeSuggestion)
                  onGrowWithMe?.(data.growWithMeSuggestion);
                if (data.action)
                  onActionResult?.(
                    data.action as string,
                    data as Record<string, unknown>,
                  );
                if (data.changeSummary)
                  setLastChangeSummary(data.changeSummary as ChangeSummary);
                if (data.inputTokens !== undefined || data.outputTokens !== undefined)
                  setLastMessageTokens({
                    input: (data.inputTokens as number) ?? 0,
                    output: (data.outputTokens as number) ?? 0,
                  });

                // ── Streaming content ──────────────────────────────────────────
              } else if (data.content !== undefined) {
                const chunk: string = data.content;
                const isCode = data.type === "code";

                if (isCode) {
                  if (!isGeneratingCodeRef.current) {
                    isGeneratingCodeRef.current = true;
                    setIsGeneratingCode(true);
                  }
                  liveHtmlRef.current += chunk;
                  const lines = liveHtmlRef.current.split("\n").length;
                  setCodeLines(lines);

                  window.dispatchEvent(
                    new CustomEvent("builder-preview-streaming", {
                      detail: { projectId, html: liveHtmlRef.current },
                    }),
                  );
                } else {
                  if (isGeneratingCodeRef.current) {
                    isGeneratingCodeRef.current = false;
                    setIsGeneratingCode(false);
                  }
                  appendStreamedText(chunk);
                }
              }
            } catch (e) {
              console.warn("Failed to parse SSE chunk:", trimmedLine, e);
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[useChatStream] Error:", err);
          onError?.(err as Error);
          const msg = (err as Error).message || "";
          const msgLower = msg.toLowerCase();
          if (
            msgLower.includes("rate limit") ||
            msgLower.includes("429") ||
            msgLower.includes("too many")
          ) {
            setStreamError("הגעת למגבלת ההודעות. נסה שוב בעוד מספר שניות.");
            trackStreamError("", "rate_limit");
          } else if (
            msgLower.includes("unauthorized") ||
            msgLower.includes("401") ||
            msgLower.includes("forbidden")
          ) {
            setStreamError("אין הרשאה — אנא התחבר מחדש.");
            trackStreamError("", "auth");
          } else if (
            msgLower.includes("fetch") ||
            msgLower.includes("network") ||
            msgLower.includes("failed to")
          ) {
            setStreamError("בעיית חיבור לאינטרנט. בדוק את החיבור ונסה שוב.");
            trackStreamError("", "network");
          } else if (
            msgLower.includes("timeout") ||
            msgLower.includes("timed out")
          ) {
            setStreamError("הבקשה ארכה יותר מדי. נסה שוב או פשט את הבקשה.");
            trackStreamError("", "timeout");
          } else {
            setStreamError("שגיאה בשליחת ההודעה. נסה שוב.");
            trackStreamError("", "unknown");
          }
        }
      } finally {
        setIsStreaming(false);
        setIsGeneratingCode(false);
        setCodeLines(0);
        setPipelineMessage(null);
        setPipelineSteps([]);
        liveHtmlRef.current = "";
        abortControllerRef.current = null;
        queryClient.invalidateQueries({
          queryKey: getGetProjectQueryKey(projectId),
        });
        // Always fire so PreviewPanel can clear its streaming state
        window.dispatchEvent(
          new CustomEvent("builder-build-ended", { detail: { projectId } }),
        );
      }
    },
    [
      projectId,
      queryClient,
      onPreviewUpdated,
      onModeDetected,
      onGrowWithMe,
      onError,
      appendStreamedText,
    ],
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const retryLastMessage = useCallback(() => {
    const last = lastSentRef.current;
    if (!last || isStreaming) return;
    setStreamError(null);
    trackRetry("");
    sendMessage(last.content, last.attachments, last.agentFlow);
  }, [sendMessage, isStreaming]);

  return {
    sendMessage,
    isStreaming,
    streamedText,
    isGeneratingCode,
    codeLines,
    stopStreaming,
    skillScore,
    streamedContent: streamedText,
    pipelineMessage,
    pipelineSteps,
    // Agent flow
    agentPhase,
    agentSteps,
    agentFixLog,
    agentStepsCompleted,
    // Intent & suggestions
    currentIntent,
    suggestions,
    clearSuggestions: () => setSuggestions([]),
    // Entrepreneur planning phase (Issue 14)
    entrepreneurPlan,
    clearEntrepreneurPlan: () => setEntrepreneurPlan(null),
    // Trust layer
    lastChangeSummary,
    clearChangeSummary: () => setLastChangeSummary(null),
    // Stream error (shown when stream fails)
    streamError,
    clearStreamError: () => setStreamError(null),
    retryLastMessage,
    // Next-step momentum engine
    nextStep,
    clearNextStep: () => setNextStep(null),
    // Token cost display
    lastMessageTokens,
    clearLastMessageTokens: () => setLastMessageTokens(null),
  };
}
