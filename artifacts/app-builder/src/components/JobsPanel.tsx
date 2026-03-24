import { useState, useEffect } from "react";
import type { JSX } from "react";
import { ListTodo, Loader2, CheckCircle2, XCircle, Clock, Pause, X, Plus, RefreshCw, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobsPanelProps { projectId: number; }

interface Job {
  id: number;
  type: string;
  priority: "low" | "default" | "high" | "gpu";
  status: "pending" | "running" | "success" | "failed" | "cancelled" | "dead";
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  gpuRequired: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  pending: { label: "ממתין", icon: <Clock className="w-3.5 h-3.5" />, color: "text-yellow-400" },
  running: { label: "רץ", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-blue-400" },
  success: { label: "הצליח", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-400" },
  failed: { label: "נכשל", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400" },
  cancelled: { label: "בוטל", icon: <X className="w-3.5 h-3.5" />, color: "text-white/40" },
  dead: { label: "Dead", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-red-600" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-400 bg-gray-500/10",
  default: "text-blue-400 bg-blue-500/10",
  high: "text-orange-400 bg-orange-500/10",
  gpu: "text-purple-400 bg-purple-500/10",
};

const JOB_TYPES = ["ai_generation", "build", "deploy", "image_gen", "test", "audio"];

export function JobsPanel({ projectId }: JobsPanelProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newJobType, setNewJobType] = useState("ai_generation");
  const [newJobPriority, setNewJobPriority] = useState("default");
  const [newJobPrompt, setNewJobPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams({ projectId: String(projectId) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/jobs?${params}`, { credentials: "include" });
      if (res.status === 304 || res.status === 204) return;
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text) as { jobs: Job[] };
      setJobs(data.jobs ?? []);
    } catch {
      // network/parse errors — keep existing state
    } finally { setLoading(false); }
  };

  const createJob = async () => {
    setCreating(true);
    try {
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: newJobType,
          priority: newJobPriority,
          payload: { prompt: newJobPrompt },
          gpuRequired: newJobPriority === "gpu",
        }),
        credentials: "include",
      });
      setShowCreate(false);
      setNewJobPrompt("");
      fetchJobs();
    } finally { setCreating(false); }
  };

  const cancelJob = async (jobId: number) => {
    await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST", credentials: "include" });
    fetchJobs();
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [projectId, statusFilter]);

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}ש`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}ד`;
    return `${Math.floor(diff / 3600000)}ש"ש`;
  };

  return (
    <div className="h-full flex flex-col bg-[hsl(220,16%,6%)] overflow-hidden" dir="rtl" style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-white">Job Queue — תור משימות</h2>
          </div>
          <button onClick={() => setShowCreate(prev => !prev)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-orange-600 hover:bg-orange-500 text-white transition-colors">
            <Plus className="w-3 h-3" />משימה
          </button>
        </div>
        <p className="text-xs text-white/40 mt-0.5">תור משימות async עם priority, retry, GPU scheduling</p>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="p-3 border-b border-white/10 bg-white/3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={newJobType} onChange={e => setNewJobType(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/50">
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={newJobPriority} onChange={e => setNewJobPriority(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/50">
              <option value="low">נמוך</option>
              <option value="default">רגיל</option>
              <option value="high">גבוה</option>
              <option value="gpu">GPU</option>
            </select>
          </div>
          <input value={newJobPrompt} onChange={e => setNewJobPrompt(e.target.value)}
            placeholder="Prompt / פרמטר למשימה..."
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50" />
          <button onClick={createJob} disabled={creating}
            className="w-full py-1.5 rounded text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 transition-colors">
            {creating ? "שולח..." : "שלח משימה"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="px-3 py-2 border-b border-white/10 flex gap-1.5 overflow-x-auto">
        {["all", "pending", "running", "success", "failed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors",
              statusFilter === s ? "bg-orange-500 text-white" : "bg-white/5 text-white/50 hover:text-white/80")}>
            {s === "all" ? "הכל" : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
        <button onClick={fetchJobs} className="mr-auto text-white/30 hover:text-white/60 p-0.5">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
            <span className="text-white/50 text-sm">טוען משימות...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <ListTodo className="w-8 h-8 text-white/20" />
            <p className="text-white/30 text-sm">אין משימות</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {jobs.map(job => {
              const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
              return (
                <div key={job.id} className="px-3 py-2.5 hover:bg-white/3 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={cn("flex-shrink-0", cfg.color)}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white truncate">{job.type}</span>
                        <span className={cn("text-[9px] px-1.5 rounded", PRIORITY_COLORS[job.priority] ?? "")}>{job.priority}</span>
                        {job.gpuRequired && <Zap className="w-3 h-3 text-purple-400" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[10px]", cfg.color)}>{cfg.label}</span>
                        <span className="text-[10px] text-white/30">#{job.id}</span>
                        <span className="text-[10px] text-white/30">{timeAgo(job.createdAt)}</span>
                        {job.attempts > 0 && <span className="text-[10px] text-orange-400/60">{job.attempts}/{job.maxAttempts} ניסיון</span>}
                      </div>
                    </div>
                    {job.status === "pending" && (
                      <button onClick={() => cancelJob(job.id)} className="text-white/30 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {job.error && (
                    <div className="mt-1.5 text-[10px] text-red-400/80 bg-red-500/10 rounded px-2 py-1">{job.error}</div>
                  )}
                  {job.result && job.status === "success" && (
                    <div className="mt-1.5 text-[10px] text-green-400/80 bg-green-500/10 rounded px-2 py-1">
                      {JSON.stringify(job.result).slice(0, 100)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
