import { useState, useEffect } from "react";
import {
  Activity,
  Play,
  Square,
  RefreshCw,
  Loader2,
  Cpu,
  MemoryStick,
  Zap,
  Clock,
  Globe,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RuntimePanelProps {
  projectId: number;
}

interface RuntimeEnv {
  id: number;
  status: "creating" | "running" | "idle" | "stopped" | "failed";
  previewUrl: string | null;
  cpuUsage: number | null;
  ramUsageMb: number | null;
  gpuUsage: number | null;
  lastActiveAt: string | null;
  autoShutdownAt: string | null;
  metadata: Record<string, unknown>;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  running: {
    label: "פועל",
    color: "text-green-400",
    dot: "bg-green-400 animate-pulse",
  },
  idle: { label: "ממתין", color: "text-yellow-400", dot: "bg-yellow-400" },
  stopped: { label: "מכובה", color: "text-white/40", dot: "bg-white/30" },
  creating: {
    label: "נוצר...",
    color: "text-blue-400",
    dot: "bg-blue-400 animate-pulse",
  },
  failed: { label: "נכשל", color: "text-red-400", dot: "bg-red-400" },
};

export function RuntimePanel({ projectId }: RuntimePanelProps) {
  const [env, setEnv] = useState<RuntimeEnv | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEnv = async () => {
    try {
      const res = await fetch(`/api/runtime/${projectId}`, {
        credentials: "include",
      });
      if (res.status === 304 || res.status === 204) return;
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text) as { environment: RuntimeEnv | null };
      setEnv(data.environment);
    } catch {
      // network/parse errors — keep existing state
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/runtime/${projectId}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text) as { environment: RuntimeEnv };
      if (data.environment) setEnv(data.environment);
    } catch {
      // network/parse errors — keep existing state
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchEnv();
    const interval = setInterval(fetchEnv, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [projectId]);

  const status = env?.status ?? "stopped";
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.stopped;
  const isRunning = status === "running" || status === "idle";

  const timeUntilShutdown = () => {
    if (!env?.autoShutdownAt) return null;
    const diff = new Date(env.autoShutdownAt).getTime() - Date.now();
    if (diff <= 0) return "בקרוב";
    const mins = Math.floor(diff / 60000);
    return `${mins} דקות`;
  };

  return (
    <div
      className="h-full flex flex-col bg-[hsl(220,16%,6%)] overflow-hidden"
      dir="rtl"
      style={{ fontFamily: "'Rubik', sans-serif" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">
            Runtime Control Plane
          </h2>
        </div>
        <p className="text-xs text-white/40 mt-0.5">
          ניהול סביבת ריצה — CPU, RAM, GPU, Auto-Shutdown
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-white/50 text-sm">טוען סביבה...</span>
          </div>
        ) : (
          <>
            {/* Status Card */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", cfg.dot)} />
                  <div>
                    <div className={cn("text-base font-bold", cfg.color)}>
                      {cfg.label}
                    </div>
                    <div className="text-xs text-white/40">סביבת ריצה</div>
                  </div>
                </div>
                {/* Control Buttons */}
                <div className="flex gap-2">
                  {!isRunning && (
                    <button
                      onClick={() => doAction("start")}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      הפעל
                    </button>
                  )}
                  {isRunning && (
                    <>
                      <button
                        onClick={() => doAction("restart")}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        הפעל מחדש
                      </button>
                      <button
                        onClick={() => doAction("stop")}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                        כבה
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Metrics */}
              {isRunning && env && (
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="bg-white/5 rounded-lg p-2.5 text-center">
                    <Cpu className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">
                      {(env.cpuUsage ?? 0).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-white/40">CPU</div>
                    <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{
                          width: `${Math.min(env.cpuUsage ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5 text-center">
                    <MemoryStick className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">
                      {Math.round(env.ramUsageMb ?? 0)}
                    </div>
                    <div className="text-[10px] text-white/40">RAM MB</div>
                    <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{
                          width: `${Math.min(((env.ramUsageMb ?? 0) / 512) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5 text-center">
                    <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">
                      {(env.gpuUsage ?? 0).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-white/40">GPU</div>
                    <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{
                          width: `${Math.min(env.gpuUsage ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview URL */}
            {env?.previewUrl && isRunning && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-xs text-white/60 flex-1">
                  Preview URL
                </span>
                <code className="text-xs text-green-400">{env.previewUrl}</code>
              </div>
            )}

            {/* Auto Shutdown */}
            {isRunning && timeUntilShutdown() && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-yellow-400">
                    Auto-Shutdown בעוד {timeUntilShutdown()}
                  </div>
                  <div className="text-[11px] text-white/40">
                    הסביבה תכבה אוטומטית בחוסר פעילות
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            {env?.metadata && Object.keys(env.metadata).length > 0 && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-xs font-semibold text-white/60 mb-2">
                  מידע נוסף
                </div>
                {Object.entries(env.metadata).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs mb-1">
                    <span className="text-white/40">{k}:</span>
                    <span className="text-white/70">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* No Environment Yet */}
            {!env && (
              <div className="bg-white/5 rounded-lg p-6 border border-dashed border-white/20 text-center">
                <AlertCircle className="w-6 h-6 text-white/30 mx-auto mb-2" />
                <p className="text-white/40 text-sm">אין סביבת ריצה</p>
                <p className="text-white/25 text-xs mt-1">
                  לחץ "הפעל" כדי ליצור סביבה חדשה
                </p>
              </div>
            )}

            <button
              onClick={fetchEnv}
              className="w-full text-xs text-white/30 hover:text-white/60 py-1 transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              רענן
            </button>
          </>
        )}
      </div>
    </div>
  );
}
