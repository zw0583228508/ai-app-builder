import { useState, useEffect } from "react";
import { X, Plus, Minus, GitCompare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNum?: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      result.push({ type: "unchanged", content: oldLines[i] });
      i++;
      j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: "added", content: newLines[j] });
      j++;
    } else if (i < m) {
      result.push({ type: "removed", content: oldLines[i] });
      i++;
    }
  }
  return result;
}

function collapseUnchanged(lines: DiffLine[], context = 3): DiffLine[] {
  const changed = new Set<number>();
  lines.forEach((l, i) => {
    if (l.type !== "unchanged") {
      for (let d = -context; d <= context; d++) {
        if (i + d >= 0 && i + d < lines.length) changed.add(i + d);
      }
    }
  });

  const result: DiffLine[] = [];
  let skipCount = 0;
  lines.forEach((l, i) => {
    if (changed.has(i)) {
      if (skipCount > 0) {
        result.push({ type: "unchanged", content: `... ${skipCount} שורות ללא שינוי ...`, lineNum: -1 });
        skipCount = 0;
      }
      result.push(l);
    } else {
      skipCount++;
    }
  });
  if (skipCount > 0) {
    result.push({ type: "unchanged", content: `... ${skipCount} שורות ללא שינוי ...`, lineNum: -1 });
  }
  return result;
}

interface DiffViewerProps {
  projectId: number;
  snapshotId: number;
  snapshotLabel: string;
  currentHtml: string;
  onClose: () => void;
}

export function DiffViewer({
  projectId,
  snapshotId,
  snapshotLabel,
  currentHtml,
  onClose,
}: DiffViewerProps) {
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ added: 0, removed: 0 });

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/projects/${projectId}/snapshots/${snapshotId}/raw`)
      .then((r) => {
        if (!r.ok) throw new Error("לא ניתן לטעון גרסה");
        return r.json() as Promise<{ html: string }>;
      })
      .then(({ html }) => {
        const lines = computeDiff(html, currentHtml);
        const collapsed = collapseUnchanged(lines);
        const added = lines.filter((l) => l.type === "added").length;
        const removed = lines.filter((l) => l.type === "removed").length;
        setStats({ added, removed });
        setDiff(collapsed);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, snapshotId, currentHtml]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0d0d1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Rubik', sans-serif" }}>
              השוואה: {snapshotLabel} → נוכחי
            </span>
            {!loading && !error && (
              <span className="flex items-center gap-1.5 text-xs font-mono ms-2">
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <Plus className="w-3 h-3" />{stats.added}
                </span>
                <span className="text-red-400 flex items-center gap-0.5">
                  <Minus className="w-3 h-3" />{stats.removed}
                </span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto font-mono text-xs leading-5">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span style={{ fontFamily: "'Rubik', sans-serif" }}>טוען השוואה...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-400 text-sm" style={{ fontFamily: "'Rubik', sans-serif" }}>
              {error}
            </div>
          ) : diff.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm" style={{ fontFamily: "'Rubik', sans-serif" }}>
              אין שינויים בין הגרסאות
            </div>
          ) : (
            <table className="w-full border-collapse" dir="ltr">
              <tbody>
                {diff.map((line, i) => {
                  const isSep = line.lineNum === -1;
                  return (
                    <tr
                      key={i}
                      className={cn(
                        "border-b border-white/[0.03]",
                        line.type === "added" && "bg-emerald-500/10",
                        line.type === "removed" && "bg-red-500/10",
                        isSep && "bg-transparent",
                      )}
                    >
                      <td
                        className={cn(
                          "w-6 px-2 text-center select-none shrink-0",
                          line.type === "added" && "text-emerald-400",
                          line.type === "removed" && "text-red-400",
                          line.type === "unchanged" && "text-transparent",
                        )}
                      >
                        {line.type === "added" ? "+" : line.type === "removed" ? "-" : ""}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-0.5 whitespace-pre-wrap break-all",
                          line.type === "added" && "text-emerald-300",
                          line.type === "removed" && "text-red-300",
                          line.type === "unchanged" && !isSep && "text-muted-foreground/60",
                          isSep && "text-muted-foreground/30 italic text-center py-1",
                        )}
                      >
                        {line.content}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-muted-foreground/50" style={{ fontFamily: "'Rubik', sans-serif" }}>
            ירוק = נוסף בגרסה הנוכחית · אדום = הוסר מהגרסה הישנה
          </p>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
            style={{ fontFamily: "'Rubik', sans-serif" }}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
