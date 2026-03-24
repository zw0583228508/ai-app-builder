import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gauge, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Clock, BarChart2, Zap, Eye, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface PerformanceData {
  url: string;
  score: number;
  fcp: number; lcp: number; cls: number; tbt: number; si: number;
  fetchedAt: string;
}

interface PerformancePanelProps { projectId: number; }

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const bgColor = score >= 90 ? "stroke-emerald-400" : score >= 50 ? "stroke-amber-400" : "stroke-red-400";
  const r = 28; const c = 2 * Math.PI * r;
  const pct = (score / 100) * c;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-700" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" strokeDasharray={c} strokeDashoffset={c - pct} strokeLinecap="round" className={bgColor} />
      </svg>
      <span className={cn("text-xl font-bold", color)}>{score}</span>
    </div>
  );
}

function Metric({ label, value, unit, good, icon }: { label: string; value: number; unit: string; good: boolean; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/8">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">{icon}</div>
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-semibold", good ? "text-emerald-400" : "text-amber-400")}>{value}{unit}</span>
        {good ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
      </div>
    </div>
  );
}

export function PerformancePanel({ projectId }: PerformancePanelProps) {
  const [customUrl, setCustomUrl] = useState("");
  const [queryUrl, setQueryUrl] = useState<string | null>(null);

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["performance", projectId, queryUrl],
    queryFn: async () => {
      const url = queryUrl || "";
      const res = await fetch(`/api/projects/${projectId}/performance?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ data: PerformanceData }>;
    },
    enabled: !!queryUrl,
    staleTime: 5 * 60 * 1000,
  });
  const perf = data?.data;

  const handleAnalyze = () => {
    const url = customUrl.trim();
    if (!url) return;
    setQueryUrl(url);
  };

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl" style={{ fontFamily: HE }}>
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">ביצועים</span>
        </div>
        {perf && (
          <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* URL input */}
        <div className="space-y-2">
          <p className="text-xs text-slate-400">הכנס URL של האפליקציה הפרוסה לניתוח ביצועים</p>
          <div className="flex items-center gap-2">
            <input
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              placeholder="https://my-app.netlify.app"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
              onKeyDown={e => e.key === "Enter" && handleAnalyze()}
            />
            <button onClick={handleAnalyze} disabled={isLoading || !customUrl.trim()}
              className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-sm transition-all disabled:opacity-50 whitespace-nowrap">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "נתח"}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>שגיאה בניתוח — ודא שה-URL תקין ונגיש</span>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm">מנתח ביצועים... (עשויים לקחת 30-60 שניות)</p>
          </div>
        )}

        {perf && !isLoading && (
          <>
            {/* Score */}
            <div className="flex flex-col items-center py-4">
              <ScoreRing score={perf.score} />
              <p className="text-sm font-semibold text-white mt-2">ציון ביצועים</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{perf.url}</p>
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">מדדים עיקריים</p>
              <Metric label="First Contentful Paint" value={perf.fcp} unit="s" good={perf.fcp < 1.8} icon={<Eye className="w-3.5 h-3.5" />} />
              <Metric label="Largest Contentful Paint" value={perf.lcp} unit="s" good={perf.lcp < 2.5} icon={<BarChart2 className="w-3.5 h-3.5" />} />
              <Metric label="Cumulative Layout Shift" value={perf.cls} unit="" good={perf.cls < 0.1} icon={<MousePointer className="w-3.5 h-3.5" />} />
              <Metric label="Total Blocking Time" value={perf.tbt} unit="ms" good={perf.tbt < 200} icon={<Clock className="w-3.5 h-3.5" />} />
              <Metric label="Speed Index" value={perf.si} unit="s" good={perf.si < 3.4} icon={<Zap className="w-3.5 h-3.5" />} />
            </div>

            <p className="text-[10px] text-slate-600 text-center">
              נותח: {new Date(perf.fetchedAt).toLocaleString("he-IL")} • מופעל ע"י Google PageSpeed Insights
            </p>
          </>
        )}

        {!perf && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
            <Gauge className="w-10 h-10 opacity-20" />
            <p className="text-sm">הכנס URL לניתוח</p>
          </div>
        )}
      </div>
    </div>
  );
}
