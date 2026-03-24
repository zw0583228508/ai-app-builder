import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Github,
  Rocket,
  Loader2,
  Check,
  ExternalLink,
  ChevronDown,
  Pencil,
  Zap,
  Circle,
  GitBranch,
  Globe,
} from "lucide-react";
import {
  ProjectWithMessages,
  useUpdateProject,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface ProjectHeaderProps {
  project: ProjectWithMessages;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();

  const [isBuilding, setIsBuilding] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title);
  const [showGithubMenu, setShowGithubMenu] = useState(false);
  const [showDeployMenu, setShowDeployMenu] = useState(false);
  const githubMenuRef = useRef<HTMLDivElement>(null);
  const deployMenuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const hasGithub = !!project.githubRepoUrl;
  const hasDeployment = !!project.lastDeployUrl;

  useEffect(() => {
    const onStreaming = (e: Event) => {
      const { projectId } = (e as CustomEvent<{ projectId: number }>).detail;
      if (projectId === project.id) setIsBuilding(true);
    };
    const onFinished = (e: Event) => {
      const { projectId } = (e as CustomEvent<{ projectId: number }>).detail;
      if (projectId === project.id) setIsBuilding(false);
    };
    window.addEventListener("builder-preview-streaming", onStreaming);
    window.addEventListener("builder-preview-updated", onFinished);
    return () => {
      window.removeEventListener("builder-preview-streaming", onStreaming);
      window.removeEventListener("builder-preview-updated", onFinished);
    };
  }, [project.id]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        githubMenuRef.current &&
        !githubMenuRef.current.contains(e.target as Node)
      )
        setShowGithubMenu(false);
      if (
        deployMenuRef.current &&
        !deployMenuRef.current.contains(e.target as Node)
      )
        setShowDeployMenu(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    if (isRenaming) setTimeout(() => renameRef.current?.select(), 20);
  }, [isRenaming]);

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === project.title) {
      setIsRenaming(false);
      return;
    }
    setIsRenaming(false);
    await updateProject.mutateAsync({
      id: project.id,
      data: { title: trimmed },
    });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const sendChatAction = (action: string) => {
    setShowGithubMenu(false);
    setShowDeployMenu(false);
    window.dispatchEvent(
      new CustomEvent("builder-header-action", { detail: { action } }),
    );
  };

  const statusColor = isBuilding
    ? "text-indigo-400"
    : hasDeployment
      ? "text-emerald-400"
      : hasGithub
        ? "text-sky-400"
        : "text-slate-600";

  const statusLabel = isBuilding
    ? "בונה..."
    : hasDeployment
      ? "פורסם"
      : hasGithub
        ? "מסונכרן"
        : "טיוטה";

  return (
    <header
      className="h-12 bg-[#0a0a0f] border-b border-white/[0.06] flex items-center px-3 gap-2 shrink-0 z-30"
      dir="rtl"
    >
      {/* Back to home */}
      <button
        onClick={() => navigate("/")}
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all shrink-0"
        title="חזור לדף הבית"
      >
        <ArrowRight className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-white/[0.06] shrink-0" />

      {/* Project name */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            onBlur={handleRename}
            className="text-sm font-semibold bg-[#16161f] border border-indigo-500/40 rounded-lg px-2 py-0.5 text-slate-100 focus:outline-none min-w-0 max-w-[200px]"
            style={{ fontFamily: HE }}
          />
        ) : (
          <button
            onClick={() => {
              setRenameValue(project.title);
              setIsRenaming(true);
            }}
            className="text-sm font-semibold text-slate-200 truncate max-w-[180px] hover:text-indigo-300 transition-colors flex items-center gap-1 group"
            style={{ fontFamily: HE }}
          >
            <span className="truncate">{project.title}</span>
            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 shrink-0" />
          </button>
        )}

        {/* Status pill */}
        <div
          className={cn(
            "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] shrink-0",
            statusColor,
          )}
        >
          {isBuilding ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
          ) : (
            <Circle
              className={cn(
                "w-1.5 h-1.5 fill-current",
                hasDeployment
                  ? "text-emerald-400"
                  : hasGithub
                    ? "text-sky-400"
                    : "text-slate-600",
              )}
            />
          )}
          <span style={{ fontFamily: HE }}>{statusLabel}</span>
        </div>
      </div>

      {/* Right: primary actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* GitHub */}
        <div className="relative" ref={githubMenuRef}>
          <button
            onClick={() => setShowGithubMenu((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
              hasGithub
                ? "text-slate-300 border-white/[0.08] hover:border-white/[0.16] hover:text-slate-100"
                : "text-slate-500 border-white/[0.06] hover:text-slate-300 hover:border-white/[0.10]",
            )}
            style={{ fontFamily: HE }}
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {hasGithub ? project.githubRepoName || "GitHub" : "GitHub"}
            </span>
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform opacity-50",
                showGithubMenu && "rotate-180",
              )}
            />
          </button>

          {showGithubMenu && (
            <div
              className="absolute top-full mt-1.5 left-0 w-52 bg-[#16161f] border border-white/[0.08] rounded-xl shadow-xl shadow-black/50 overflow-hidden z-50"
              dir="rtl"
            >
              {hasGithub ? (
                <>
                  <a
                    href={project.githubRepoUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.04] transition-all"
                    style={{ fontFamily: HE }}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    פתח ב-GitHub
                  </a>
                  <button
                    onClick={() => sendChatAction("git-push")}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.04] transition-all text-right"
                    style={{ fontFamily: HE }}
                  >
                    <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                    Push שינויים
                  </button>
                </>
              ) : (
                <button
                  onClick={() => sendChatAction("github-connect")}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.04] transition-all text-right"
                  style={{ fontFamily: HE }}
                >
                  <Github className="w-3.5 h-3.5 text-slate-500" />
                  חבר ל-GitHub
                </button>
              )}
            </div>
          )}
        </div>

        {/* Publish / Deploy */}
        <div className="relative" ref={deployMenuRef}>
          <button
            onClick={() =>
              hasDeployment
                ? setShowDeployMenu((v) => !v)
                : sendChatAction("deploy")
            }
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm",
              hasDeployment
                ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20",
            )}
            style={{ fontFamily: HE }}
          >
            {hasDeployment ? (
              <>
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">פורסם</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </>
            ) : (
              <>
                <Rocket className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">פרסם</span>
              </>
            )}
          </button>

          {showDeployMenu && hasDeployment && (
            <div
              className="absolute top-full mt-1.5 left-0 w-52 bg-[#16161f] border border-white/[0.08] rounded-xl shadow-xl shadow-black/50 overflow-hidden z-50"
              dir="rtl"
            >
              <a
                href={project.lastDeployUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-emerald-300 hover:bg-white/[0.04] transition-all"
                style={{ fontFamily: HE }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                פתח אתר חי
              </a>
              <button
                onClick={() => sendChatAction("deploy")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.04] transition-all text-right"
                style={{ fontFamily: HE }}
              >
                <Zap className="w-3.5 h-3.5 text-slate-500" />
                עדכן גרסה
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
