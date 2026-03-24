import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Play,
  Square,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface AgentSummary {
  agentId: string;
  agentName: string;
  emoji: string;
  summary: string;
  durationMs: number;
}

interface ArchitecturePlan {
  summary: string;
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    hosting: string;
    auth: string;
  };
  estimatedComplexity: string;
  keyComponents: string[];
}

interface OrchestratorEvent {
  type: string;
  agentId?: string;
  agentName?: string;
  emoji?: string;
  durationMs?: number;
  summary?: string;
  totalDurationMs?: number;
  agentCount?: number;
  architecturePlan?: ArchitecturePlan;
  agentSummaries?: AgentSummary[];
  unifiedBuildDirective?: string;
  message?: string;
}

interface ActiveAgentState {
  agentId: string;
  agentName: string;
  emoji: string;
}

const AGENT_ORDER = ["architect", "frontend", "backend", "devops", "qa"];
const AGENT_LABELS: Record<string, string> = {
  architect: "ארכיטקט",
  frontend: "צד לקוח",
  backend: "צד שרת",
  devops: "פריסה",
  qa: "בקרת איכות",
};

interface OrchestratorPanelProps {
  projectId: number;
}

export function OrchestratorPanel({ projectId }: OrchestratorPanelProps) {
  const [idea, setIdea] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );

  const [completedAgents, setCompletedAgents] = useState<AgentSummary[]>([]);
  const [activeAgent, setActiveAgent] = useState<ActiveAgentState | null>(null);
  const [result, setResult] = useState<{
    architecturePlan: ArchitecturePlan;
    agentSummaries: AgentSummary[];
    unifiedBuildDirective: string;
    totalDurationMs: number;
    agentCount: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDirective, setShowDirective] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (!idea.trim() || isRunning) return;

    setIsRunning(true);
    setPhase("running");
    setCompletedAgents([]);
    setActiveAgent(null);
    setResult(null);
    setErrorMsg(null);
    setShowDirective(false);

    abortRef.current = new AbortController();

    try {
      const resp = await fetch(`/api/projects/${projectId}/orchestrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body)
        throw new Error("Failed to start orchestration");

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
            const ev: OrchestratorEvent = JSON.parse(line.slice(6));

            if (ev.type === "agent_start" && ev.agentId) {
              setActiveAgent({
                agentId: ev.agentId,
                agentName: ev.agentName ?? ev.agentId,
                emoji: ev.emoji ?? "🤖",
              });
            } else if (ev.type === "agent_done" && ev.agentId) {
              setActiveAgent(null);
              setCompletedAgents((prev) => [
                ...prev.filter((a) => a.agentId !== ev.agentId),
                {
                  agentId: ev.agentId!,
                  agentName: ev.agentName ?? ev.agentId!,
                  emoji: ev.emoji ?? "🤖",
                  summary: ev.summary ?? "",
                  durationMs: ev.durationMs ?? 0,
                },
              ]);
            } else if (
              ev.type === "result" &&
              ev.architecturePlan &&
              ev.agentSummaries
            ) {
              setResult({
                architecturePlan: ev.architecturePlan,
                agentSummaries: ev.agentSummaries,
                unifiedBuildDirective: ev.unifiedBuildDirective ?? "",
                totalDurationMs: ev.totalDurationMs ?? 0,
                agentCount: ev.agentCount ?? 5,
              });
              setPhase("done");
            } else if (ev.type === "error") {
              setErrorMsg(ev.message ?? "שגיאה לא ידועה");
              setPhase("error");
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setErrorMsg(err.message);
        setPhase("error");
      }
    } finally {
      setIsRunning(false);
      setActiveAgent(null);
    }
  }, [idea, isRunning, projectId]);

  const stop = () => {
    abortRef.current?.abort();
    setIsRunning(false);
    setPhase("idle");
  };

  const reset = () => {
    setPhase("idle");
    setCompletedAgents([]);
    setActiveAgent(null);
    setResult(null);
    setErrorMsg(null);
  };

  const getAgentStatus = (agentId: string) => {
    if (completedAgents.find((a) => a.agentId === agentId)) return "done";
    if (activeAgent?.agentId === agentId) return "running";
    if (isRunning) {
      const completedIds = completedAgents.map((a) => a.agentId);
      const activeIdx = AGENT_ORDER.indexOf(activeAgent?.agentId ?? "");
      const thisIdx = AGENT_ORDER.indexOf(agentId);
      if (thisIdx < activeIdx || completedIds.includes(agentId)) return "done";
      if (thisIdx === activeIdx) return "running";
    }
    return "pending";
  };

  return (
    <div
      className="flex flex-col h-full p-4 gap-4 overflow-y-auto"
      dir="rtl"
      style={{ fontFamily: HE }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
          <Network className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            Multi-Agent Orchestrator
          </p>
          <p className="text-[11px] text-muted-foreground">
            5 סוכנים ברצף — כל אחד בונה על הקודם
          </p>
        </div>
      </div>

      {/* Input — idle / error */}
      {(phase === "idle" || phase === "error") && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              תאר את האפליקציה שתרצה לבנות
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="לדוגמה: פלטפורמת SaaS לניהול משימות צוות עם authentication, דשבורד, מייל אוטומטי ו-Stripe"
              className="w-full h-28 bg-muted/30 border border-border/60 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/30 text-right"
              style={{ fontSize: "16px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) run();
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Cmd+Enter להרצה
            </p>
          </div>

          {phase === "error" && errorMsg && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{errorMsg}</p>
            </div>
          )}

          <button
            type="button"
            onClick={run}
            disabled={!idea.trim()}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <Play className="w-4 h-4" />
            הפעל 5 סוכנים
          </button>

          {/* How it works */}
          <div className="border border-border/40 rounded-xl p-3 bg-muted/10 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground">
              סדר הסוכנים
            </p>
            <div className="space-y-1.5">
              {[
                {
                  emoji: "🏛️",
                  label: "ארכיטקט",
                  desc: "ארכיטקטורה, stack, data models, API",
                },
                {
                  emoji: "🎨",
                  label: "צד לקוח",
                  desc: "UI/UX plan, design system, components",
                },
                {
                  emoji: "⚙️",
                  label: "צד שרת",
                  desc: "API implementation, DB queries, auth",
                },
                {
                  emoji: "🚀",
                  label: "פריסה",
                  desc: "Deployment config, CI/CD, env vars",
                },
                {
                  emoji: "🔍",
                  label: "QA",
                  desc: "Test plan, edge cases, accessibility",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-[11px] text-muted-foreground"
                >
                  <span className="text-sm leading-none mt-0.5">
                    {item.emoji}
                  </span>
                  <div>
                    <span className="font-medium text-foreground/70">
                      {item.label}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Running */}
      {phase === "running" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-400">
                {activeAgent
                  ? `${activeAgent.emoji} ${activeAgent.agentName} פועל...`
                  : "מתחיל תהליך..."}
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

          <div className="text-xs text-muted-foreground bg-muted/20 border border-border/40 rounded-xl px-3 py-2 line-clamp-2">
            🎯 {idea}
          </div>

          {/* Agent pipeline */}
          <div className="space-y-2">
            {AGENT_ORDER.map((agentId) => {
              const status = getAgentStatus(agentId);
              const completed = completedAgents.find(
                (a) => a.agentId === agentId,
              );
              const isActive = activeAgent?.agentId === agentId;
              const emoji = isActive
                ? activeAgent?.emoji
                : (completed?.emoji ?? "⬜");
              const label = AGENT_LABELS[agentId] ?? agentId;

              return (
                <div
                  key={agentId}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 transition-all",
                    status === "running" &&
                      "bg-indigo-500/8 border-indigo-400/30",
                    status === "done" && "bg-green-500/5 border-green-500/20",
                    status === "pending" &&
                      "bg-muted/20 border-border/30 opacity-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {status === "running" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                    )}
                    {status === "done" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    )}
                    {status === "pending" && (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/20 shrink-0" />
                    )}
                    <span className="text-sm font-medium flex-1">
                      {emoji} {label}
                    </span>
                    {status === "done" && completed && (
                      <span className="text-[10px] text-muted-foreground">
                        {(completed.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  {status === "done" && completed?.summary && (
                    <p className="text-[10px] text-muted-foreground mt-1 pr-5 line-clamp-2">
                      {completed.summary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Done */}
      <AnimatePresence>
        {phase === "done" && result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="bg-green-500/8 border border-green-500/25 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="font-bold text-green-400 text-sm">
                  אורקסטרציה הושלמה!
                </p>
                <span className="text-[11px] text-muted-foreground mr-auto">
                  {((result.totalDurationMs ?? 0) / 1000).toFixed(1)}s ·{" "}
                  {result.agentCount} סוכנים
                </span>
              </div>

              {/* Architecture summary */}
              <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  ארכיטקטורה
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {result.architecturePlan.summary}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {Object.entries(result.architecturePlan.techStack).map(
                    ([k, v]) =>
                      v &&
                      v !== "None" && (
                        <div
                          key={k}
                          className="bg-background/40 rounded-lg px-2 py-1"
                        >
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                            {k}
                          </span>
                          <p className="text-[11px] font-medium text-foreground truncate">
                            {v as string}
                          </p>
                        </div>
                      ),
                  )}
                </div>
                {result.architecturePlan.keyComponents.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.architecturePlan.keyComponents
                      .slice(0, 6)
                      .map((c) => (
                        <span
                          key={c}
                          className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-400/20"
                        >
                          {c}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Agent summaries */}
              <div className="space-y-1.5">
                {result.agentSummaries.map((agent) => (
                  <div
                    key={agent.agentId}
                    className="flex items-start gap-2 text-[11px]"
                  >
                    <span className="leading-none mt-0.5">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground/80">
                        {agent.agentName}
                      </span>
                      {agent.summary && (
                        <p className="text-muted-foreground line-clamp-2">
                          {agent.summary}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground/60 shrink-0">
                      {(agent.durationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>

              {/* Unified directive toggle */}
              {result.unifiedBuildDirective && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowDirective(!showDirective)}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>הצג Build Directive מלא</span>
                    {showDirective ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                  <AnimatePresence>
                    {showDirective && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-2"
                      >
                        <pre
                          className="text-[9px] bg-black/30 rounded-xl p-3 overflow-x-auto max-h-48 overflow-y-auto font-mono text-left text-muted-foreground whitespace-pre-wrap"
                          dir="ltr"
                        >
                          {result.unifiedBuildDirective}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={reset}
              className="w-full py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm hover:bg-muted/50 transition-all flex items-center justify-center gap-2"
            >
              <Network className="w-4 h-4" />
              הרצה חדשה
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
