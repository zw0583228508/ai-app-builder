import { History, Clock, Eye, RotateCcw, Loader2, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface DiffStats {
  linesAdded: number;
  linesRemoved: number;
  changePercent: number;
  generationType: string;
  sectionsChanged: string[];
}

interface Snapshot {
  id: number;
  label: string;
  createdAt: string;
  snapshotType?: string | null;
  diffStats?: DiffStats | null;
}

interface PreviewHistoryMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  hasCode: boolean;
  showHistory: boolean;
  handleShowHistory: () => void;
  previewingSnap: number | null;
  loadingSnaps: boolean;
  snapshots: Snapshot[];
  restoringId: number | null;
  setPreviewingSnap: (id: number | null) => void;
  setIsLoading: (v: boolean) => void;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  setShowHistory: (v: boolean) => void;
  handleRestoreSnapshot: (snapshotId: number) => void;
  formatTime: (iso: string) => string;
  onDiff?: (snapshotId: number, label: string) => void;
}

function GenTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    create: {
      label: "יצירה",
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    edit: {
      label: "עריכה",
      cls: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    fix: {
      label: "תיקון",
      cls: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    refactor: {
      label: "שיפור",
      cls: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    },
    react: {
      label: "React",
      cls: "bg-sky-500/15 text-sky-400 border-sky-500/20",
    },
    html: {
      label: "HTML",
      cls: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    },
  };
  const { label, cls } = map[type] ?? {
    label: type,
    cls: "bg-white/5 text-muted-foreground border-white/10",
  };
  return (
    <span
      className={cn(
        "text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function DiffBadge({ added, removed }: { added: number; removed: number }) {
  if (added === 0 && removed === 0) return null;
  return (
    <span className="flex items-center gap-0.5 text-[9px] font-mono shrink-0">
      {added > 0 && <span className="text-emerald-400">+{added}</span>}
      {removed > 0 && <span className="text-red-400">−{removed}</span>}
    </span>
  );
}

export function PreviewHistoryMenu({
  menuRef,
  hasCode,
  showHistory,
  handleShowHistory,
  previewingSnap,
  loadingSnaps,
  snapshots,
  restoringId,
  setPreviewingSnap,
  setIsLoading,
  setRefreshKey,
  setShowHistory,
  handleRestoreSnapshot,
  formatTime,
  onDiff,
}: PreviewHistoryMenuProps) {
  if (!hasCode) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleShowHistory}
        className={cn(
          "p-2 rounded-lg text-muted-foreground hover:text-foreground transition-all",
          showHistory ? "bg-white/10 text-foreground" : "hover:bg-white/10",
        )}
        title="היסטוריית גרסאות"
      >
        <History className="w-4 h-4" />
      </button>

      {showHistory && (
        <div
          className="absolute left-0 top-full mt-1 w-72 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
          dir="rtl"
        >
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <p
              className="text-[11px] text-muted-foreground font-semibold"
              style={{ fontFamily: HE }}
            >
              היסטוריית גרסאות
            </p>
            {previewingSnap && (
              <button
                onClick={() => {
                  setPreviewingSnap(null);
                  setIsLoading(true);
                  setRefreshKey((k) => k + 1);
                }}
                className="text-[10px] text-primary hover:underline"
                style={{ fontFamily: HE }}
              >
                חזור לנוכחית
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loadingSnaps ? (
              <div className="p-4 text-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : snapshots.length === 0 ? (
              <p
                className="p-4 text-xs text-muted-foreground text-center"
                style={{ fontFamily: HE }}
              >
                אין גרסאות שמורות עדיין
              </p>
            ) : (
              snapshots.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2.5 hover:bg-white/5 group",
                    previewingSnap === s.id && "bg-primary/10",
                  )}
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p
                      className="text-xs font-medium text-foreground/80 truncate"
                      style={{ fontFamily: HE }}
                    >
                      {s.label}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[10px] text-muted-foreground/50">
                        {formatTime(s.createdAt)}
                      </p>
                      {s.snapshotType && (
                        <>
                          <span className="text-muted-foreground/20 text-[10px]">
                            ·
                          </span>
                          <GenTypeBadge type={s.snapshotType} />
                        </>
                      )}
                      {s.diffStats && (
                        <>
                          <span className="text-muted-foreground/20 text-[10px]">
                            ·
                          </span>
                          <GenTypeBadge type={s.diffStats.generationType} />
                          <DiffBadge
                            added={s.diffStats.linesAdded}
                            removed={s.diffStats.linesRemoved}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                    <button
                      onClick={() => {
                        setPreviewingSnap(s.id);
                        setIsLoading(true);
                        setRefreshKey((k) => k + 1);
                        setShowHistory(false);
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/10"
                      title="תצוגה מקדימה"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    {onDiff && (
                      <button
                        onClick={() => {
                          onDiff(s.id, s.label);
                          setShowHistory(false);
                        }}
                        className="p-1 rounded text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        title="השוואת שינויים"
                      >
                        <GitCompare className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRestoreSnapshot(s.id)}
                      disabled={restoringId === s.id}
                      className="p-1 rounded text-primary hover:bg-primary/20"
                      title="שחזר גרסה זו"
                    >
                      {restoringId === s.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
