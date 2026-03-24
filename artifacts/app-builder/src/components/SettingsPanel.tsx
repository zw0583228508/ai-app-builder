import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Trash2,
  AlertTriangle,
  Save,
  Globe,
  Code2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface SettingsPanelProps {
  projectId: number;
  project: {
    title: string;
    description: string | null;
    type: string;
    stack: string;
    userMode: string;
    shareToken?: string | null;
    customSlug?: string | null;
  };
}

const PROJECT_TYPES = [
  { id: "website", label: "אתר תדמית" },
  { id: "landing", label: "דף נחיתה" },
  { id: "webapp", label: "אפליקציית ווב" },
  { id: "portfolio", label: "תיק עבודות" },
  { id: "saas", label: "SaaS" },
  { id: "mobile", label: "מובייל" },
];

const STACKS = [
  { id: "html", label: "HTML / CSS / JS" },
  { id: "react", label: "React" },
  { id: "nextjs", label: "Next.js" },
  { id: "vue", label: "Vue.js" },
  { id: "svelte", label: "Svelte" },
];

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, string>;
    throw new Error(err["error"] || `${res.status}`);
  }
  return res.json() as Promise<T>;
}

export default function SettingsPanel({
  projectId,
  project,
}: SettingsPanelProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [type, setType] = useState(project.type);
  const [stack, setStack] = useState(project.stack);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const saveSettings = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ title, description, type, stack }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const deleteProject = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const shareUrl = project.customSlug
    ? `${window.location.origin}/share/${project.customSlug}`
    : project.shareToken
      ? `${window.location.origin}/share/${project.shareToken}`
      : null;

  function copyShareUrl() {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="h-full overflow-y-auto p-4 space-y-5"
      style={{ fontFamily: HE }}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-white/40" />
        <h2 className="text-sm font-semibold text-white/70">הגדרות פרויקט</h2>
      </div>

      {/* Basic Settings */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          פרטים בסיסיים
        </h3>

        <div>
          <label className="text-xs text-white/50 block mb-1">שם הפרויקט</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            placeholder="שם הפרויקט"
          />
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1">תיאור</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
            placeholder="תיאור קצר..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">סוג</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#1a1d27]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">
              <Code2 className="w-3 h-3 inline ml-1" />
              סטאק
            </label>
            <select
              value={stack}
              onChange={(e) => setStack(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              {STACKS.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#1a1d27]">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => saveSettings.mutate()}
          disabled={saveSettings.isPending}
          className={cn(
            "w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all",
            saved
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-violet-500 text-white hover:bg-violet-600",
          )}
        >
          {saveSettings.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-4 h-4" /> נשמר!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> שמור שינויים
            </>
          )}
        </button>
      </div>

      {/* Share Link */}
      {shareUrl && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1">
            <Globe className="w-3 h-3" /> קישור שיתוף
          </h3>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 focus:outline-none"
            />
            <button
              onClick={copyShareUrl}
              className="px-3 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-red-400/70 uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> אזור מסוכן
        </h3>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2 rounded-lg text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" /> מחק פרויקט
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-red-400">
              האם אתה בטוח? הפרויקט יועבר לפח ויימחק בעוד 30 יום.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteProject.mutate()}
                disabled={deleteProject.isPending}
                className="flex-1 py-2 rounded-lg text-sm bg-red-500 text-white font-semibold"
              >
                {deleteProject.isPending ? "מוחק..." : "כן, מחק"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg text-sm bg-white/10 text-white/70"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
