import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2, RefreshCw, Loader2, Bug, Clock, Globe, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface AppError {
  id: number; projectId: number; message: string;
  stack: string | null; url: string | null; userAgent: string | null;
  sessionId: string | null; createdAt: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

interface ErrorsPanelProps { projectId: number; }

export function ErrorsPanel({ projectId }: ErrorsPanelProps) {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["app-errors", projectId],
    queryFn: () => apiFetch<{ errors: AppError[] }>(`/api/projects/${projectId}/errors`).then(r => r.errors),
    refetchInterval: 30000,
  });
  const errors = data ?? [];

  const clearMutation = useMutation({
    mutationFn: () => apiFetch(`/api/projects/${projectId}/errors`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app-errors", projectId] }),
  });

  const formatTime = (iso: string) => new Date(iso).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl" style={{ fontFamily: HE }}>
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-white">ניטור שגיאות</span>
          {errors.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
              {errors.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors" title="רענן">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {errors.length > 0 && (
            <button onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors" title="נקה הכל">
              {clearMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
            <Bug className="w-10 h-10 opacity-20" />
            <p className="text-sm">אין שגיאות מתועדות</p>
            <p className="text-xs text-center max-w-xs text-slate-600">שגיאות JS מהאפליקציה הפרוסה יופיעו כאן אוטומטית לאחר פרסום</p>
          </div>
        ) : (
          <div className="space-y-2">
            {errors.map(err => (
              <div key={err.id} className={cn("rounded-xl border bg-slate-900/60 overflow-hidden transition-all", expandedId === err.id ? "border-red-500/30" : "border-white/8 hover:border-white/15")}>
                <button onClick={() => setExpandedId(expandedId === err.id ? null : err.id)} className="w-full flex items-start gap-3 p-3 text-right">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/90 truncate">{err.message}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(err.createdAt)}</span>
                      {err.url && <span className="flex items-center gap-1 truncate max-w-[200px]"><Globe className="w-3 h-3 shrink-0" />{err.url}</span>}
                    </div>
                  </div>
                  {expandedId === err.id ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>
                {expandedId === err.id && err.stack && (
                  <div className="px-3 pb-3">
                    <pre className="text-[11px] text-slate-400 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                      {err.stack}
                    </pre>
                    {err.userAgent && (
                      <p className="text-[10px] text-slate-600 mt-2 truncate">{err.userAgent}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
