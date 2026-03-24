import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Loader2,
  Search,
  Layers,
  Globe,
  Lock,
  Zap,
  Star,
  Code2,
  ArrowRight,
  BookmarkPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface Template {
  id: number;
  title: string;
  description: string | null;
  stack: string;
  isPublic: boolean;
  uses: number;
  tags: string[];
  createdAt: string;
}

const STACK_COLORS: Record<string, string> = {
  html: "text-orange-400 bg-orange-500/10 border-orange-500/25",
  react: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
  nextjs: "text-white bg-white/5 border-white/15",
  vue: "text-green-400 bg-green-500/10 border-green-500/25",
  svelte: "text-red-400 bg-red-500/10 border-red-500/25",
  node: "text-lime-400 bg-lime-500/10 border-lime-500/25",
  fastapi: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  django: "text-teal-400 bg-teal-500/10 border-teal-500/25",
};

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export function Gallery() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [stackFilter, setStackFilter] = useState<string>("all");

  const { data: publicData, isLoading: loadingPublic } = useQuery({
    queryKey: ["templates-public"],
    queryFn: () => apiFetch<{ templates: Template[] }>("/api/templates"),
  });

  const { data: myData } = useQuery({
    queryKey: ["templates-my"],
    queryFn: () => apiFetch<{ templates: Template[] }>("/api/templates/my"),
  });

  const useMutation_ = useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ project: { id: number } }>(`/api/templates/${id}/use`, {
        method: "POST",
      }),
    onSuccess: (data) => navigate(`/project/${data.project.id}`),
  });

  const all = [...(publicData?.templates ?? []), ...(myData?.templates ?? [])];
  const unique = Array.from(new Map(all.map((t) => [t.id, t])).values());
  const stacks = ["all", ...Array.from(new Set(unique.map((t) => t.stack)))];

  const filtered = unique.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q) ||
      t.tags.some((g) => g.toLowerCase().includes(q));
    const matchStack = stackFilter === "all" || t.stack === stackFilter;
    return matchSearch && matchStack;
  });

  return (
    <div
      className="min-h-screen bg-background"
      dir="rtl"
      style={{ fontFamily: HE }}
    >
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← חזרה
          </button>
          <div className="w-px h-4 bg-white/10" />
          <h1 className="text-lg font-bold text-white">גלריית תבניות</h1>
        </div>
        <div className="flex items-center gap-2 relative">
          <Search className="absolute right-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש תבניות..."
            className="pr-9 pl-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 w-56"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stack filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {stacks.map((s) => (
            <button
              key={s}
              onClick={() => setStackFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                stackFilter === s
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "text-slate-400 border-white/8 hover:border-white/20",
              )}
            >
              {s === "all" ? "הכל" : s.toUpperCase()}
            </button>
          ))}
        </div>

        {loadingPublic ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">לא נמצאו תבניות</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="group bg-slate-900/60 border border-white/8 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-all"
              >
                {/* Preview placeholder */}
                <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative">
                  <Code2 className="w-8 h-8 text-slate-600" />
                  <div
                    className={cn(
                      "absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded border font-mono",
                      STACK_COLORS[t.stack] ??
                        "text-slate-400 bg-slate-800 border-slate-700",
                    )}
                  >
                    {t.stack}
                  </div>
                  {!t.isPublic && (
                    <div className="absolute top-2 left-2">
                      <Lock className="w-3 h-3 text-slate-500" />
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white truncate">
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                        {t.description}
                      </p>
                    )}
                  </div>

                  {t.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Zap className="w-3 h-3" />
                      <span>{t.uses} שימושים</span>
                    </div>
                    <button
                      onClick={() => useMutation_.mutate(t.id)}
                      disabled={useMutation_.isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition-all"
                    >
                      {useMutation_.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3 h-3" />
                      )}
                      השתמש
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
