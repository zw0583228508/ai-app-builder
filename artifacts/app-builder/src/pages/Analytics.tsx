import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import {
  BarChart2,
  MessageSquare,
  Zap,
  Code2,
  TrendingUp,
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Wrench,
  Terminal,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface AnalyticsSummary {
  totalProjects: number;
  totalMessages: number;
  totalGenerations: number;
  avgMessages: number;
  avgSize: number;
  activity: { date: string; count: number }[];
  modes: { entrepreneur: number; builder: number; developer: number };
  recent: {
    id: number;
    title: string;
    updatedAt: string;
    hasPreview: boolean;
    userMode: string;
    msgCount: number;
  }[];
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className={cn("rounded-2xl p-5 border flex items-start gap-4", color)}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/10">
        {icon}
      </div>
      <div>
        <p
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: HE }}
        >
          {value}
        </p>
        <p
          className="text-sm font-medium text-muted-foreground"
          style={{ fontFamily: HE }}
        >
          {label}
        </p>
        {sub && (
          <p
            className="text-xs text-muted-foreground/60 mt-0.5"
            style={{ fontFamily: HE }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityChart({
  activity,
}: {
  activity: { date: string; count: number }[];
}) {
  const max = Math.max(...activity.map((a) => a.count), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {activity.map((a, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1 group relative"
        >
          <div
            className="w-full rounded-sm bg-gradient-to-t from-cyan-600 to-cyan-400 opacity-80 hover:opacity-100 transition-all"
            style={{ height: `${Math.max(3, (a.count / max) * 56)}px` }}
          />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap transition-all z-10">
            {a.count} הודעות
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects/analytics/summary")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const modeLabels: Record<string, string> = {
    entrepreneur: "יזם",
    builder: "בונה",
    developer: "מפתח",
  };
  const modeIcons: Record<string, React.ReactNode> = {
    entrepreneur: <User className="w-3.5 h-3.5" />,
    builder: <Wrench className="w-3.5 h-3.5" />,
    developer: <Terminal className="w-3.5 h-3.5" />,
  };
  const modeColors: Record<string, string> = {
    entrepreneur:
      "from-orange-500/20 to-yellow-500/20 border-orange-500/20 text-orange-400",
    builder: "from-cyan-500/20 to-blue-500/20 border-cyan-500/20 text-cyan-400",
    developer:
      "from-violet-500/20 to-purple-500/20 border-violet-500/20 text-violet-400",
  };

  return (
    <Layout>
      <div className="h-full overflow-y-auto bg-background" dir="rtl">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: HE }}
              >
                📊 לוח בקרה אנליטי
              </h1>
              <p
                className="text-sm text-muted-foreground mt-1"
                style={{ fontFamily: HE }}
              >
                סטטיסטיקות על הפרויקטים שלך
              </p>
            </div>
            <Link href="/">
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontFamily: HE }}
              >
                <ArrowLeft className="w-4 h-4" />
                חזרה לבית
              </button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : data ? (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Code2 className="w-5 h-5 text-cyan-400" />}
                  label="פרויקטים"
                  value={data.totalProjects}
                  color="bg-cyan-500/5 border-cyan-500/15"
                />
                <StatCard
                  icon={<MessageSquare className="w-5 h-5 text-violet-400" />}
                  label="הודעות נשלחו"
                  value={data.totalMessages}
                  sub={`ממוצע ${data.avgMessages} לפרויקט`}
                  color="bg-violet-500/5 border-violet-500/15"
                />
                <StatCard
                  icon={<Zap className="w-5 h-5 text-yellow-400" />}
                  label="אפליקציות נוצרו"
                  value={data.totalGenerations}
                  color="bg-yellow-500/5 border-yellow-500/15"
                />
                <StatCard
                  icon={<TrendingUp className="w-5 h-5 text-green-400" />}
                  label="גודל ממוצע"
                  value={
                    data.avgSize > 1000
                      ? `${(data.avgSize / 1024).toFixed(0)}KB`
                      : `${data.avgSize}B`
                  }
                  sub="לאפליקציה שנוצרה"
                  color="bg-green-500/5 border-green-500/15"
                />
              </div>

              {/* Activity chart */}
              <div className="bg-card border border-border/40 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="font-bold text-foreground"
                    style={{ fontFamily: HE }}
                  >
                    <Calendar className="w-4 h-4 inline ml-1" />
                    פעילות 14 ימים אחרונים
                  </h2>
                  <span
                    className="text-xs text-muted-foreground"
                    style={{ fontFamily: HE }}
                  >
                    {data.activity.reduce((s, a) => s + a.count, 0)} הודעות סה"כ
                  </span>
                </div>
                <ActivityChart activity={data.activity} />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground/50">
                    {data.activity[0]?.date?.slice(5)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {data.activity[data.activity.length - 1]?.date?.slice(5)}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Mode distribution */}
                <div className="bg-card border border-border/40 rounded-2xl p-5">
                  <h2
                    className="font-bold text-foreground mb-4"
                    style={{ fontFamily: HE }}
                  >
                    <BarChart2 className="w-4 h-4 inline ml-1" />
                    התפלגות מצבים
                  </h2>
                  <div className="space-y-3">
                    {(["entrepreneur", "builder", "developer"] as const).map(
                      (mode) => {
                        const count = data.modes[mode];
                        const pct =
                          data.totalProjects > 0
                            ? Math.round((count / data.totalProjects) * 100)
                            : 0;
                        return (
                          <div key={mode}>
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={cn(
                                  "flex items-center gap-1.5 text-sm font-medium",
                                  modeColors[mode],
                                )}
                                style={{ fontFamily: HE }}
                              >
                                {modeIcons[mode]}
                                {modeLabels[mode]}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full bg-gradient-to-r transition-all",
                                  mode === "entrepreneur"
                                    ? "from-orange-500 to-yellow-500"
                                    : mode === "builder"
                                      ? "from-cyan-500 to-blue-500"
                                      : "from-violet-500 to-purple-500",
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Recent projects */}
                <div className="bg-card border border-border/40 rounded-2xl p-5">
                  <h2
                    className="font-bold text-foreground mb-4"
                    style={{ fontFamily: HE }}
                  >
                    🕐 פרויקטים אחרונים
                  </h2>
                  <div className="space-y-2">
                    {data.recent.map((p) => (
                      <Link key={p.id} href={`/project/${p.id}`}>
                        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              p.hasPreview
                                ? "bg-green-400"
                                : "bg-muted-foreground/30",
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors"
                              style={{ fontFamily: HE }}
                            >
                              {p.title}
                            </p>
                            <p
                              className="text-xs text-muted-foreground"
                              style={{ fontFamily: HE }}
                            >
                              {p.msgCount} הודעות ·{" "}
                              {new Date(p.updatedAt).toLocaleDateString(
                                "he-IL",
                              )}
                            </p>
                          </div>
                          {p.hasPreview ? (
                            <Eye className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground" style={{ fontFamily: HE }}>
              שגיאה בטעינת הנתונים
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
