import { useState, useRef, useEffect, useCallback } from "react";
import { X, BotMessageSquare, ArrowLeft } from "lucide-react";
import { useChatStream, type Attachment } from "@/hooks/use-chat-stream";
import {
  ProjectWithMessages,
  useUpdateProjectMode,
  useUpdateProject,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ModeSelector } from "./ModeSelector";
import { MODE_CONFIG, GROW_WITH_ME_MESSAGES } from "@/data/chat-ideas";
import { loadPrompts, savePrompts } from "@/data/chat-prompts";
import { readFileAsAttachment } from "@/lib/file-utils";
import { trackPasteSuccess, trackAttachmentAdded } from "@/lib/telemetry";
import { MessageBubble, extractCodeAndText } from "./MessageBubble";
import { TrustCard } from "./TrustCard";
import { useVoiceInput } from "@/hooks/chat/use-voice-input";
import { ChatHeader } from "./chat/ChatHeader";
import { GrowWithMeBanner } from "./chat/GrowWithMeBanner";
import { QuickIdeasGrid } from "./chat/QuickIdeasGrid";
import { EntrepreneurPlanCard } from "./chat/EntrepreneurPlanCard";
import { StreamingBubble } from "./chat/StreamingBubble";
import { ChatInputBar } from "./chat/ChatInputBar";
import { BuildProgressBar } from "./BuildProgressBar";
import {
  QuickReplyGroup,
  FIRST_RESPONSE_GROUPS_HE,
  FIRST_RESPONSE_GROUPS_EN,
} from "./chat/QuickReplyGroup";
import { BuildStartCard } from "./chat/BuildStartCard";
import { TokenCostBadge } from "./chat/TokenCostBadge";
import { useLang } from "@/lib/i18n";

const HE = "'Rubik', sans-serif";

interface SelectedElement {
  tag: string;
  id: string;
  selector: string;
  text: string;
  rect: { x: number; y: number; w: number; h: number };
}

interface ChatPanelProps {
  project: ProjectWithMessages;
  selectedElement?: SelectedElement | null;
  onClearSelection?: () => void;
}

export function ChatPanel({
  project,
  selectedElement,
  onClearSelection,
}: ChatPanelProps) {
  const { meta } = useLang();
  const isRTL = meta.rtl;
  const [input, setInput] = useState("");
  const [firstBuildPrompt, setFirstBuildPrompt] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [growWithMeSuggestion, setGrowWithMeSuggestion] = useState<
    string | null
  >(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [currentMode, setCurrentMode] = useState(project.userMode);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);

  // ── Voice Input ────────────────────────────────────────────
  const { isRecording, toggleVoice } = useVoiceInput(input, setInput);

  // ── Message Queue ──────────────────────────────────────────
  const [messageQueue, setMessageQueue] = useState<
    Array<{ content: string; attachments?: Attachment[] }>
  >([]);

  // ── Rename ─────────────────────────────────────────────────
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title);

  // ── Prompt Library ─────────────────────────────────────────
  const [savedPrompts, setSavedPrompts] = useState<string[]>(loadPrompts);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showAgentMode, setShowAgentMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  // ── Component Library ──────────────────────────────────────
  const [showCompLibrary, setShowCompLibrary] = useState(false);
  const [compLibrarySearch, setCompLibrarySearch] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);
  const compLibraryRef = useRef<HTMLDivElement>(null);

  const updateModeMutation = useUpdateProjectMode();
  const updateProjectMutation = useUpdateProject();
  const queryClient = useQueryClient();

  const handleModeDetected = useCallback((mode: string) => {
    setCurrentMode(mode as "entrepreneur" | "builder" | "developer" | "maker");
  }, []);

  const handleGrowWithMe = useCallback((suggestedMode: string) => {
    setGrowWithMeSuggestion(suggestedMode);
  }, []);

  const {
    sendMessage,
    isStreaming,
    streamedText,
    isGeneratingCode,
    codeLines,
    stopStreaming,
    pipelineMessage,
    pipelineSteps,
    agentPhase,
    agentSteps,
    agentFixLog,
    agentStepsCompleted,
    currentIntent,
    suggestions,
    clearSuggestions,
    entrepreneurPlan,
    clearEntrepreneurPlan,
    lastChangeSummary,
    clearChangeSummary,
    streamError,
    clearStreamError,
    retryLastMessage,
    nextStep,
    clearNextStep,
    lastMessageTokens,
  } = useChatStream({
    projectId: project.id,
    onModeDetected: handleModeDetected,
    onGrowWithMe: handleGrowWithMe,
    onActionResult: (action, data) => {
      if (action === "deployed" && data.deployUrl) {
        window.open(data.deployUrl as string, "_blank");
      }
    },
  });

  const agentFlowEnabled = showAgentMode;
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  // Scroll when messages list changes or streaming starts/stops
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project.messages, isStreaming, pendingMessage, messageQueue]);

  // Lightweight scroll during streaming
  useEffect(() => {
    if (isStreaming && streamedText) {
      scrollAnchorRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [streamedText, isStreaming]);

  useEffect(() => {
    setCurrentMode(project.userMode);
  }, [project.userMode]);

  // Real-time clock — updates every minute
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
      );
    };
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Clear pending message once streaming finishes, then process queue
  useEffect(() => {
    if (!isStreaming) {
      setPendingMessage(null);
      if (messageQueue.length > 0) {
        const [next, ...rest] = messageQueue;
        setMessageQueue(rest);
        const displayText =
          next.content ||
          (next.attachments && next.attachments.length > 0
            ? `[📎 ${next.attachments.map((a) => a.name).join(", ")}]`
            : "");
        setPendingMessage(displayText);
        sendMessage(
          next.content || "נא לנתח את הקובץ המצורף",
          next.attachments,
        );
      }
    }
  }, [isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send pending template prompt + capture first build prompt for BuildStartCard
  useEffect(() => {
    const pending = sessionStorage.getItem("builder_pending_prompt");
    if (pending && project.messages.length === 0 && !isStreaming) {
      sessionStorage.removeItem("builder_pending_prompt");
      setFirstBuildPrompt(pending);
      setPendingMessage(pending);
      sendMessage(pending);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for visual editing pre-fill from PreviewPanel
  useEffect(() => {
    const handle = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const text: string =
        typeof detail === "string" ? detail : (detail?.text ?? "");
      if (!text) return;
      setInput(text);
      setTimeout(() => {
        inputRef.current?.focus();
        const len = text.length;
        inputRef.current?.setSelectionRange(len, len);
      }, 50);
    };
    window.addEventListener("builder-prefill-message", handle);
    return () => window.removeEventListener("builder-prefill-message", handle);
  }, []);

  // Listen for primary actions dispatched from the ProjectHeader
  useEffect(() => {
    const handle = (e: Event) => {
      const { action } = (e as CustomEvent<{ action: string }>).detail;
      if (action === "git-push") {
        sendMessage("push to GitHub");
      } else if (action === "deploy") {
        sendMessage("פרסם את הפרויקט");
      } else if (action === "github-connect") {
        const text = "חבר לגיטהאב";
        setInput(text);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(text.length, text.length);
        }, 50);
      }
    };
    window.addEventListener("builder-header-action", handle);
    return () => window.removeEventListener("builder-header-action", handle);
  }, [sendMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      setIsReadingFiles(true);
      try {
        const newAttachments = await Promise.all(
          files.map(readFileAsAttachment),
        );
        setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
        trackAttachmentAdded(files.length);
      } catch (err) {
        console.error("Failed to read file:", err);
      } finally {
        setIsReadingFiles(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));
      if (!imageItems.length) return;
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter(Boolean) as File[];
      if (!files.length) return;
      setIsReadingFiles(true);
      try {
        const newAttachments = await Promise.all(
          files.map(readFileAsAttachment),
        );
        setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
        trackPasteSuccess(files.length);
      } catch (err) {
        console.error("Failed to paste image:", err);
      } finally {
        setIsReadingFiles(false);
      }
    },
    [],
  );

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    const text = input.trim();
    const atts = attachments.length > 0 ? [...attachments] : undefined;
    setInput("");
    setAttachments([]);

    const imgMatch =
      text.match(/^\/generate-image\s+(.+)$/i) ||
      text.match(
        /^(?:צור תמונה|generate image|create image|make image)\s+(.+)/i,
      );
    if (imgMatch) {
      const prompt = imgMatch[1].trim();
      if (isStreaming) {
        setMessageQueue((prev) => [...prev, { content: text }]);
      } else {
        setPendingMessage(`🎨 יוצר תמונה: ${prompt}`);
        sendMessage(text);
      }
      return;
    }

    if (isStreaming) {
      setMessageQueue((prev) => [
        ...prev,
        { content: text, attachments: atts },
      ]);
    } else {
      const displayText =
        text || (atts ? `[📎 ${atts.map((a) => a.name).join(", ")}]` : "");
      setPendingMessage(displayText);
      sendMessage(text || "נא לנתח את הקובץ המצורף", atts, agentFlowEnabled);
    }
  };

  const removeFromQueue = useCallback((idx: number) => {
    setMessageQueue((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleModeChange = async (mode: string) => {
    setCurrentMode(mode as "entrepreneur" | "builder" | "developer" | "maker");
    setShowModeSelector(false);
    setGrowWithMeSuggestion(null);
    await updateModeMutation.mutateAsync({
      id: project.id,
      data: {
        userMode: mode as "entrepreneur" | "builder" | "developer" | "maker",
      },
    });
  };

  const handleGrowAccept = () => {
    if (growWithMeSuggestion) handleModeChange(growWithMeSuggestion);
  };

  // Close library on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (libraryRef.current && !libraryRef.current.contains(e.target as Node))
        setShowLibrary(false);
      if (
        compLibraryRef.current &&
        !compLibraryRef.current.contains(e.target as Node)
      )
        setShowCompLibrary(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Auto-focus rename input
  useEffect(() => {
    if (isRenaming) setTimeout(() => renameInputRef.current?.select(), 30);
  }, [isRenaming]);

  const handleRenameSubmit = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === project.title) {
      setIsRenaming(false);
      return;
    }
    setIsRenaming(false);
    await updateProjectMutation.mutateAsync({
      id: project.id,
      data: { title: trimmed },
    });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
  }, [
    renameValue,
    project.title,
    project.id,
    updateProjectMutation,
    queryClient,
  ]);

  const handleSavePrompt = useCallback(() => {
    const txt = input.trim();
    if (!txt || savedPrompts.includes(txt)) return;
    const next = [txt, ...savedPrompts].slice(0, 20);
    setSavedPrompts(next);
    savePrompts(next);
  }, [input, savedPrompts]);

  const handleDeletePrompt = useCallback(
    (idx: number) => {
      const next = savedPrompts.filter((_, i) => i !== idx);
      setSavedPrompts(next);
      savePrompts(next);
    },
    [savedPrompts],
  );

  const handleChatExport = useCallback(() => {
    const lines: string[] = [
      `# ${project.title}`,
      `> ייוצא מבונה AI — ${new Date().toLocaleString("he-IL")}`,
      "",
    ];
    for (const msg of project.messages) {
      const role = msg.role === "user" ? "👤 **משתמש**" : "🤖 **AI**";
      lines.push(`## ${role}`);
      if (msg.role === "assistant") {
        const { text, code, lang } = extractCodeAndText(msg.content);
        if (text) lines.push(text);
        if (code && code !== "patch-applied") {
          const lineCount = code.split("\n").length;
          const langLabel = lang ? lang.toUpperCase() : "קוד";
          lines.push(
            `\n> ✅ **${langLabel} נוצר** (${lineCount} שורות) — מוצג בחלון התצוגה המקדימה`,
          );
        } else if (code === "patch-applied") {
          lines.push(`\n> ✅ **הקוד עודכן** — השינויים הוחלו על האתר`);
        }
      } else {
        lines.push(msg.content);
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/markdown; charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.title || "שיחה").replace(/\s+/g, "-")}-chat.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project.title, project.messages]);

  const handleEnhancePrompt = useCallback(async () => {
    if (!input.trim() || isEnhancing || isStreaming) return;
    setIsEnhancing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/enhance-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input.trim(), mode: currentMode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhanced) setInput(data.enhanced);
      }
    } catch {
      // silent fallback
    } finally {
      setIsEnhancing(false);
      inputRef.current?.focus();
    }
  }, [input, isEnhancing, isStreaming, project.id, currentMode]);

  const handleNextStepClick = useCallback(
    (text: string) => {
      clearNextStep();
      sendMessage(text);
    },
    [clearNextStep, sendMessage],
  );

  const isEmpty = project.messages.length === 0;
  const modeConfig =
    MODE_CONFIG[currentMode as keyof typeof MODE_CONFIG] ||
    MODE_CONFIG.entrepreneur;
  const growInfo = growWithMeSuggestion
    ? GROW_WITH_ME_MESSAGES[growWithMeSuggestion]
    : null;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] relative" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <ChatHeader
        projectTitle={project.title}
        isRenaming={isRenaming}
        renameValue={renameValue}
        onRenameValueChange={setRenameValue}
        onRenameSubmit={handleRenameSubmit}
        onRenameStart={() => {
          setRenameValue(project.title);
          setIsRenaming(true);
        }}
        onRenameCancel={() => setIsRenaming(false)}
        modeConfig={modeConfig}
        onOpenModeSelector={() => setShowModeSelector(true)}
        onExport={handleChatExport}
        hasMessages={project.messages.length > 0}
        renameInputRef={renameInputRef}
      />

      {/* Build progress bar — shown when conversation has started */}
      {project.messages.length > 0 && (
        <BuildProgressBar messageCount={project.messages.length} isRTL={isRTL} />
      )}

      {/* Grow With Me Banner — hidden while streaming to keep focus on conversation */}
      {!isStreaming && (
        <GrowWithMeBanner
          growInfo={growInfo}
          onAccept={handleGrowAccept}
          onDismiss={() => setGrowWithMeSuggestion(null)}
        />
      )}

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 scroll-smooth bg-[#0a0a0f]"
      >
        {/* Agent Mode active banner — hidden in entrepreneur mode */}
        {showAgentMode && !isStreaming && currentMode !== "entrepreneur" && (
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-violet-500/8 border border-violet-500/20 text-xs text-violet-300"
            style={{ fontFamily: HE }}
            dir="rtl"
          >
            <BotMessageSquare className="w-3.5 h-3.5 shrink-0 text-violet-400" />
            <div className="flex-1">
              <span className="font-semibold">מצב סוכן פעיל</span>
              <span className="text-violet-400/60 mr-1">
                — ההודעה הבאה תעבור דרך: תכנון ← ביצוע ← תיקון אוטומטי
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAgentMode(false)}
              className="text-violet-400/40 hover:text-violet-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !isStreaming ? (
          <QuickIdeasGrid
            modeConfig={modeConfig}
            onIdeaSelect={setInput}
            onIdeaSubmit={(prompt) => {
              setPendingMessage(prompt);
              sendMessage(prompt);
            }}
            maxIdeas={currentMode === "entrepreneur" ? 4 : 6}
            mode={currentMode}
          />
        ) : null}

        {/* Build Start Card — instant WOW moment during first generation */}
        <AnimatePresence>
          {firstBuildPrompt && (isStreaming || project.messages.length <= 2) && (
            <BuildStartCard
              key="build-start"
              prompt={firstBuildPrompt}
              isRTL={isRTL}
              isDone={!isStreaming && !!project.previewHtml}
            />
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {project.messages.map((msg, idx) => (
            <MessageBubble key={msg.id || `msg-${idx}`} message={msg} />
          ))}

          {/* Quick Reply — guided choices after first AI response */}
          {!isStreaming &&
            !pendingMessage &&
            project.messages.filter((m) => m.role === "user").length === 1 &&
            project.messages[project.messages.length - 1]?.role ===
              "assistant" && (
              <QuickReplyGroup
                key="quick-reply-first"
                groups={isRTL ? FIRST_RESPONSE_GROUPS_HE : FIRST_RESPONSE_GROUPS_EN}
                onSelect={(text) => {
                  setPendingMessage(text);
                  sendMessage(text);
                }}
                isRTL={isRTL}
              />
            )}

          {/* Entrepreneur plan card */}
          {entrepreneurPlan && (
            <EntrepreneurPlanCard
              key="entrepreneur-plan"
              plan={entrepreneurPlan as Record<string, unknown>}
              onClear={clearEntrepreneurPlan}
            />
          )}

          {/* Optimistic user message */}
          {pendingMessage && isStreaming && (
            <MessageBubble
              key="pending-user"
              message={{
                id: -1,
                role: "user",
                content: pendingMessage,
                createdAt: new Date().toISOString(),
                projectId: project.id,
              }}
            />
          )}

          {/* Trust card after generation */}
          {!isStreaming && lastChangeSummary && (
            <motion.div
              key="trust-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="max-w-sm"
            >
              <div className="relative">
                <TrustCard summary={lastChangeSummary} />
                <button
                  onClick={clearChangeSummary}
                  className="absolute top-2 left-2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors text-[10px]"
                  title="סגור"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}

          {/* Next-step momentum chip — appears after TrustCard */}
          {!isStreaming && nextStep && (
            <motion.div
              key="next-step-chip"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.22, delay: 0.15 }}
            >
              <button
                type="button"
                onClick={() => handleNextStepClick(nextStep)}
                className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] hover:bg-indigo-500/[0.12] hover:border-indigo-500/35 transition-all duration-200 text-right w-full max-w-xs"
                style={{ fontFamily: HE }}
                dir="rtl"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-indigo-400/60 font-medium mb-0.5">
                    הצעד הבא
                  </div>
                  <div className="text-[12px] text-indigo-200/90 font-semibold leading-snug truncate">
                    {nextStep}
                  </div>
                </div>
                <ArrowLeft className="w-3.5 h-3.5 text-indigo-400/50 group-hover:text-indigo-300 group-hover:translate-x-[-2px] transition-all shrink-0" />
              </button>
            </motion.div>
          )}

          {/* Streaming assistant bubble */}
          {isStreaming && (
            <StreamingBubble
              key="streaming"
              streamedText={streamedText}
              isGeneratingCode={isGeneratingCode}
              codeLines={codeLines}
              currentIntent={currentIntent}
              pipelineMessage={pipelineMessage}
              pipelineSteps={pipelineSteps}
              agentPhase={agentPhase}
              agentSteps={agentSteps}
              agentFixLog={agentFixLog}
              agentStepsCompleted={agentStepsCompleted}
            />
          )}
        </AnimatePresence>

        {/* Token cost badge — subtle, shown after each AI response */}
        {!isStreaming && lastMessageTokens && lastMessageTokens.output > 0 && (
          <div className={`flex ${isRTL ? "justify-end" : "justify-start"} px-4 pb-1`}>
            <TokenCostBadge
              inputTokens={lastMessageTokens.input}
              outputTokens={lastMessageTokens.output}
              isRTL={isRTL}
            />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={scrollAnchorRef} aria-hidden="true" />
      </div>

      {/* Stream Error Banner */}
      {streamError && (
        <div
          className="mx-4 mb-1 px-3.5 py-2.5 bg-red-500/8 border border-red-500/20 rounded-xl flex items-center gap-3"
          dir="rtl"
        >
          <span className="text-red-400/80 shrink-0 text-sm">⚠️</span>
          <p
            className="text-red-300/90 text-xs flex-1 leading-relaxed"
            style={{ fontFamily: HE }}
          >
            {streamError}
          </p>
          <button
            type="button"
            onClick={retryLastMessage}
            className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 transition-colors shrink-0 font-medium"
            style={{ fontFamily: HE }}
          >
            נסה שוב
          </button>
          <button
            type="button"
            onClick={clearStreamError}
            className="text-red-500/40 hover:text-red-400 transition-colors shrink-0"
            title="סגור"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <ChatInputBar
        input={input}
        setInput={setInput}
        attachments={attachments}
        removeAttachment={removeAttachment}
        messageQueue={messageQueue}
        removeFromQueue={removeFromQueue}
        suggestions={suggestions}
        clearSuggestions={clearSuggestions}
        isStreaming={isStreaming}
        projectId={project.id}
        projectPreviewHtml={project.previewHtml}
        projectMessagesCount={project.messages.length}
        modeConfig={modeConfig}
        currentMode={currentMode}
        handleFileSelect={handleFileSelect}
        handlePaste={handlePaste}
        handleSubmit={handleSubmit}
        handleKeyDown={handleKeyDown}
        stopStreaming={stopStreaming}
        sendMessage={sendMessage}
        isReadingFiles={isReadingFiles}
        isRecording={isRecording}
        toggleVoice={toggleVoice}
        isEnhancing={isEnhancing}
        handleEnhancePrompt={handleEnhancePrompt}
        savedPrompts={savedPrompts}
        setSavedPrompts={setSavedPrompts}
        showLibrary={showLibrary}
        setShowLibrary={setShowLibrary}
        handleSavePrompt={handleSavePrompt}
        handleDeletePrompt={handleDeletePrompt}
        showCompLibrary={showCompLibrary}
        setShowCompLibrary={setShowCompLibrary}
        compLibrarySearch={compLibrarySearch}
        setCompLibrarySearch={setCompLibrarySearch}
        showAgentMode={showAgentMode}
        setShowAgentMode={setShowAgentMode}
        currentTime={currentTime}
        fileInputRef={fileInputRef}
        inputRef={inputRef}
        libraryRef={libraryRef}
        compLibraryRef={compLibraryRef}
        savePrompts={savePrompts}
      />

      {/* Mode Selector Modal */}
      <AnimatePresence>
        {showModeSelector && (
          <ModeSelector
            currentMode={currentMode}
            onSelect={handleModeChange}
            onClose={() => setShowModeSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
