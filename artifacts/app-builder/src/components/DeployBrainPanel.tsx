import { useState } from "react";
import {
  Brain,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Server,
  Zap,
  Clock,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeployBrainPanelProps {
  projectId: number;
}

const DEPLOY_ICONS: Record<string, string> = {
  static: "🌐",
  autoscale_server: "⚡",
  background_worker: "🔧",
  scheduled_job: "⏰",
  gpu_job: "🎮",
};

const DEPLOY_LABELS: Record<string, string> = {
  static: "Static Hosting",
  autoscale_server: "Auto-Scale Server",
  background_worker: "Background Worker",
  scheduled_job: "Scheduled Job",
  gpu_job: "GPU Job",
};

const DEPLOY_COLORS: Record<string, string> = {
  static: "text-green-400 border-green-500/30 bg-green-500/10",
  autoscale_server: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  background_worker: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  scheduled_job: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  gpu_job: "text-red-400 border-red-500/30 bg-red-500/10",
};

interface BrainResult {
  id?: number;
  recommendation: string;
  reasoning: string;
  estimated_monthly_cost_usd: number;
  alternative_options: { type: string; reasoning: string; cost_usd: number }[];
  decision_factors: {
    has_backend: boolean;
    needs_database: boolean;
    has_ai_workload: boolean;
    is_always_on: boolean;
    expected_users_per_day: number;
  };
  optimization_tips: string[];
  recommended_provider: string;
  scaling_strategy: string;
}

export function DeployBrainPanel({ projectId }: DeployBrainPanelProps) {
  const [result, setResult] = useState<BrainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [trafficExpectation, setTrafficExpectation] = useState("medium");
  const [budgetUsd, setBudgetUsd] = useState(50);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy-brain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trafficExpectation, budgetUsd }),
        credentials: "include",
      });
      const data = (await res.json()) as { brain: BrainResult };
      if (data.brain) setResult(data.brain);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-[hsl(220,16%,6%)] overflow-hidden"
      dir="rtl"
      style={{ fontFamily: "'Rubik', sans-serif" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">
            Deployment Brain — מח ה-Deploy
          </h2>
        </div>
        <p className="text-xs text-white/40 mt-0.5">
          AI מנתח את הפרויקט ומחליט את שיטת ה-Deploy האופטימלית
        </p>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div>
          <label className="text-xs text-white/50 block mb-1">
            ציפיות תנועה
          </label>
          <select
            value={trafficExpectation}
            onChange={(e) => setTrafficExpectation(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="low">נמוך (עד 1K ביקורים/יום)</option>
            <option value="medium">בינוני (1K-50K ביקורים/יום)</option>
            <option value="high">גבוה (50K+ ביקורים/יום)</option>
            <option value="enterprise">Enterprise (מיליון+)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">
            תקציב חודשי: ${budgetUsd}
          </label>
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={budgetUsd}
            onChange={(e) => setBudgetUsd(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
            <span>$0</span>
            <span>$500</span>
          </div>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              מנתח...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              נתח ובחר שיטת Deploy
            </>
          )}
        </button>
      </div>

      {/* Result */}
      <div className="flex-1 overflow-y-auto p-4">
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Brain className="w-8 h-8 text-white/20" />
            <p className="text-white/30 text-sm text-center">
              לחץ "נתח" כדי לקבל המלצת Deploy
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-white/50 text-sm">מנתח את הקוד ותנועה...</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Primary Recommendation */}
            <div
              className={cn(
                "border rounded-xl p-4",
                DEPLOY_COLORS[result.recommendation] ??
                  "text-white/80 border-white/20 bg-white/5",
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">
                  {DEPLOY_ICONS[result.recommendation] ?? "🚀"}
                </span>
                <div>
                  <div className="text-lg font-bold">
                    {DEPLOY_LABELS[result.recommendation] ??
                      result.recommendation}
                  </div>
                  <div className="text-sm opacity-70">המלצה ראשית</div>
                </div>
                <div className="mr-auto text-right">
                  <div className="text-xl font-bold">
                    ${result.estimated_monthly_cost_usd}/mo
                  </div>
                  <div className="text-xs opacity-70">עלות חודשית</div>
                </div>
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                {result.reasoning}
              </p>
            </div>

            {/* Decision Factors */}
            {result.decision_factors && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-xs font-semibold text-white/60 mb-2">
                  גורמי החלטה
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.decision_factors).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                          v
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400",
                        )}
                      >
                        {typeof v === "boolean" ? (v ? "✓" : "✗") : ""}
                      </span>
                      <span className="text-xs text-white/60">
                        {k.replace(/_/g, " ")}
                      </span>
                      {typeof v === "number" && (
                        <span className="text-xs text-white/80 mr-auto">
                          {v.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provider + Scaling */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-[10px] text-white/40 mb-1">ספק מומלץ</div>
                <div className="text-sm font-semibold text-white">
                  {result.recommended_provider}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-[10px] text-white/40 mb-1">
                  אסטרטגיית Scale
                </div>
                <div className="text-sm font-semibold text-white">
                  {result.scaling_strategy}
                </div>
              </div>
            </div>

            {/* Optimization Tips */}
            {result.optimization_tips?.length > 0 && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  טיפי אופטימיזציה
                </div>
                <ul className="space-y-1.5">
                  {result.optimization_tips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-white/60"
                    >
                      <span className="text-yellow-400 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alternatives */}
            {result.alternative_options?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-white/60 mb-2">
                  חלופות
                </div>
                <div className="space-y-2">
                  {result.alternative_options.map((alt, i) => (
                    <div
                      key={i}
                      className="bg-white/5 rounded-lg p-2.5 border border-white/10 flex items-center gap-3"
                    >
                      <span>{DEPLOY_ICONS[alt.type] ?? "🔧"}</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-white/80">
                          {DEPLOY_LABELS[alt.type] ?? alt.type}
                        </div>
                        <div className="text-[11px] text-white/40">
                          {alt.reasoning}
                        </div>
                      </div>
                      <span className="text-xs text-white/60">
                        ${alt.cost_usd}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
