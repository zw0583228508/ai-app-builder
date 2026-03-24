import { MousePointerClick, Pencil, X as XIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface SelectedElement {
  tag: string;
  selector: string;
  text?: string;
}

interface EditModeBannerProps {
  selectedEl: SelectedElement | null;
  onClose: () => void;
}

export function EditModeBanner({ selectedEl, onClose }: EditModeBannerProps) {
  const elLabel = selectedEl
    ? selectedEl.text && selectedEl.text.trim().length > 0
      ? `"${selectedEl.text.trim().slice(0, 36)}${selectedEl.text.trim().length > 36 ? "…" : ""}"`
      : `<${selectedEl.tag}>`
    : null;

  const hasSelection = !!selectedEl;

  return (
    <div
      className={cn(
        "shrink-0 border-b px-4 py-2 flex items-center justify-between gap-3 transition-all duration-300",
        hasSelection
          ? "bg-indigo-950/60 border-indigo-500/30"
          : "bg-white/[0.015] border-white/[0.05]",
      )}
      dir="rtl"
    >
      {/* Left: mode icon + label */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-300",
            hasSelection
              ? "bg-indigo-500/25 shadow-sm shadow-indigo-500/20"
              : "bg-white/[0.04]",
          )}
        >
          {hasSelection ? (
            <Pencil className="w-3 h-3 text-indigo-400" />
          ) : (
            <MousePointerClick className="w-3 h-3 text-slate-500" />
          )}
        </div>

        <div className="flex items-baseline gap-1.5 min-w-0">
          {hasSelection ? (
            <>
              <span
                className="text-[11px] text-slate-400 shrink-0"
                style={{ fontFamily: HE }}
              >
                נבחר:
              </span>
              <span
                className="text-[11px] font-semibold text-indigo-300 truncate max-w-[160px]"
                style={{ fontFamily: HE }}
                title={elLabel ?? ""}
              >
                {elLabel}
              </span>
              <span
                className="hidden sm:inline text-[11px] text-slate-500 shrink-0"
                style={{ fontFamily: HE }}
              >
                — כתוב בצ'אט מה לשנות
              </span>
            </>
          ) : (
            <span
              className="text-[11px] text-slate-500"
              style={{ fontFamily: HE }}
            >
              מצב עריכה ויזואלית — לחץ על אלמנט בתצוגה לבחור
            </span>
          )}
        </div>
      </div>

      {/* Right: indicators + close */}
      <div className="flex items-center gap-2 shrink-0">
        {hasSelection && (
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400/70" />
            <span
              className="hidden sm:inline text-[10px] text-indigo-400/60"
              style={{ fontFamily: HE }}
            >
              מוכן לעריכה
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          </div>
        )}
        <button
          onClick={onClose}
          className={cn(
            "p-1 rounded-md transition-colors",
            hasSelection
              ? "text-indigo-400/50 hover:text-indigo-300 hover:bg-indigo-500/15"
              : "text-slate-600 hover:text-slate-300 hover:bg-white/[0.06]",
          )}
          title="יציאה ממצב עריכה ויזואלית"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
