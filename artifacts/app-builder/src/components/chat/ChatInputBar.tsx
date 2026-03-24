import { useRef } from "react";
import {
  Send,
  StopCircle,
  Sparkles,
  Wand2,
  Paperclip,
  X,
  BookmarkPlus,
  BookOpen,
  Layers,
  Zap,
  BotMessageSquare,
  Mic,
  MicOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AttachmentIcon,
  formatFileSize,
  ACCEPTED_FILE_TYPES,
} from "@/lib/file-utils";
import { COMPONENT_LIBRARY } from "@/data/component-library";
import { readCapabilities } from "@/hooks/use-integrations";
import type { Attachment, ChatSuggestion } from "@/hooks/use-chat-stream";

const HE = "'Rubik', sans-serif";

interface ModeConfig {
  placeholder: string;
}

interface QueueItem {
  content: string;
  attachments?: Attachment[];
}

interface ChatInputBarProps {
  input: string;
  setInput: (val: string) => void;
  attachments: Attachment[];
  removeAttachment: (idx: number) => void;
  messageQueue: QueueItem[];
  removeFromQueue: (idx: number) => void;
  suggestions: ChatSuggestion[];
  clearSuggestions: () => void;
  isStreaming: boolean;
  projectId: number;
  projectPreviewHtml: string | null | undefined;
  projectMessagesCount: number;
  modeConfig: ModeConfig;
  currentMode: string;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  stopStreaming: () => void;
  sendMessage: (text: string) => void;
  isReadingFiles: boolean;
  isRecording: boolean;
  toggleVoice: () => void;
  isEnhancing: boolean;
  handleEnhancePrompt: () => void;
  savedPrompts: string[];
  setSavedPrompts: (prompts: string[]) => void;
  showLibrary: boolean;
  setShowLibrary: (val: boolean) => void;
  handleSavePrompt: () => void;
  handleDeletePrompt: (idx: number) => void;
  showCompLibrary: boolean;
  setShowCompLibrary: (val: (prev: boolean) => boolean) => void;
  compLibrarySearch: string;
  setCompLibrarySearch: (val: string) => void;
  showAgentMode: boolean;
  setShowAgentMode: (val: (prev: boolean) => boolean) => void;
  currentTime: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  libraryRef: React.RefObject<HTMLDivElement | null>;
  compLibraryRef: React.RefObject<HTMLDivElement | null>;
  savePrompts: (prompts: string[]) => void;
}

export function ChatInputBar({
  input,
  setInput,
  attachments,
  removeAttachment,
  messageQueue,
  removeFromQueue,
  suggestions,
  clearSuggestions,
  isStreaming,
  projectId,
  projectPreviewHtml,
  projectMessagesCount,
  modeConfig,
  currentMode,
  handleFileSelect,
  handlePaste,
  handleSubmit,
  handleKeyDown,
  stopStreaming,
  sendMessage,
  isReadingFiles,
  isRecording,
  toggleVoice,
  isEnhancing,
  handleEnhancePrompt,
  savedPrompts,
  setSavedPrompts,
  showLibrary,
  setShowLibrary,
  handleSavePrompt,
  handleDeletePrompt,
  showCompLibrary,
  setShowCompLibrary,
  compLibrarySearch,
  setCompLibrarySearch,
  showAgentMode,
  setShowAgentMode,
  currentTime,
  fileInputRef,
  inputRef,
  libraryRef,
  compLibraryRef,
  savePrompts,
}: ChatInputBarProps) {
  const isEntrepreneur = currentMode === "entrepreneur";

  const sendBtnActiveClass =
    currentMode === "developer"
      ? "bg-violet-500 hover:bg-violet-400 shadow-violet-500/30"
      : currentMode === "maker"
        ? "bg-amber-500 hover:bg-amber-400 shadow-amber-500/30"
        : "bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/30";

  return (
    <div className="px-4 pb-4 pt-2 shrink-0 border-t border-white/[0.04]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Attachment preview chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-w-4xl mx-auto" dir="rtl">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 text-xs max-w-[200px] group"
            >
              {att.preview ? (
                <img
                  src={att.preview}
                  alt={att.name}
                  className="w-6 h-6 object-cover rounded-md shrink-0"
                />
              ) : (
                <span className="text-primary shrink-0">
                  <AttachmentIcon type={att.type} />
                </span>
              )}
              <span
                className="text-foreground font-medium truncate"
                title={att.name}
              >
                {att.name}
              </span>
              <span className="text-muted-foreground shrink-0">
                {formatFileSize(att.size)}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Queue indicator */}
      {messageQueue.length > 0 && (
        <div className="max-w-4xl mx-auto mb-2 space-y-1" dir="rtl">
          <p
            className="text-[10px] text-muted-foreground px-1 flex items-center gap-1"
            style={{ fontFamily: HE }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {messageQueue.length}{" "}
            {messageQueue.length === 1 ? "הודעה" : "הודעות"} בתור — יישלחו אחת
            אחרי השנייה
          </p>
          {messageQueue.map((qm, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5 text-xs"
            >
              <span className="text-amber-400 shrink-0 font-bold tabular-nums">
                #{idx + 1}
              </span>
              <span
                className="text-foreground/70 flex-1 truncate"
                style={{ fontFamily: HE }}
              >
                {qm.content ||
                  (qm.attachments
                    ? `📎 ${qm.attachments.map((a) => a.name).join(", ")}`
                    : "")}
              </span>
              <button
                type="button"
                onClick={() => removeFromQueue(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="הסר מהתור"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Helper Surface — one at a time, priority: suggestions > action chips ── */}

      {/* Contextual Suggestion Cards (highest priority) */}
      {!isStreaming && suggestions.length > 0 && (
        <div className="max-w-4xl mx-auto mb-3 flex flex-wrap gap-2" dir="rtl">
          {suggestions.map((s: ChatSuggestion) => (
            <button
              key={s.type}
              type="button"
              onClick={() => {
                if (
                  s.action === "open_database" ||
                  s.action === "open_secrets" ||
                  s.action === "open_deploy"
                ) {
                  setInput(
                    s.action === "open_deploy"
                      ? "פרסם את הפרויקט"
                      : s.action === "open_database"
                        ? "הוסף מסד נתונים לפרויקט"
                        : "הוסף secrets לפרויקט",
                  );
                }
                clearSuggestions();
              }}
              className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-white/[0.07] bg-[#13131c] hover:border-indigo-500/25 hover:bg-indigo-500/5 transition-all text-right max-w-xs group"
              style={{ fontFamily: HE }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-300">
                  {s.title}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  {s.desc}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSuggestions();
                }}
                className="text-slate-600 hover:text-slate-300 shrink-0 mt-0.5 transition-colors"
                title="סגור"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Action chips — only shown when no active suggestions, hidden in entrepreneur mode */}
      {!isEntrepreneur &&
        !isStreaming &&
        suggestions.length === 0 &&
        projectPreviewHtml && (
          <div
            className="max-w-4xl mx-auto mb-2 flex flex-wrap gap-1.5 items-center"
            dir="rtl"
          >
            {[
              {
                label: "🔧 תקן שגיאות",
                prompt:
                  "תקן את כל השגיאות בקוד. אל תשנה שום דבר אחר — רק תקן את הבעיות.",
              },
              {
                label: "📱 שפר מובייל",
                prompt: "שפר את ההתאמה למובייל. שמור על כל התוכן הקיים.",
              },
              {
                label: "⚡ שפר ביצועים",
                prompt:
                  "שפר את מהירות הטעינה והביצועים. שמור על כל התוכן הקיים.",
              },
              {
                label: "🎨 רענן עיצוב",
                prompt:
                  "רענן את העיצוב — שפר צבעים, ריווח, ואנימציות. שמור על כל המבנה והתוכן הקיים.",
              },
              {
                label: "✏️ תקן טקסט",
                prompt:
                  "בדוק ותקן את כל הטקסטים — שגיאות כתיב, ניסוח, ועקביות. שמור על כל שאר הקוד.",
              },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setInput(chip.prompt)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.07] hover:border-white/[0.10] transition-all"
                style={{ fontFamily: HE }}
              >
                {chip.label}
              </button>
            ))}
            {projectMessagesCount > 2 && (
              <>
                <div className="w-px h-3 bg-white/[0.06] mx-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    const caps = readCapabilities();
                    setInput(caps.github ? "" : "סנכרן ל-GitHub");
                    if (caps.github) sendMessage("push to GitHub");
                  }}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.07] hover:border-white/[0.10] transition-all"
                  style={{ fontFamily: HE }}
                >
                  GitHub ↗
                </button>
                <button
                  type="button"
                  onClick={() => sendMessage("פרסם את הפרויקט")}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.07] hover:border-white/[0.10] transition-all"
                  style={{ fontFamily: HE }}
                >
                  פרסם ↗
                </button>
              </>
            )}
          </div>
        )}

      <form
        onSubmit={handleSubmit}
        className="relative max-w-4xl mx-auto flex items-end gap-2 bg-[#0d0d14] border border-white/[0.07] rounded-2xl p-2.5"
        dir="rtl"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Auto-resize: expand with content, cap at 200px
            const el = e.target;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 200) + "px";
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            isStreaming
              ? "הוסף לתור — תישלח אחרי שהתשובה הנוכחית תסתיים..."
              : attachments.length > 0
                ? "שאל שאלה על הקבצים המצורפים..."
                : modeConfig.placeholder
          }
          className="flex-1 max-h-[200px] min-h-[48px] bg-transparent border-none px-3 py-2.5 focus:outline-none text-slate-200 placeholder:text-slate-600 scrollbar-hide text-right resize-none"
          rows={1}
          style={{ fontFamily: HE, fontSize: "16px" }}
        />

        <div className="flex items-center gap-1.5 shrink-0 mb-1">
          {/* Stop streaming */}
          {isStreaming && (
            <button
              type="button"
              onClick={stopStreaming}
              className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              title="עצור יצירה"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          )}

          {/* Component Library — hidden in entrepreneur mode */}
          {!isEntrepreneur && !isStreaming && (
            <div className="relative" ref={compLibraryRef}>
              <button
                type="button"
                onClick={() => {
                  setShowCompLibrary((v) => !v);
                  setCompLibrarySearch("");
                  setShowLibrary(false);
                }}
                title="ספריית קומפוננטים"
                className={cn(
                  "p-2 rounded-xl transition-all",
                  showCompLibrary
                    ? "text-cyan-400 bg-cyan-400/10"
                    : "text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10",
                )}
              >
                <Layers className="w-4 h-4" />
              </button>
              {showCompLibrary && (
                <div
                  className="absolute bottom-full mb-2 left-0 w-[320px] bg-[#16161f] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 z-50 flex flex-col"
                  dir="rtl"
                  style={{ maxHeight: "55vh" }}
                >
                  <div className="px-3 pt-3 pb-2 border-b border-white/[0.06] shrink-0">
                    <p
                      className="text-xs font-bold text-slate-200 mb-2"
                      style={{ fontFamily: HE }}
                    >
                      🧩 ספריית קומפוננטים
                    </p>
                    <input
                      value={compLibrarySearch}
                      onChange={(e) => setCompLibrarySearch(e.target.value)}
                      placeholder="חפש..."
                      className="w-full bg-[#0a0a0f] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50"
                      style={{ fontFamily: HE }}
                      dir="rtl"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {COMPONENT_LIBRARY.map((cat) => {
                      const filtered = cat.items.filter(
                        (item) =>
                          !compLibrarySearch ||
                          item.name.includes(compLibrarySearch) ||
                          item.desc.includes(compLibrarySearch),
                      );
                      if (filtered.length === 0) return null;
                      return (
                        <div key={cat.category}>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.04]">
                            <span className="text-sm">{cat.icon}</span>
                            <span
                              className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                              style={{ fontFamily: HE }}
                            >
                              {cat.category}
                            </span>
                          </div>
                          {filtered.map((item) => (
                            <button
                              key={item.name}
                              onClick={() => {
                                setInput(item.prompt);
                                setShowCompLibrary(() => false);
                                inputRef.current?.focus();
                              }}
                              className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-white/[0.04] border-b border-white/[0.02] last:border-0 text-right transition-colors group"
                            >
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400"
                                  style={{ fontFamily: HE }}
                                >
                                  {item.name}
                                </p>
                                <p
                                  className="text-[10px] text-slate-500 mt-0.5 leading-relaxed"
                                  style={{ fontFamily: HE }}
                                >
                                  {item.desc}
                                </p>
                              </div>
                              <Zap className="w-3 h-3 text-indigo-500/50 group-hover:text-indigo-400 shrink-0 mt-0.5" />
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prompt Library — hidden in entrepreneur mode */}
          {!isEntrepreneur && !isStreaming && (
            <div className="relative" ref={libraryRef}>
              <button
                type="button"
                onClick={() => {
                  setShowLibrary(!showLibrary);
                  setShowCompLibrary(() => false);
                }}
                title="ספריית פרומפטים שמורים"
                className={cn(
                  "p-2 rounded-xl transition-all relative",
                  showLibrary || savedPrompts.length > 0
                    ? "text-amber-400 hover:bg-amber-400/10"
                    : "text-slate-500 hover:text-amber-400 hover:bg-amber-400/10",
                )}
              >
                <BookOpen className="w-4 h-4" />
                {savedPrompts.length > 0 && !showLibrary && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
              {showLibrary && (
                <div
                  className="absolute bottom-full mb-2 left-0 w-72 bg-[#16161f] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 z-50"
                  dir="rtl"
                >
                  <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                    <span
                      className="text-xs font-semibold text-slate-200"
                      style={{ fontFamily: HE }}
                    >
                      פרומפטים שמורים ({savedPrompts.length}/20)
                    </span>
                    {savedPrompts.length > 0 && (
                      <button
                        onClick={() => {
                          setSavedPrompts([]);
                          savePrompts([]);
                        }}
                        className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                        style={{ fontFamily: HE }}
                      >
                        נקה
                      </button>
                    )}
                  </div>
                  {savedPrompts.length === 0 ? (
                    <div className="p-5 text-center">
                      <BookmarkPlus className="w-6 h-6 mx-auto mb-2 text-slate-500/30" />
                      <p
                        className="text-xs text-slate-500 leading-relaxed"
                        style={{ fontFamily: HE }}
                      >
                        אין פרומפטים שמורים.
                        <br />
                        לחץ 📌 לשמור פרומפט.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto">
                      {savedPrompts.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 px-3 py-2.5 hover:bg-white/[0.04] border-b border-white/[0.02] last:border-0 group"
                        >
                          <button
                            onClick={() => {
                              setInput(p);
                              setShowLibrary(false);
                              inputRef.current?.focus();
                            }}
                            className="flex-1 text-right text-xs text-slate-300 hover:text-slate-100 leading-relaxed"
                            style={{ fontFamily: HE }}
                          >
                            <span className="line-clamp-2">{p}</span>
                          </button>
                          <button
                            onClick={() => handleDeletePrompt(i)}
                            className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Voice Input — hidden in entrepreneur mode */}
          {!isEntrepreneur && (
            <button
              type="button"
              onClick={toggleVoice}
              title={isRecording ? "עצור הקלטה" : "הקלטה קולית (עברית)"}
              className={cn(
                "p-2 rounded-xl transition-all",
                isRecording
                  ? "text-red-400 bg-red-400/15 hover:bg-red-400/25 animate-pulse"
                  : "text-slate-400/50 hover:text-indigo-400 hover:bg-indigo-500/10",
              )}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}

          {/* File attachment */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadingFiles || attachments.length >= 5}
            title="צרף קובץ"
            className={cn(
              "p-2 rounded-xl transition-all disabled:opacity-40",
              attachments.length > 0
                ? "text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
                : "text-slate-400/50 hover:text-indigo-400 hover:bg-indigo-500/10",
            )}
          >
            {isReadingFiles ? (
              <Sparkles className="w-4 h-4 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>

          {/* Save to prompt library — hidden in entrepreneur mode */}
          {!isEntrepreneur &&
            !isStreaming &&
            (input?.trim()?.length ?? 0) > 3 && (
              <button
                type="button"
                onClick={handleSavePrompt}
                title="שמור פרומפט"
                className={cn(
                  "p-2 rounded-xl transition-all",
                  savedPrompts.includes(input.trim())
                    ? "text-amber-400 bg-amber-400/10"
                    : "text-slate-500 hover:text-amber-400 hover:bg-amber-400/10",
                )}
              >
                <BookmarkPlus className="w-4 h-4" />
              </button>
            )}

          {/* Prompt Enhancer — hidden in entrepreneur mode */}
          {!isEntrepreneur &&
            !isStreaming &&
            (input?.trim()?.length ?? 0) > 3 && (
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                title="שפר עם AI"
                className="p-2 rounded-xl text-slate-400/50 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all disabled:opacity-50"
              >
                {isEnhancing ? (
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
              </button>
            )}

          {/* Send / Queue button — primary CTA, mode-tinted */}
          <button
            type="submit"
            disabled={!input.trim() && attachments.length === 0}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg",
              isStreaming
                ? "bg-amber-500/90 text-white hover:bg-amber-500 shadow-amber-500/20 disabled:opacity-40"
                : `${sendBtnActiveClass} text-white disabled:opacity-30 disabled:shadow-none`,
            )}
            title={
              isStreaming
                ? `הוסף לתור (${messageQueue.length + 1})`
                : "שלח (Enter)"
            }
          >
            {isStreaming ? (
              <span className="relative">
                <Send className="w-4 h-4" />
                {messageQueue.length > 0 && (
                  <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-white text-amber-600 text-[9px] font-bold flex items-center justify-center">
                    {messageQueue.length + 1}
                  </span>
                )}
              </span>
            ) : (
              <Send className="w-[15px] h-[15px]" />
            )}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between mt-2 px-1">
        <span
          className="text-[10px] text-muted-foreground/35 tracking-wide leading-relaxed"
          style={{ fontFamily: HE }}
        >
          {isEntrepreneur
            ? "תארו מה אתם רוצים לבנות — הכל קורה דרך הצ'אט"
            : "Enter לשלוח · Shift+Enter שורה חדשה"}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {/* Agent mode toggle — hidden in entrepreneur mode */}
          {!isEntrepreneur && (
            <button
              type="button"
              onClick={() => setShowAgentMode((v) => !v)}
              title={
                showAgentMode
                  ? "מצב סוכן פעיל — הצ'אט בונה שלב אחר שלב. לחץ לביטול"
                  : "הפעל מצב סוכן — תכנון, ביצוע ותיקון אוטומטי בצ'אט"
              }
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all",
                showAgentMode
                  ? "border-violet-500/60 text-violet-300 bg-violet-500/15 shadow-sm shadow-violet-500/20 ring-1 ring-violet-500/20"
                  : "border-violet-500/30 text-violet-400/80 hover:text-violet-300 hover:border-violet-500/60 hover:bg-violet-500/10",
              )}
              style={{ fontFamily: HE }}
            >
              {showAgentMode ? (
                <>
                  <BotMessageSquare className="w-3 h-3" />
                  <span>סוכן פעיל</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                </>
              ) : (
                <>
                  <BotMessageSquare className="w-3 h-3" />
                  <span>סוכן אוטונומי</span>
                </>
              )}
            </button>
          )}
          <span
            className="text-[11px] text-muted-foreground/40 tabular-nums font-mono"
            title="שעה נוכחית"
          >
            {currentTime}
          </span>
        </div>
      </div>
    </div>
  );
}
