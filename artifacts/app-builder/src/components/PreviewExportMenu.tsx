import {
  Github,
  Download,
  FolderArchive,
  Rocket,
  Layers,
  Share2,
  ChevronDown,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { readCapabilities } from "@/hooks/use-integrations";

const HE = "'Rubik', sans-serif";

interface PreviewExportMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  hasCode: boolean;
  showExportMenu: boolean;
  setShowExportMenu: React.Dispatch<React.SetStateAction<boolean>>;
  netlifyDeploying: boolean;
  exportSuccess: string | null;
  gistLoading: boolean;
  forkLoading: boolean;
  templateLoading: boolean;
  handleGitHubGist: () => void;
  handleDownload: () => void;
  handleDownloadZip: () => void;
  handleOpenCodePen: () => void;
  handleOpenStackBlitz: () => void;
  handleNetlifyDrop: () => void;
  handleNetlifyApiDeploy: () => void;
  handleFork: () => void;
  handleSaveTemplate: () => void;
}

export function PreviewExportMenu({
  menuRef,
  hasCode,
  showExportMenu,
  setShowExportMenu,
  netlifyDeploying,
  exportSuccess,
  gistLoading,
  forkLoading,
  templateLoading,
  handleGitHubGist,
  handleDownload,
  handleDownloadZip,
  handleOpenCodePen,
  handleOpenStackBlitz,
  handleNetlifyDrop,
  handleNetlifyApiDeploy,
  handleFork,
  handleSaveTemplate,
}: PreviewExportMenuProps) {
  if (!hasCode) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowExportMenu((v) => !v)}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
          netlifyDeploying
            ? "bg-[#00ad9f]/20 border-[#00ad9f]/40 text-[#00ad9f]"
            : showExportMenu
              ? "bg-primary/20 border-primary/40 text-primary"
              : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10",
        )}
        style={{ fontFamily: HE }}
      >
        {netlifyDeploying ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : exportSuccess ? (
          <Check className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Share2 className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {netlifyDeploying ? "מפרסם..." : exportSuccess || "ייצוא"}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform",
            showExportMenu && "rotate-180",
          )}
        />
      </button>

      {showExportMenu && (
        <div
          className="absolute left-0 top-full mt-1 w-64 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
          dir="rtl"
        >
          <div className="px-3 py-2 border-b border-white/5">
            <p
              className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider"
              style={{ fontFamily: HE }}
            >
              ייצוא ופרסום
            </p>
          </div>
          {[
            {
              icon: <Github className="w-3.5 h-3.5 text-white" />,
              bg: "bg-[#333]/40",
              label: "שמור ב-GitHub Gist",
              sub: "ייצוא ישיר לחשבון GitHub",
              action: handleGitHubGist,
              extra: !readCapabilities().github && (
                <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 rounded-sm">
                  חבר GitHub →
                </span>
              ),
              loading: gistLoading,
            },
            {
              icon: <Download className="w-3.5 h-3.5 text-blue-400" />,
              bg: "bg-blue-500/20",
              label: "הורד HTML",
              sub: "קובץ index.html מלא",
              action: handleDownload,
            },
            {
              icon: <FolderArchive className="w-3.5 h-3.5 text-yellow-400" />,
              bg: "bg-yellow-500/20",
              label: "הורד כ-ZIP",
              sub: "HTML + README כארכיון",
              action: handleDownloadZip,
            },
            {
              icon: (
                <span className="text-xs font-bold text-[#ae63e4]">CP</span>
              ),
              bg: "bg-[#ae63e4]/20",
              label: "פתח ב-CodePen",
              sub: "עריכה ושיתוף אונליין",
              action: handleOpenCodePen,
            },
            {
              icon: (
                <span className="text-xs font-bold text-[#1389fd]">SB</span>
              ),
              bg: "bg-[#1389fd]/20",
              label: "פתח ב-StackBlitz",
              sub: "IDE מלא בדפדפן",
              action: handleOpenStackBlitz,
            },
            {
              icon: <span className="text-xs font-bold text-[#00ad9f]">N</span>,
              bg: "bg-[#00ad9f]/20",
              label: "Netlify Drop",
              sub: "הורד וגרור להפעלה",
              action: handleNetlifyDrop,
              border: true,
            },
            {
              icon: <Rocket className="w-3.5 h-3.5 text-[#00ad9f]" />,
              bg: "bg-[#00ad9f]/20",
              label: "פרסם ל-Netlify API",
              sub: readCapabilities().netlify
                ? "פרסום אוטומטי — חי בשניות!"
                : "דורש טוקן Netlify →",
              action: handleNetlifyApiDeploy,
              loading: netlifyDeploying,
              extra: !readCapabilities().netlify && (
                <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 rounded-sm">
                  חבר →
                </span>
              ),
            },
            {
              icon: <span className="text-xs font-bold text-white">⑂</span>,
              bg: "bg-violet-500/20",
              label: "פצל פרויקט (Fork)",
              sub: "העתק לפרויקט חדש עצמאי",
              action: handleFork,
              loading: forkLoading,
              border: true,
            },
            {
              icon: <Layers className="w-3.5 h-3.5 text-cyan-400" />,
              bg: "bg-cyan-500/20",
              label: "שמור כתבנית",
              sub: "הוסף לגלריית התבניות",
              action: handleSaveTemplate,
              loading: templateLoading,
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              disabled={item.loading}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-white/5 transition-all text-right",
                item.border && "border-t border-white/5",
              )}
              style={{ fontFamily: HE }}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  item.bg,
                )}
              >
                {item.loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  item.icon
                )}
              </div>
              <div>
                <div className="text-sm font-medium flex items-center gap-1.5">
                  {item.label}
                  {item.extra}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {item.sub}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
