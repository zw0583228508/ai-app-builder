import { CheckCircle2, Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

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

interface AgentProgressPanelProps {
  agentPhase: string | null;
  agentSteps: AgentStep[];
  agentFixLog: FixLogEntry[];
  agentStepsCompleted: number | null;
}

export function AgentProgressPanel({
  agentPhase,
  agentSteps,
  agentFixLog,
  agentStepsCompleted,
}: AgentProgressPanelProps) {
  if (!agentPhase && agentSteps.length === 0) return null;

  return (
    <div
      className="space-y-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3"
      style={{ fontFamily: HE }}
      dir="rtl"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
        {agentPhase === "planning" && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <span>מתכנן שלבים...</span>
          </>
        )}
        {agentPhase === "executing" && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span>מבצע</span>
          </>
        )}
        {agentPhase === "fixing" && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>בודק ומתקן שגיאות...</span>
          </>
        )}
        {!agentPhase && agentSteps.length > 0 && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400">
              הסתיים! {agentStepsCompleted ?? agentSteps.length} שלבים
            </span>
          </>
        )}
      </div>

      {agentSteps.length > 0 && (
        <div className="space-y-1.5">
          {agentSteps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 transition-all",
                step.status === "running"
                  ? "bg-cyan-500/10 border border-cyan-500/25 text-cyan-300"
                  : step.status === "done"
                    ? "text-green-400/80"
                    : "text-muted-foreground/50",
              )}
            >
              {step.status === "running" && (
                <Loader2 className="w-3 h-3 animate-spin shrink-0 text-cyan-400" />
              )}
              {step.status === "done" && (
                <CheckCircle2 className="w-3 h-3 shrink-0 text-green-400" />
              )}
              {step.status === "pending" && (
                <div className="w-3 h-3 rounded-full border border-muted-foreground/30 shrink-0" />
              )}
              <span className="font-medium">
                {step.emoji} {step.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {agentFixLog.length > 0 && (
        <div className="space-y-1 border-t border-violet-500/15 pt-2 mt-1">
          {agentFixLog.map((f, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 text-[10px] rounded px-2 py-1",
                f.fixed
                  ? "text-amber-400 bg-amber-500/10"
                  : "text-green-400 bg-green-500/10",
              )}
            >
              {f.fixed ? (
                <>
                  <Wrench className="w-3 h-3 shrink-0" />
                  <span>תוקנו {f.issues.length} בעיות</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>קוד תקין</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
