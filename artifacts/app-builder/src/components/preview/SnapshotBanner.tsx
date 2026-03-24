import { Clock } from "lucide-react";

const HE = "'Rubik', sans-serif";

interface SnapshotBannerProps {
  previewingSnap: number | null;
  restoringId: number | null;
  onRestore: (snapId: number) => void;
  onBack: () => void;
}

export function SnapshotBanner({
  previewingSnap,
  restoringId,
  onRestore,
  onBack,
}: SnapshotBannerProps) {
  if (!previewingSnap) return null;

  return (
    <div
      className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between"
      dir="rtl"
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-400" />
        <span
          className="text-xs text-amber-400 font-medium"
          style={{ fontFamily: HE }}
        >
          מציג גרסה שמורה — לא הגרסה הנוכחית
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onRestore(previewingSnap)}
          className="text-xs text-amber-400 hover:text-amber-300 font-medium"
          style={{ fontFamily: HE }}
          disabled={!!restoringId}
        >
          {restoringId ? "משחזר..." : "שחזר גרסה זו"}
        </button>
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground"
          style={{ fontFamily: HE }}
        >
          חזור
        </button>
      </div>
    </div>
  );
}
