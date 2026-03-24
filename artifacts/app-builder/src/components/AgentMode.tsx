import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Play,
  Square,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Zap,
  Wrench,
  Rocket,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface AgentStep {
  id: number;
  emoji: string;
  title: string;
  status: "pending" | "running" | "done" | "error";
  streamText?: string;
}

interface AgentEvent {
  type: string;
  steps?: Array<{ id: number; emoji: string; title: string }>;
  stepId?: number;
  title?: string;
  text?: string;
  iteration?: number;
  fixed?: boolean;
  issues?: string[];
  stepsCompleted?: number;
  url?: string;
  message?: string;
  agentType?: string;
  agentName?: string;
  agentEmoji?: string;
}

interface ActiveAgent {
  type: string;
  name: string;
  emoji: string;
}

interface AgentModeProps {
  projectId: number;
  hasExistingCode: boolean;
  onDone: () => void;
}

export function AgentMode({
  projectId,
  hasExistingCode,
  onDone,
}: AgentModeProps) {
  const [task, setTask] = useState("");
  const [autoFix, setAutoFix] = useState(true);
  const [autoDeploy, setAutoDeploy] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<
    | "idle"
    | "planning"
    | "executing"
    | "fixing"
    | "deploying"
    | "done"
    | "error"
  >("idle");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [fixLog, setFixLog] = useState<
    Array<{ iteration: number; fixed: boolean; issues: string[] }>
  >([]);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showStreamOf, setShowStreamOf] = useState<number | null>(null);
  const [doneStats, setDoneStats] = useState<{ stepsCompleted: number } | null>(
    null,
  );
  const [activeAgent, setActiveAgent] = useState<ActiveAgent | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (!task.trim() || isRunning) return;
    setIsRunning(true);
    setPhase("planning");
    setSteps([]);
    setFixLog([]);
    setDeployUrl(null);
    setErrorMsg(null);
    setDoneStats(null);

    abortRef.current = new AbortController();

    try {
      const resp = await fetch(`/api/projects/${projectId}/agent-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.trim(), autoFix, autoDeploy }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to start agent");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev: AgentEvent = JSON.parse(line.slice(6));

            if (ev.type === "agent_selected" && ev.agentName) {
              setActiveAgent({
                type: ev.agentType ?? "frontend",
                name: ev.agentName,
                emoji: ev.agentEmoji ?? "🤖",
              });
            } else if (ev.type === "planning") {
              setPhase("planning");
            } else if (ev.type === "plan" && ev.steps) {
              setPhase("executing");
              setSteps(ev.steps.map((s) => ({ ...s, status: "pending" })));
            } else if (ev.type === "step_start" && ev.stepId != null) {
              setPhase("executing");
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === ev.stepId
                    ? { ...s, status: "running", streamText: "" }
                    : s,
                ),
              );
            } else if (
              ev.type === "step_stream" &&
              ev.stepId != null &&
              ev.text
            ) {
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === ev.stepId
                    ? { ...s, streamText: (s.streamText || "") + ev.text }
                    : s,
                ),
              );
            } else if (ev.type === "step_done" && ev.stepId != null) {
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === ev.stepId ? { ...s, status: "done" } : s,
                ),
              );
            } else if (ev.type === "fix_start") {
              setPhase("fixing");
            } else if (ev.type === "fix_done" && ev.iteration != null) {
              setFixLog((prev) => [
                ...prev,
                {
                  iteration: ev.iteration!,
                  fixed: ev.fixed ?? false,
                  issues: ev.issues ?? [],
                },
              ]);
            } else if (ev.type === "deploy_start") {
              setPhase("deploying");
            } else if (ev.type === "deploy_done" && ev.url) {
              setDeployUrl(ev.url);
            } else if (ev.type === "done") {
              setPhase("done");
              setDoneStats({
                stepsCompleted: ev.stepsCompleted ?? steps.length,
              });
              onDone();
            } else if (ev.type === "error") {
              setPhase("error");
              setErrorMsg(ev.message ?? "שגיאה לא ידועה");
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setPhase("error");
        setErrorMsg(err.message);
      }
    } finally {
      setIsRunning(false);
    }
  }, [task, autoFix, autoDeploy, projectId, isRunning, steps.length, onDone]);

  const stop = () => {
    abortRef.current?.abort();
    setIsRunning(false);
    setPhase("idle");
  };

  const reset = () => {
    setPhase("idle");
    setSteps([]);
    setFixLog([]);
    setDeployUrl(null);
    setErrorMsg(null);
    setDoneStats(null);
    setActiveAgent(null);
  };

  const phaseLabel: Record<string, string> = {
    idle: "",
    planning: "מתכנן שלבים...",
    executing: "מבצע...",
    fixing: "בודק ומתקן שגיאות...",
    deploying: "מעלה לענן...",
    done: "הושלם!",
    error: "שגיאה",
  };

  return (
    <div
      className="flex flex-col h-full p-4 gap-4 overflow-y-auto"
      dir="rtl"
      style={{ fontFamily: HE }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">סוכן אוטונומי</p>
          <p className="text-[11px] text-muted-foreground">
            מתכנן → מבצע → מתקן → (מעלה לענן)
          </p>
        </div>
      </div>

      {/* Task Input — only in idle/done/error */}
      {(phase === "idle" || phase === "done" || phase === "error") && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              מה הסוכן יבנה / ישפר?
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={
                hasExistingCode
                  ? "לדוגמה: הוסף אנימציות לכל הכפתורים, שפר את הדיזיין למובייל, וצרף טופס פניה"
                  : "לדוגמה: בנה לי אתר landing page מרשים למסעדה איטלקית עם תפריט, גלריה, וטופס הזמנה"
              }
              className="w-full h-28 bg-muted/30 border border-border/60 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) run();
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Cmd+Enter להרצה
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              אפשרויות
            </label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setAutoFix(!autoFix)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition-all text-right",
                  autoFix
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-muted/30 border-border/50 text-muted-foreground",
                )}
              >
                <Wrench className="w-3.5 h-3.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-xs">תיקון אוטומטי</div>
                  <div className="text-[10px] opacity-70">
                    הסוכן יבדוק ויתקן שגיאות לאחר הבנייה
                  </div>
                </div>
                <div
                  className={cn(
                    "w-8 h-4 rounded-full relative transition-colors",
                    autoFix ? "bg-green-500" : "bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all",
                      autoFix ? "right-0.5" : "left-0.5",
                    )}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAutoDeploy(!autoDeploy);
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition-all text-right",
                  autoDeploy
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                    : "bg-muted/30 border-border/50 text-muted-foreground",
                )}
              >
                <Rocket className="w-3.5 h-3.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-xs">
                    העלאה לנטליפיי בסיום
                  </div>
                  <div className="text-[10px] opacity-70">
                    דורש Netlify Personal Access Token
                  </div>
                </div>
                <div
                  className={cn(
                    "w-8 h-4 rounded-full relative transition-colors",
                    autoDeploy ? "bg-cyan-500" : "bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all",
                      autoDeploy ? "right-0.5" : "left-0.5",
                    )}
                  />
                </div>
              </button>

              <p className="text-[10px] text-muted-foreground px-1">
                Netlify יחובר אוטומטית דרך ה-Integrations המחוברות
              </p>
            </div>
          </div>

          {/* Run button */}
          <button
            type="button"
            onClick={run}
            disabled={!task.trim()}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <Play className="w-4 h-4" />
            הרץ סוכן
          </button>
        </motion.div>
      )}

      {/* Running / Progress View */}
      {(phase === "planning" ||
        phase === "executing" ||
        phase === "fixing" ||
        phase === "deploying") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Phase indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-semibold text-primary">
                {phaseLabel[phase]}
              </span>
            </div>
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
            >
              <Square className="w-3 h-3" />
              עצור
            </button>
          </div>

          {/* Active Agent Badge */}
          {activeAgent && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/8 border border-primary/20">
              <span className="text-base leading-none">
                {activeAgent.emoji}
              </span>
              <div>
                <p className="text-xs font-semibold text-primary">
                  סוכן {activeAgent.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  פועל על המשימה שלך
                </p>
              </div>
            </div>
          )}

          {/* Task reminder */}
          <div className="bg-muted/30 border border-border/50 rounded-xl px-3 py-2 text-xs text-muted-foreground line-clamp-2">
            🎯 {task}
          </div>

          {/* Steps */}
          {steps.length > 0 && (
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 transition-all",
                    step.status === "running"
                      ? "bg-primary/5 border-primary/30"
                      : step.status === "done"
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-muted/20 border-border/40 opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {step.status === "running" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                    )}
                    {step.status === "done" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    )}
                    {step.status === "pending" && (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <span className="text-sm font-medium flex-1">
                      {step.emoji} {step.title}
                    </span>
                    {step.status === "running" && step.streamText && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowStreamOf(
                            showStreamOf === step.id ? null : step.id,
                          )
                        }
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showStreamOf === step.id ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {step.status === "running" &&
                      showStreamOf === step.id &&
                      step.streamText && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-2 overflow-hidden"
                        >
                          <pre
                            className="text-[10px] text-muted-foreground bg-black/20 rounded-lg p-2 overflow-x-auto max-h-32 overflow-y-auto font-mono text-left"
                            dir="ltr"
                          >
                            {step.streamText.slice(-500)}
                          </pre>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}

          {/* Planning spinner */}
          {phase === "planning" && steps.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">
                הסוכן מתכנן את השלבים...
              </p>
            </div>
          )}

          {/* Fix log */}
          {fixLog.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                תיקונים אוטומטיים
              </p>
              {fixLog.map((f, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 text-xs px-2.5 py-2 rounded-lg",
                    f.fixed
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-green-500/10 text-green-400",
                  )}
                >
                  {f.fixed ? (
                    <Wrench className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">
                      איטרציה {f.iteration}:{" "}
                      {f.fixed
                        ? `תוקנו ${f.issues.length} בעיות`
                        : "לא נמצאו בעיות"}
                    </p>
                    {f.fixed &&
                      f.issues.slice(0, 3).map((iss, j) => (
                        <p key={j} className="opacity-70 text-[10px] mt-0.5">
                          • {iss}
                        </p>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deploy status */}
          {phase === "deploying" && (
            <div className="flex items-center gap-2 text-sm text-cyan-400 bg-cyan-500/10 px-3 py-2 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              מעלה לנטליפיי...
            </div>
          )}
        </motion.div>
      )}

      {/* Done state */}
      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <p className="font-bold text-green-400">הסוכן סיים!</p>
              {doneStats && (
                <p className="text-xs text-muted-foreground">
                  {doneStats.stepsCompleted} שלבים ·{" "}
                  {fixLog.filter((f) => f.fixed).length} תיקונים
                </p>
              )}
              {deployUrl && (
                <a
                  href={deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-cyan-400 hover:underline"
                >
                  <Rocket className="w-3 h-3" />
                  {deployUrl}
                </a>
              )}
            </div>

            {/* Fix log summary */}
            {fixLog.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> תיקונים שבוצעו
                </p>
                {fixLog.map((f, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-lg",
                      f.fixed
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-green-500/10 text-green-400",
                    )}
                  >
                    {f.fixed
                      ? `✓ תוקנו ${f.issues.length} בעיות`
                      : "✓ הקוד תקין"}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={reset}
              className="w-full py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              משימה חדשה
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {phase === "error" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">שגיאה</p>
              <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full py-2.5 rounded-xl border border-border/60 text-sm hover:bg-muted/30 transition-all"
          >
            נסה שוב
          </button>
        </motion.div>
      )}

      {/* How it works */}
      {phase === "idle" && (
        <div className="mt-auto border border-border/40 rounded-xl p-3 bg-muted/10">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground">
              איך זה עובד?
            </span>
          </div>
          <div className="space-y-1.5">
            {[
              { icon: "🧠", text: "מתכנן את המשימה לשלבים" },
              { icon: "⚡", text: "מבצע כל שלב עם Claude Sonnet" },
              { icon: "🔍", text: "בודק ומתקן שגיאות אוטומטית" },
              { icon: "🚀", text: "מעלה לנטליפיי (אופציונלי)" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[11px] text-muted-foreground"
              >
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
