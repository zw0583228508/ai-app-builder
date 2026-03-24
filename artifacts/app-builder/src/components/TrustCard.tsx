import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

export interface ChangeSummary {
  generationType: "first" | "full" | "patch";
  linesAdded: number;
  linesRemoved: number;
  changePercent: number;
  sectionsChanged: string[];
  filesChanged?: string[];
}

interface TrustCardProps {
  summary: ChangeSummary;
}

const TYPE_CONFIG = {
  first: {
    label: "נבנה מחדש",
    icon: "✦",
    color: "border-indigo-500/20 bg-indigo-500/[0.05]",
    badge: "text-indigo-400",
    dot: "bg-indigo-400",
  },
  full: {
    label: "עדכון מלא",
    icon: "↻",
    color: "border-blue-500/20 bg-blue-500/[0.05]",
    badge: "text-blue-400",
    dot: "bg-blue-400",
  },
  patch: {
    label: "עדכון ממוקד",
    icon: "✎",
    color: "border-emerald-500/20 bg-emerald-500/[0.05]",
    badge: "text-emerald-400",
    dot: "bg-emerald-400",
  },
};

function humanSectionName(raw: string): string {
  const isAdded = raw.startsWith("+ ");
  const isRemoved = raw.startsWith("- ");
  const name = raw.replace(/^[+\-] /, "");
  const map: Record<string, string> = {
    "header/nav": "ניווט",
    "hero section": "Hero",
    about: "אודות",
    features: "פיצ'רים",
    "contact form": "טופס יצירת קשר",
    table: "טבלה",
    "gallery/images": "גלריה",
    footer: "פוטר",
    "modal/dialog": "חלון קופץ",
    "chart/graph": "גרף",
    "styles (CSS)": "עיצוב",
    "scripts (JS)": "לוגיקה",
  };
  const label = map[name] || name;
  if (isAdded) return `+ ${label}`;
  if (isRemoved) return `− ${label}`;
  return label;
}

export function TrustCard({ summary }: TrustCardProps) {
  const cfg = TYPE_CONFIG[summary.generationType];
  const sections = summary.sectionsChanged
    .slice(0, 5)
    .map((s) => ({
      raw: s,
      label: humanSectionName(s),
      isAdded: s.startsWith("+ "),
      isRemoved: s.startsWith("- "),
    }));

  return (
    <div
      className={cn("rounded-xl border px-3.5 py-2.5 text-[11px]", cfg.color)}
      style={{ fontFamily: HE }}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
        <span className={cn("font-semibold text-[11px]", cfg.badge)}>
          {cfg.label}
        </span>
        {summary.changePercent > 0 && summary.generationType !== "first" && (
          <span className="text-slate-600 mr-auto text-[10px]">
            {summary.changePercent}% שונה
          </span>
        )}
      </div>

      {/* Sections changed */}
      {sections.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {sections.map((s, i) => (
            <span
              key={i}
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] border",
                s.isAdded
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                  : s.isRemoved
                    ? "bg-red-500/10 text-red-400 border-red-500/15"
                    : "bg-white/5 text-slate-500 border-white/8",
              )}
            >
              {s.label}
            </span>
          ))}
        </div>
      )}

      {/* Files (React projects) */}
      {summary.filesChanged && summary.filesChanged.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {summary.filesChanged.slice(0, 4).map((f, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/15 font-mono"
              dir="ltr"
            >
              {f.split("/").pop()}
            </span>
          ))}
          {summary.filesChanged.length > 4 && (
            <span className="text-slate-600 text-[10px] py-0.5">
              +{summary.filesChanged.length - 4} קבצים
            </span>
          )}
        </div>
      )}
    </div>
  );
}
