import { Link, useLocation } from "wouter";
import {
  Plus,
  FileCode2,
  Loader2,
  Sparkles,
  Link2,
  Github,
  Database,
  Cpu,
  Search,
  Trash2,
  Copy,
  BarChart2,
  LogIn,
  LogOut,
  User,
  Rocket,
  Brain,
  Shield,
  DollarSign,
  Activity,
  ListTodo,
  Globe,
  Wand2,
  ChevronDown,
  ChevronRight,
  Settings,
} from "lucide-react";
import { useListProjects, useDeleteProject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useIntegrations } from "@/hooks/use-integrations";
import { useAuth } from "@workspace/replit-auth-web";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";

interface SidebarProps {
  onNewProject: () => void;
}

function formatDate(dateStr: string, yesterday: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return yesterday;
  return format(d, "d MMM");
}

export function Sidebar({ onNewProject }: SidebarProps) {
  const { t, meta, lang } = useLang();
  const isRTL = meta.rtl;

  const [location, navigate] = useLocation();
  const { data: projects, isLoading } = useListProjects();
  const { getActiveIntegrations } = useIntegrations();
  const { user, isAuthenticated, login, logout } = useAuth();
  const active = getActiveIntegrations();
  const activeCount = Object.keys(active).length;
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [forkingId, setForkingId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [showAiTools, setShowAiTools] = useState(false);
  const [showProjects, setShowProjects] = useState(true);

  const deleteMutation = useDeleteProject();
  const queryClient = useQueryClient();

  const filtered = search.trim()
    ? projects?.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()),
      )
    : projects;

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    setConfirmDelete(null);
    if (location === `/project/${id}`) navigate("/");
  };

  const handleFork = async (id: number) => {
    setForkingId(id);
    try {
      const res = await fetch(`/api/projects/${id}/fork`, { method: "POST" });
      if (res.ok) {
        const forked = await res.json();
        await queryClient.invalidateQueries({ queryKey: ["projects"] });
        navigate(`/project/${forked.id}`);
      }
    } finally {
      setForkingId(null);
    }
  };

  const AI_TOOLS = [
    {
      icon: Wand2,
      label: t("featPlannerAgent"),
      desc: t("featPlannerDesc").slice(0, 30) + "…",
      color: "text-cyan-400",
    },
    {
      icon: Brain,
      label: t("featDeployBrain"),
      desc: t("featDeployBrainDesc").slice(0, 30) + "…",
      color: "text-purple-400",
    },
    {
      icon: Shield,
      label: t("featQA"),
      desc: t("featQADesc").slice(0, 30) + "…",
      color: "text-green-400",
    },
    {
      icon: DollarSign,
      label: t("featCost"),
      desc: t("featCostDesc").slice(0, 30) + "…",
      color: "text-yellow-400",
    },
    {
      icon: Activity,
      label: t("featRuntime"),
      desc: t("featRuntimeDesc").slice(0, 30) + "…",
      color: "text-blue-400",
    },
    {
      icon: ListTodo,
      label: t("featJobQueue"),
      desc: t("featJobQueueDesc").slice(0, 30) + "…",
      color: "text-orange-400",
    },
    {
      icon: Rocket,
      label: t("featSaaS"),
      desc: t("featSaaSDesc").slice(0, 30) + "…",
      color: "text-pink-400",
    },
  ];

  return (
    <div
      className="w-[220px] border-r border-white/[0.06] flex flex-col h-full flex-shrink-0 z-10 bg-[#0a0a0f]"
      style={{ fontFamily: meta.font, direction: isRTL ? "rtl" : "ltr" }}
      key={lang}
    >
      {/* ── Logo header ── */}
      <div
        className={cn(
          "h-[57px] flex items-center gap-2.5 px-4 border-b border-white/[0.06]",
          isRTL && "flex-row",
        )}
      >
        <div className="w-7 h-7 rounded flex items-center justify-center shrink-0">
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="logo"
            className="w-5 h-5 object-contain opacity-90"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-[14px] text-slate-100 tracking-tight">
            {t("appName")}
          </span>
        </div>
        <button
          onClick={onNewProject}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
          title={t("newProject")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* ── New project button ── */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-indigo-500/30 text-indigo-400 text-sm font-medium rounded-lg hover:bg-indigo-500/5 transition-all group"
        >
          <Plus className="w-4 h-4" />
          {t("newProject")}
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 mt-2 space-y-4">
        {/* Quick links */}
        <div className="space-y-0.5">
          <Link
            href="/gallery"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
              location === "/gallery"
                ? "bg-white/[0.06] text-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]",
            )}
          >
            <Globe className="w-4 h-4" />
            {t("communityGalleryNav")}
          </Link>
          <Link
            href="/memory"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
              location === "/memory"
                ? "bg-white/[0.06] text-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]",
            )}
          >
            <Brain className="w-4 h-4" />
            <span className="flex-1">זיכרון עסקי</span>
          </Link>
          <Link
            href="/integrations"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
              location === "/integrations"
                ? "bg-white/[0.06] text-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]",
            )}
          >
            <div className="relative">
              <Link2 className="w-4 h-4" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              )}
            </div>
            <span className="flex-1">{t("integrations")}</span>
          </Link>
        </div>

        {/* Projects section */}
        <div>
          <button
            onClick={() => setShowProjects((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
          >
            <span className="flex-1 text-right">{t("projects")}</span>
            {showProjects ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>

          {showProjects && (
            <div className="mt-1">
              {(projects?.length ?? 0) > 4 && (
                <div className="px-2 mb-2">
                  <div className="relative">
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("search")}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-md pr-8 pl-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-0.5">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  </div>
                ) : filtered?.length === 0 ? (
                  <div className="px-3 py-5 text-center flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-indigo-400/60" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        {t("noProjectsYet")}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {t("createFirst")}
                      </p>
                    </div>
                    <button
                      onClick={onNewProject}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[11px] font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {t("newProject")}
                    </button>
                  </div>
                ) : (
                  filtered?.map((project) => {
                    const isActive = location === `/project/${project.id}`;
                    const isHovered = hoveredId === project.id;
                    const isDeleting = confirmDelete === project.id;
                    const isForking = forkingId === project.id;

                    return (
                      <div
                        key={project.id}
                        className="relative"
                        onMouseEnter={() => setHoveredId(project.id)}
                        onMouseLeave={() => {
                          setHoveredId(null);
                          if (confirmDelete === project.id)
                            setConfirmDelete(null);
                        }}
                      >
                        {isDeleting ? (
                          <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mx-2">
                            <span className="text-xs text-red-400 flex-1">
                              {t("confirmDelete")}
                            </span>
                            <button
                              onClick={() => handleDelete(project.id)}
                              disabled={deleteMutation.isPending}
                              className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                t("yes")
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-0.5 rounded text-slate-400 text-xs hover:bg-white/[0.04]"
                            >
                              {t("no")}
                            </button>
                          </div>
                        ) : (
                          <Link
                            href={`/project/${project.id}`}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all mx-2 group",
                              isActive
                                ? "bg-white/[0.06] text-slate-100"
                                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                            )}
                          >
                            <span className="flex-1 text-sm truncate">
                              {project.title}
                            </span>
                            {isHovered ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleFork(project.id);
                                  }}
                                  title={t("duplicate")}
                                  disabled={isForking}
                                  className="p-1 rounded text-slate-500 hover:text-indigo-400 transition-all"
                                >
                                  {isForking ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmDelete(project.id);
                                  }}
                                  title={t("delete")}
                                  className="p-1 rounded text-slate-500 hover:text-red-400 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span
                                className="text-[10px] text-slate-600 shrink-0 tabular-nums"
                                dir="ltr"
                              >
                                {formatDate(project.updatedAt, t("yesterday"))}
                              </span>
                            )}
                          </Link>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom section ── */}
      <div className="border-t border-white/[0.06] p-2 space-y-0.5">
        <Link href="/analytics">
          <button
            className={cn(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all",
              location === "/analytics"
                ? "bg-white/[0.06] text-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]",
            )}
          >
            <BarChart2 className="w-4 h-4" />
            {t("analytics")}
          </button>
        </Link>

        {/* User */}
        <div className="pt-2 mt-2 border-t border-white/[0.06]">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg group">
              <div className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center shrink-0 overflow-hidden text-indigo-400">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">
                  {user.firstName || user.email || t("user")}
                </p>
              </div>
              <button
                onClick={logout}
                className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
            >
              <LogIn className="w-4 h-4" />
              {t("login")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
