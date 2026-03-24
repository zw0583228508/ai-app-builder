import { useQuery } from "@tanstack/react-query";
import { BarChart3, Zap, Bot, MessageSquare, DollarSign, Loader2 } from "lucide-react";

const HE = "'Rubik', sans-serif";

interface UsageSummary {
  totalTokens: number;
  aiMessages: number;
  agentRuns: number;
  estimatedCostUsd: number;
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface UsagePanelProps {
  projectId: number;
}

export function UsagePanel({ projectId }: UsagePanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["usage", projectId],
    queryFn: () => apiFetch<{ summary: UsageSummary; daily: Record<string, number> }>(`/api/projects/${projectId}/usage`),
    staleTime: 60_000,
  });

  const summary = data?.summary;
  const daily = data?.daily ?? {};
  const days = Object.keys(daily).sort().slice(-14); // last 14 days
  const maxTokens = Math.max(...days.map(d => daily[d] ?? 0), 1);

  const stats = summary ? [
    { icon: <MessageSquare className="w-4 h-4 text-cyan-400" />, label: "הודעות AI", value: formatNumber(summary.aiMessages), sub: "ב-30 ימים האחרונים" },
    { icon: <Bot className="w-4 h-4 text-violet-400" />, label: "ריצות Agent", value: formatNumber(summary.agentRuns), sub: "ב-30 ימים האחרונים" },
    { icon: <Zap className="w-4 h-4 text-amber-400" />, label: "סה״כ טוקנים", value: formatNumber(summary.totalTokens), sub: "קלט + פלט" },
    { icon: <DollarSign className="w-4 h-4 text-emerald-400" />, label: "עלות משוערת", value: `$${summary.estimatedCostUsd.toFixed(3)}`, sub: "לפי Claude Sonnet" },
  ] : [];

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl" style={{ fontFamily: HE }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-white">שימוש וחיוב</span>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">30 ימים אחרונים</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              {stats.map((stat, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-800/60 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {stat.icon}
                    <span className="text-xs text-slate-400">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Daily chart */}
            {days.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">טוקנים יומיים (14 ימים)</p>
                <div className="flex items-end gap-0.5 h-16">
                  {days.map(day => {
                    const val = daily[day] ?? 0;
                    const h = Math.max((val / maxTokens) * 100, 2);
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-0.5" title={`${day}: ${formatNumber(val)} טוקנים`}>
                        <div
                          className="w-full rounded-sm bg-cyan-500/40 hover:bg-cyan-500/60 transition-colors"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                  <span>{days[0]?.slice(5)}</span>
                  <span>{days[days.length - 1]?.slice(5)}</span>
                </div>
              </div>
            )}

            {/* Plan info */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">תוכנית נוכחית</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Free</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: "פרויקטים", value: "3 מתוך 10", pct: 30 },
                  { label: "הודעות AI ליום", value: `${Math.min(summary?.aiMessages ?? 0, 50)} מתוך 50`, pct: Math.min(((summary?.aiMessages ?? 0) / 50) * 100, 100) },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-slate-300">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.pct > 80 ? "bg-red-500" : item.pct > 60 ? "bg-amber-500" : "bg-cyan-500"}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full py-2 rounded-lg bg-gradient-to-l from-cyan-500/20 to-violet-500/20 border border-cyan-500/25 text-xs font-semibold text-white hover:from-cyan-500/30 hover:to-violet-500/30 transition-all">
                שדרג ל-Pro — ₪99/חודש →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
