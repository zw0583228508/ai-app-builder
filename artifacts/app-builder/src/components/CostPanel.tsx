import { useState, useEffect } from "react";
import type { JSX } from "react";
import { DollarSign, Loader2, TrendingDown, TrendingUp, Zap, Server, HardDrive, Wifi, Cpu, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CostPanelProps { projectId: number; }

interface CostData {
  period: string;
  totalCostUsd: number;
  byResourceType: Record<string, number>;
  totalTokens: number;
  costRates: Record<string, number>;
}

interface Optimization {
  current_monthly_estimate_usd: number;
  optimized_monthly_estimate_usd: number;
  savings_percent: number;
  recommendations: {
    category: string;
    title: string;
    description: string;
    action: string;
    savings_usd_per_month: number;
    effort: "easy" | "medium" | "hard";
    priority: "critical" | "high" | "medium" | "low";
  }[];
  predicted_growth_cost: { "3m": number; "6m": number; "12m": number };
  free_tier_opportunities: string[];
}

const RESOURCE_ICONS: Record<string, JSX.Element> = {
  cpu_seconds: <Cpu className="w-3.5 h-3.5 text-blue-400" />,
  ram_mb_hours: <Server className="w-3.5 h-3.5 text-purple-400" />,
  gpu_seconds: <Zap className="w-3.5 h-3.5 text-yellow-400" />,
  storage_gb: <HardDrive className="w-3.5 h-3.5 text-green-400" />,
  bandwidth_gb: <Wifi className="w-3.5 h-3.5 text-cyan-400" />,
  ai_tokens: <BarChart3 className="w-3.5 h-3.5 text-pink-400" />,
};

const RESOURCE_LABELS: Record<string, string> = {
  cpu_seconds: "CPU",
  ram_mb_hours: "RAM",
  gpu_seconds: "GPU",
  storage_gb: "Storage",
  bandwidth_gb: "Bandwidth",
  ai_tokens: "AI Tokens",
};

const EFFORT_COLORS: Record<string, string> = {
  easy: "text-green-400 bg-green-500/10",
  medium: "text-yellow-400 bg-yellow-500/10",
  hard: "text-red-400 bg-red-500/10",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-red-500/30",
  high: "border-orange-500/30",
  medium: "border-yellow-500/30",
  low: "border-white/10",
};

export function CostPanel({ projectId }: CostPanelProps) {
  const [costData, setCostData] = useState<CostData | null>(null);
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [loadingOptimize, setLoadingOptimize] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "optimize">("overview");

  const fetchCost = async () => {
    setLoadingCost(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/cost`, { credentials: "include" });
      const data = await res.json() as CostData;
      setCostData(data);
    } finally { setLoadingCost(false); }
  };

  const runOptimize = async () => {
    setLoadingOptimize(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/cost/optimize`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json() as { optimization: Optimization };
      if (data.optimization) setOptimization(data.optimization);
    } finally { setLoadingOptimize(false); }
  };

  useEffect(() => { fetchCost(); }, [projectId]);

  const formatUsd = (v: number | undefined | null) => {
    const n = v ?? 0;
    return n < 0.01 ? `$${(n * 100).toFixed(2)}¢` : `$${n.toFixed(2)}`;
  };

  return (
    <div className="h-full flex flex-col bg-[hsl(220,16%,6%)] overflow-hidden" dir="rtl" style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-yellow-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-white">Cost Engine — מנוע עלויות</h2>
        </div>
        <p className="text-xs text-white/40 mt-0.5">מעקב עלויות per-resource + AI Optimization Agent</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(["overview", "optimize"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("flex-1 py-2 text-xs font-medium transition-colors", activeTab === tab ? "text-white border-b-2 border-yellow-400" : "text-white/40 hover:text-white/70")}>
            {tab === "overview" ? "סקירת עלויות" : "AI אופטימיזציה"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {loadingCost ? (
              <div className="flex items-center justify-center h-32 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                <span className="text-white/50 text-sm">טוען עלויות...</span>
              </div>
            ) : costData ? (
              <>
                {/* Total Cost */}
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">{formatUsd(costData.totalCostUsd)}</div>
                  <div className="text-xs text-white/50 mt-1">סה"כ 30 ימים אחרונים</div>
                </div>

                {/* By Resource */}
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-xs font-semibold text-white/60 mb-3">עלות לפי משאב</div>
                  <div className="space-y-2.5">
                    {Object.entries(costData.byResourceType)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, cost]) => {
                        const total = costData.totalCostUsd || 1;
                        const pct = Math.min((cost / total) * 100, 100);
                        return (
                          <div key={type}>
                            <div className="flex items-center gap-2 mb-1">
                              {RESOURCE_ICONS[type] ?? <DollarSign className="w-3.5 h-3.5 text-white/40" />}
                              <span className="text-xs text-white/70">{RESOURCE_LABELS[type] ?? type}</span>
                              <span className="text-xs text-white/50 mr-auto">{formatUsd(cost)}</span>
                              <span className="text-[10px] text-white/30">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Token Usage */}
                <div className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-pink-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">{costData.totalTokens.toLocaleString()}</div>
                    <div className="text-xs text-white/40">AI tokens בשימוש</div>
                  </div>
                </div>

                <button onClick={fetchCost} className="w-full text-xs text-white/40 hover:text-white/70 py-1 transition-colors">רענן נתונים</button>
              </>
            ) : null}
          </div>
        )}

        {activeTab === "optimize" && (
          <div className="space-y-4">
            <button onClick={runOptimize} disabled={loadingOptimize}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-yellow-600 hover:bg-yellow-500 text-white disabled:opacity-50 transition-colors">
              {loadingOptimize ? <><Loader2 className="w-4 h-4 animate-spin" />מחשב חסכונות...</> : <><TrendingDown className="w-4 h-4" />הרץ AI Optimizer</>}
            </button>

            {!optimization && !loadingOptimize && (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <TrendingDown className="w-8 h-8 text-white/20" />
                <p className="text-white/30 text-sm text-center">לחץ לניתוח עלויות והמלצות חיסכון</p>
              </div>
            )}

            {optimization && (
              <>
                {/* Savings Banner */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{optimization.savings_percent?.toFixed(0)}% חיסכון</div>
                  <div className="text-xs text-white/50 mt-1">
                    מ-${optimization.current_monthly_estimate_usd?.toFixed(2)} ל-${optimization.optimized_monthly_estimate_usd?.toFixed(2)}/mo
                  </div>
                </div>

                {/* Growth Prediction */}
                {optimization.predicted_growth_cost && (
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" />תחזית עלות</div>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(optimization.predicted_growth_cost).map(([period, cost]) => (
                        <div key={period} className="text-center">
                          <div className="text-sm font-bold text-white">${(cost as number)?.toFixed(0)}</div>
                          <div className="text-[10px] text-white/40">{period}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-white/60">המלצות אופטימיזציה</div>
                  {optimization.recommendations?.sort((a, b) => b.savings_usd_per_month - a.savings_usd_per_month).map((rec, i) => (
                    <div key={i} className={cn("bg-white/5 rounded-lg p-3 border", PRIORITY_COLORS[rec.priority] ?? "border-white/10")}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-white flex-1">{rec.title}</span>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded", EFFORT_COLORS[rec.effort] ?? "")}>{rec.effort}</span>
                        <span className="text-xs text-green-400 font-semibold">${rec.savings_usd_per_month}/mo</span>
                      </div>
                      <p className="text-xs text-white/50">{rec.description}</p>
                      <p className="text-xs text-cyan-400/70 mt-1">→ {rec.action}</p>
                    </div>
                  ))}
                </div>

                {/* Free Tier */}
                {optimization.free_tier_opportunities?.length > 0 && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-green-400 mb-2">🎁 Free Tier הזדמנויות</div>
                    {optimization.free_tier_opportunities.map((opp, i) => (
                      <p key={i} className="text-xs text-white/50 mb-1">• {opp}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
