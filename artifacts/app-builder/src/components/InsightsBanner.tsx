import { useState, useEffect } from "react";
import { Lightbulb, X, Wrench, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Info } from "lucide-react";

interface Suggestion {
  problem: string;
  fix: string;
  impact: string;
  priority: "high" | "medium" | "low";
}

interface InsightsData {
  id: number;
  suggestions: Suggestion[];
  insights: { totalEvents?: number; pageviews?: number }[];
  generatedAt: string;
}

interface InsightsBannerProps {
  projectId: number;
  onFixRequest?: (fix: string) => void;
}

const priorityColor = {
  high: "text-red-400 bg-red-500/10 border-red-500/30",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

const priorityIcon = {
  high: AlertTriangle,
  medium: TrendingUp,
  low: Info,
};

const priorityLabel = {
  high: "קריטי",
  medium: "חשוב",
  low: "שיפור",
};

export function InsightsBanner({ projectId, onFixRequest }: InsightsBannerProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/analytics/insights/${projectId}`);
        if (!r.ok || cancelled) return;
        const json = await r.json();
        if (!cancelled && json.suggestions?.length > 0) {
          setData(json);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const handleDismiss = async () => {
    setDismissed(true);
    if (data?.id) {
      await fetch(`/api/analytics/insights/${projectId}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.id }),
      });
    }
  };

  if (loading || dismissed || !data || data.suggestions.length === 0) return null;

  const highCount = data.suggestions.filter(s => s.priority === "high").length;

  return (
    <div
      dir="rtl"
      className="mx-3 mb-2 rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden"
      style={{ fontFamily: "'Rubik', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Lightbulb size={15} className="text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-amber-300">
            תובנות AI
          </span>
          <span className="text-xs text-slate-400 mr-2">
            {data.suggestions.length} הצעות שיפור
            {highCount > 0 && (
              <span className="text-red-400 mr-1">· {highCount} קריטיות</span>
            )}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-0.5 rounded text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Suggestions */}
      <div className="border-t border-amber-500/20 divide-y divide-amber-500/10">
        {data.suggestions.map((s, i) => {
          const Icon = priorityIcon[s.priority];
          const isOpen = expanded === i;
          return (
            <div key={i} className="px-3 py-2">
              <button
                className="w-full flex items-start gap-2 text-right"
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                <Icon size={13} className={`mt-0.5 shrink-0 ${s.priority === "high" ? "text-red-400" : s.priority === "medium" ? "text-yellow-400" : "text-blue-400"}`} />
                <span className="flex-1 text-xs text-slate-300 text-right leading-snug">{s.problem}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${priorityColor[s.priority]}`}>
                  {priorityLabel[s.priority]}
                </span>
                {isOpen ? <ChevronUp size={12} className="text-slate-500 shrink-0 mt-0.5" /> : <ChevronDown size={12} className="text-slate-500 shrink-0 mt-0.5" />}
              </button>

              {isOpen && (
                <div className="mt-2 mr-5 space-y-1.5">
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-300 font-medium">פתרון: </span>{s.fix}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-300 font-medium">השפעה: </span>{s.impact}
                  </div>
                  {onFixRequest && (
                    <button
                      onClick={() => onFixRequest(s.fix)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] hover:bg-amber-500/25 transition-colors mt-1"
                    >
                      <Wrench size={11} />
                      תקן את זה
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
