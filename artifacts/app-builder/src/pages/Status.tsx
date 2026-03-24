import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, Activity } from "lucide-react";

interface SystemStatus {
  status: "ok" | "error" | "loading";
  uptime?: number;
  timestamp?: string;
  error?: string;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}ד ${h}ש ${m}ד'`;
  if (h > 0) return `${h}ש ${m}ד'`;
  return `${m} דקות`;
}

export default function Status() {
  const [api, setApi] = useState<SystemStatus>({ status: "loading" });

  useEffect(() => {
    fetch(`${BASE}/api/healthz`)
      .then((r) => r.json())
      .then((data: { status: string; uptime: number; timestamp: string }) => {
        setApi({
          status: data.status === "ok" ? "ok" : "error",
          uptime: data.uptime,
          timestamp: data.timestamp,
        });
      })
      .catch(() => setApi({ status: "error", error: "לא ניתן להגיע לשרת" }));
  }, []);

  const services = [
    {
      name: "שרת API",
      description: "שרת הבקאנד הראשי",
      status: api.status,
      detail:
        api.status === "ok"
          ? `זמן פעולה: ${formatUptime(api.uptime ?? 0)}`
          : api.error,
    },
    {
      name: "ממשק משתמש",
      description: "ממשק האפליקציה",
      status: "ok" as const,
      detail: "פועל תקין",
    },
    {
      name: "בסיס נתונים",
      description: "PostgreSQL",
      status: api.status,
      detail: api.status === "ok" ? "חיבור תקין" : "לא ידוע",
    },
  ];

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center py-16 px-4"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center gap-3 mb-8">
          <Activity className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-bold">מצב המערכת</h1>
        </div>

        {/* Overall status */}
        <div
          className={`rounded-2xl border p-5 mb-8 flex items-center gap-4 ${
            api.status === "ok"
              ? "bg-green-500/5 border-green-500/20"
              : api.status === "loading"
                ? "bg-white/[0.02] border-white/10"
                : "bg-red-500/5 border-red-500/20"
          }`}
        >
          {api.status === "loading" ? (
            <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
          ) : api.status === "ok" ? (
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-400" />
          )}
          <div>
            <p className="text-lg font-semibold">
              {api.status === "loading"
                ? "בודק מצב..."
                : api.status === "ok"
                  ? "כל המערכות פועלות תקין"
                  : "יש בעיות במערכת"}
            </p>
            {api.timestamp && (
              <p className="text-sm text-white/40">
                עדכון אחרון:{" "}
                {new Date(api.timestamp).toLocaleTimeString("he-IL")}
              </p>
            )}
          </div>
        </div>

        {/* Individual services */}
        <div className="space-y-3">
          {services.map((svc, i) => (
            <motion.div
              key={svc.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-sm">{svc.name}</p>
                <p className="text-xs text-white/40">{svc.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {svc.status === "loading" ? (
                  <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                ) : svc.status === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span
                  className={`text-xs ${
                    svc.status === "ok"
                      ? "text-green-400"
                      : svc.status === "loading"
                        ? "text-white/40"
                        : "text-red-400"
                  }`}
                >
                  {svc.detail}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-white/20 mt-8">
          לדיווח על בעיה:{" "}
          <a
            href="mailto:support@example.com"
            className="text-cyan-400/60 hover:text-cyan-400"
          >
            support@example.com
          </a>
        </p>
      </motion.div>
    </div>
  );
}
