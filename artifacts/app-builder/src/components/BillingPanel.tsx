import { useQuery } from "@tanstack/react-query";
import {
  Zap, TrendingUp, Calendar, BarChart3, RefreshCw, AlertCircle, CreditCard,
  CheckCircle2, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface UsageStat {
  date: string;
  count: number;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
}

interface BillingPanelProps {
  projectId: number;
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className={cn("p-4 rounded-xl border", color)}>
      <div className="flex items-center gap-2 mb-2 text-white/50">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}

const PLAN_FEATURES = {
  free: {
    label: "חינמי",
    color: "text-white/60",
    bg: "bg-white/5",
    border: "border-white/10",
    features: ["50 הודעות/חודש", "3 פרויקטים", "שיתוף ציבורי", "תמיכה בסיסית"],
    limit: 50,
  },
  pro: {
    label: "Pro",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    features: ["1,000 הודעות/חודש", "פרויקטים ללא הגבלה", "גרסאות ו-snapshots", "Deploy לנטליפי/וורסל", "תמיכה מועדפת"],
    limit: 1000,
  },
};

export default function BillingPanel({ projectId }: BillingPanelProps) {
  const { data: stats, isLoading, error } = useQuery<UsageStat[]>({
    queryKey: ["usage", projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/analytics`),
    retry: false,
  });

  const totalMessages = stats?.reduce((s, d) => s + d.count, 0) ?? 0;
  const totalTokens = stats?.reduce((s, d) => s + d.tokensUsed, 0) ?? 0;
  const thisMonth = stats?.filter((d) => {
    const date = new Date(d.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const monthMessages = thisMonth?.reduce((s, d) => s + d.count, 0) ?? 0;

  const currentPlan = "free"; // Future: read from user profile
  const plan = PLAN_FEATURES[currentPlan];
  const usagePercent = Math.min(100, Math.round((monthMessages / plan.limit) * 100));

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5" style={{ fontFamily: HE }} dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-white/40" />
        <h2 className="text-sm font-semibold text-white/70">שימוש ותוכניות</h2>
      </div>

      {/* Current Plan */}
      <div className={cn("p-4 rounded-xl border", plan.bg, plan.border)}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Star className={cn("w-4 h-4", plan.color)} />
              <span className={cn("font-bold", plan.color)}>תוכנית {plan.label}</span>
            </div>
            <p className="text-xs text-white/40 mt-0.5">החודש הנוכחי</p>
          </div>
          <div className="text-left">
            <div className="text-2xl font-bold text-white">{monthMessages}</div>
            <div className="text-xs text-white/40">/ {plan.limit} הודעות</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                usagePercent > 80 ? "bg-red-500" : usagePercent > 60 ? "bg-amber-500" : "bg-violet-500",
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40">
            <span>{usagePercent}% בשימוש</span>
            <span>מתאפס ב-1 לחודש</span>
          </div>
        </div>

        {usagePercent > 80 && (
          <div className="mt-3 flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
            <AlertCircle className="w-3 h-3 shrink-0" />
            קרוב למגבלה — שקול שדרוג לPro
          </div>
        )}
      </div>

      {/* Usage Stats */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-white/30">
          <RefreshCw className="w-5 h-5 animate-spin ml-2" />
          טוען נתונים...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-white/30 text-sm bg-white/5 rounded-xl p-4 border border-white/10">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          לא ניתן לטעון נתוני שימוש
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="הודעות השבוע"
            value={stats?.slice(-7).reduce((s, d) => s + d.count, 0) ?? 0}
            icon={<TrendingUp className="w-3 h-3" />}
            color="bg-blue-500/10 border-blue-500/20"
          />
          <StatCard
            label="סה״כ טוקנים"
            value={totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : totalTokens}
            icon={<Zap className="w-3 h-3" />}
            color="bg-purple-500/10 border-purple-500/20"
          />
          <StatCard
            label="ימים פעילים"
            value={stats?.filter((d) => d.count > 0).length ?? 0}
            icon={<Calendar className="w-3 h-3" />}
            color="bg-emerald-500/10 border-emerald-500/20"
          />
          <StatCard
            label="סה״כ הודעות"
            value={totalMessages}
            icon={<BarChart3 className="w-3 h-3" />}
            color="bg-orange-500/10 border-orange-500/20"
          />
        </div>
      )}

      {/* Pro Plan Promo */}
      {currentPlan === "free" && (
        <div className="bg-gradient-to-b from-violet-500/15 to-purple-600/10 rounded-xl border border-violet-500/25 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-violet-400" />
            <h3 className="font-semibold text-violet-300">שדרג לPro</h3>
          </div>
          <div className="space-y-2">
            {PLAN_FEATURES.pro.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-white/60">
                <CheckCircle2 className="w-3 h-3 text-violet-400 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <button className="w-full py-2 rounded-lg bg-violet-500 text-white font-semibold text-sm hover:bg-violet-600 transition-colors">
            שדרג עכשיו — $19/חודש
          </button>
        </div>
      )}
    </div>
  );
}
