import { useDeferredValue } from "react";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { AgentProgressPanel } from "./AgentProgressPanel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const HE = "'Rubik', sans-serif";

interface PipelineStep {
  step: string;
  done?: boolean;
}

interface AgentStep {
  id: number;
  emoji: string;
  title: string;
  status: "pending" | "running" | "done";
}

interface FixLogEntry {
  fixed: boolean;
  issues: unknown[];
}

interface IntentInfo {
  emoji: string;
  label: string;
}

interface StreamingBubbleProps {
  streamedText: string;
  isGeneratingCode: boolean;
  codeLines: number;
  currentIntent: IntentInfo | null;
  pipelineMessage: string | null;
  pipelineSteps: PipelineStep[];
  agentPhase: string | null;
  agentSteps: AgentStep[];
  agentFixLog: FixLogEntry[];
  agentStepsCompleted: number | null;
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-indigo-400/60"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function StreamingBubble({
  streamedText,
  isGeneratingCode,
  codeLines,
  currentIntent,
  pipelineMessage,
  pipelineSteps,
  agentPhase,
  agentSteps,
  agentFixLog,
  agentStepsCompleted,
}: StreamingBubbleProps) {
  const deferredText = useDeferredValue(streamedText);
  const isThinking =
    !streamedText &&
    !isGeneratingCode &&
    !pipelineMessage &&
    !agentPhase &&
    agentSteps.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 max-w-[90%]"
      dir="rtl"
    >
      {/* Avatar — pulsing indigo dot while active */}
      <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1">
        <motion.div
          className="w-2 h-2 rounded-full bg-indigo-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="flex-1 overflow-hidden space-y-2.5">
        {/* Thinking state — elegant dots */}
        {isThinking && <ThinkingDots />}

        {/* Intent indicator — before text appears */}
        {currentIntent && !streamedText && !isGeneratingCode && (
          <div
            className="flex items-center gap-2 text-xs text-indigo-400/80"
            style={{ fontFamily: HE }}
            dir="rtl"
          >
            <span>{currentIntent.emoji}</span>
            <span>{currentIntent.label}</span>
            <motion.span
              className="w-1 h-1 rounded-full bg-indigo-400 inline-block"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        )}

        {/* Streaming text — renders markdown live */}
        {streamedText && (
          <div
            className="prose prose-invert max-w-none text-sm leading-[1.75] text-slate-300 overflow-hidden
              prose-p:my-1.5 prose-p:text-slate-300
              prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
              prose-strong:text-slate-100 prose-strong:font-semibold
              prose-li:text-slate-300 prose-li:my-0.5
              prose-ul:my-2 prose-ol:my-2
              prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.8em] prose-code:font-mono prose-code:border-none
              prose-pre:bg-[#111118] prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-xl
              [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            dir="auto"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {deferredText}
            </ReactMarkdown>
            {!isGeneratingCode && (
              <motion.span
                className="inline-block w-[2px] h-[1em] bg-indigo-400/70 rounded-sm align-text-bottom ml-0.5"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
        )}

        {/* Code generation progress */}
        {isGeneratingCode && (
          <div className="flex flex-col gap-1.5 w-full max-w-xs">
            <div className="h-0.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                initial={{ width: "0%", x: "-100%" }}
                animate={{ width: "60%", x: "200%" }}
                transition={{
                  duration: 1.8,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
              />
            </div>
            <div className="flex items-center justify-between px-0.5">
              <span
                className="text-[10px] text-indigo-400/70"
                style={{ fontFamily: HE }}
              >
                {currentIntent?.emoji} {currentIntent?.label || "כותב קוד"}
              </span>
              <span
                className="text-[10px] text-slate-600 tabular-nums"
                style={{ fontFamily: HE }}
              >
                {codeLines} שורות
              </span>
            </div>
          </div>
        )}

        {/* Pipeline status */}
        {pipelineMessage && !agentPhase && (
          <div className="space-y-1.5 pb-1">
            <div
              className="flex items-center gap-2 text-[11px] text-amber-400/70"
              style={{ fontFamily: HE }}
            >
              <motion.span
                className="w-1 h-1 rounded-full bg-amber-400 inline-block shrink-0"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              {pipelineMessage}
            </div>
            {pipelineSteps.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { key: "architecture", label: "ארכיטקטורה", emoji: "🏗️" },
                  { key: "ui", label: "עיצוב", emoji: "🎨" },
                  { key: "security", label: "אבטחה", emoji: "🔒" },
                  { key: "performance", label: "ביצועים", emoji: "⚡" },
                ].map(({ key, label, emoji }) => {
                  const done = pipelineSteps.find((s) => s.step === key);
                  return (
                    <span
                      key={key}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        done
                          ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
                          : "border-white/[0.06] bg-white/[0.02] text-slate-600"
                      }`}
                      style={{ fontFamily: HE }}
                    >
                      {done && (
                        <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />
                      )}
                      {emoji} {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Agent Flow Progress */}
        <AgentProgressPanel
          agentPhase={agentPhase}
          agentSteps={agentSteps}
          agentFixLog={agentFixLog}
          agentStepsCompleted={agentStepsCompleted}
        />
      </div>
    </motion.div>
  );
}
