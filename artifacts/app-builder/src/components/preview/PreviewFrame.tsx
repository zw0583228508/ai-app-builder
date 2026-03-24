import { useRef } from "react";
import { Code2, AlertCircle, Zap, X as XIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { InsightsBanner } from "@/components/InsightsBanner";
import type { DeviceSize } from "./DeviceSwitcher";

const HE = "'Rubik', sans-serif";

interface PreviewError {
  message: string;
  errorType: string;
  line?: number;
  dismissed?: boolean;
  autoFix?: {
    fix_description?: string;
    code_patch?: string;
    confidence?: string;
  };
}

interface PreviewFrameProps {
  projectId: number;
  isStreaming: boolean;
  isLoading: boolean;
  liveHtml: string | null;
  liveLines: number;
  hasCode: boolean;
  isReactStack: boolean;
  deviceSize: DeviceSize;
  pendingRefresh: boolean;
  previewUrl: string;
  refreshKey: number;
  previewingSnap: number | null;
  previewErrors: PreviewError[];
  setPreviewErrors: React.Dispatch<React.SetStateAction<PreviewError[]>>;
  setIsLoading: (val: boolean) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  liveIframeRef: React.RefObject<HTMLIFrameElement | null>;
  justUpdated?: boolean;
}

export function PreviewFrame({
  projectId,
  isStreaming,
  isLoading,
  liveHtml,
  liveLines,
  hasCode,
  isReactStack,
  deviceSize,
  pendingRefresh,
  previewUrl,
  refreshKey,
  previewingSnap,
  previewErrors,
  setPreviewErrors,
  setIsLoading,
  iframeRef,
  liveIframeRef,
  justUpdated = false,
}: PreviewFrameProps) {
  return (
    <>
      {/* Insights Banner — floats above the preview */}
      <InsightsBanner
        projectId={projectId}
        onFixRequest={(fix) => {
          window.dispatchEvent(
            new CustomEvent("builder-prefill-message", {
              detail: { text: fix },
            }),
          );
        }}
      />

      <div
        className={cn(
          "flex-1 relative flex items-center justify-center",
          deviceSize !== "desktop" && "bg-[#111]/80 p-4",
        )}
      >
        {/* Device frame wrapper */}
        <div
          className={cn(
            "relative overflow-hidden transition-all duration-300",
            deviceSize === "desktop" && "absolute inset-0",
            deviceSize === "tablet" &&
              "w-[768px] max-w-full h-full max-h-[1024px] rounded-2xl border shadow-2xl shadow-black/60 transition-colors duration-700",
            deviceSize === "tablet" && justUpdated
              ? "border-indigo-500/60 shadow-indigo-500/10"
              : deviceSize === "tablet"
                ? "border-white/10"
                : "",
            deviceSize === "mobile" &&
              "w-[390px] max-w-full h-full max-h-[844px] rounded-[2rem] border-[3px] shadow-2xl shadow-black/60 transition-colors duration-700",
            deviceSize === "mobile" && justUpdated
              ? "border-indigo-400/70"
              : deviceSize === "mobile"
                ? "border-white/20"
                : "",
          )}
        >
          {/* Just-updated ring for desktop mode */}
          {justUpdated && deviceSize === "desktop" && (
            <div className="absolute inset-0 z-50 pointer-events-none animate-in fade-in duration-150">
              <div className="absolute inset-0 ring-1 ring-indigo-500/50 animate-out fade-out duration-[2000ms] fill-mode-forwards" />
              <div
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-500/40 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] text-indigo-200 font-semibold shadow-lg shadow-indigo-500/10 animate-out fade-out slide-out-to-top-1 duration-[2000ms] fill-mode-forwards"
                style={{ fontFamily: HE }}
              >
                <Check className="w-3 h-3 text-indigo-400" strokeWidth={2.5} />
                עודכן
              </div>
            </div>
          )}
          {/* Device notch (mobile only) */}
          {deviceSize === "mobile" && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black z-20 rounded-b-xl" />
          )}

          {/* Live streaming overlay */}
          {isStreaming && (
            <div className="absolute inset-0 bg-[#0d0d14] z-20 flex flex-col items-center justify-center gap-5">
              {/* Code rain animation */}
              <div
                className="relative w-48 h-24 overflow-hidden opacity-30 font-mono text-[9px] text-indigo-400 leading-tight select-none"
                dir="ltr"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="absolute animate-pulse"
                    style={{
                      left: `${i * 12}%`,
                      top: `${(i * 37) % 100}%`,
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: `${0.8 + i * 0.15}s`,
                    }}
                  >
                    {
                      [
                        "<div>",
                        "fn()",
                        "{}",
                        "=>",
                        "</>",
                        "if",
                        "const",
                        "var",
                        "let",
                      ][i % 9]
                    }
                  </div>
                ))}
              </div>

              {/* Progress indicator */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <p
                  className="text-slate-500 text-xs font-medium"
                  style={{ fontFamily: HE }}
                >
                  {liveLines === 0
                    ? "מנתח את הבקשה..."
                    : liveLines < 15
                      ? "מניח תשתית..."
                      : liveLines < 50
                        ? `בונה מבנה — ${liveLines.toLocaleString("he-IL")} שורות`
                        : liveLines < 130
                          ? `כותב לוגיקה — ${liveLines.toLocaleString("he-IL")} שורות`
                          : liveLines < 280
                            ? `מעצב ממשק — ${liveLines.toLocaleString("he-IL")} שורות`
                            : liveLines < 450
                              ? `מלטש פרטים — ${liveLines.toLocaleString("he-IL")} שורות`
                              : `כמעט מוכן — ${liveLines.toLocaleString("he-IL")} שורות`}
                </p>
              </div>

              {/* Live HTML preview — shown once enough content is available */}
              {liveHtml &&
                liveHtml.length > 500 &&
                (liveHtml.includes("<html") ||
                  liveHtml.includes("<!DOCTYPE") ||
                  liveHtml.includes("<body")) && (
                  <div className="absolute inset-0 z-30 opacity-0 hover:opacity-100 transition-opacity duration-500">
                    <iframe
                      ref={liveIframeRef}
                      srcDoc={liveHtml}
                      className="w-full h-full border-none bg-white"
                      sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    />
                  </div>
                )}
            </div>
          )}

          {/* Static iframe */}
          <div
            className={cn(
              "absolute inset-0 bg-white",
              isStreaming ? "opacity-0 pointer-events-none" : "opacity-100",
            )}
          >
            {isLoading && !isStreaming && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0d0d14]/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                  <Code2 className="w-10 h-10 text-indigo-500 animate-pulse relative z-10" />
                </div>
                <p
                  className="mt-4 text-sm font-medium text-slate-100"
                  style={{ fontFamily: HE }}
                >
                  טוען תצוגה מקדימה...
                </p>
              </div>
            )}

            {!hasCode && !isLoading && !isStreaming && !pendingRefresh && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d14] text-center p-8"
                dir="rtl"
              >
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full scale-150" />
                  <div className="relative w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl">
                    {isReactStack ? "⚛️" : "✦"}
                  </div>
                </div>
                <p
                  className="text-slate-200 text-sm font-semibold mb-2"
                  style={{ fontFamily: HE }}
                >
                  {isReactStack ? "מוכן לבנות משהו מדהים" : "מה נבנה היום?"}
                </p>
                <p
                  className="text-slate-500 text-xs leading-relaxed max-w-[220px]"
                  style={{ fontFamily: HE }}
                >
                  {isReactStack
                    ? "כתוב בצ'אט מה תרצה — קומפוננט, עמוד, פיצ'ר — ואבנה לך תוך שניות"
                    : "דף נחיתה, חנות, אפליקציה — תאר בצ'אט ואבנה תוך שניות"}
                </p>
              </div>
            )}

            <iframe
              ref={iframeRef}
              key={`${refreshKey}-${previewingSnap}`}
              src={hasCode ? previewUrl : "about:blank"}
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </div>
        </div>

        {/* Device label badge */}
        {deviceSize !== "desktop" && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/30 font-mono"
            dir="ltr"
          >
            {deviceSize === "tablet" ? "768px — Tablet" : "390px — Mobile"}
          </div>
        )}

        {/* AI Error Fixer bar */}
        {previewErrors
          .filter((e) => !e.dismissed)
          .slice(-1)
          .map((err, idx) => (
            <div
              key={idx}
              className="absolute bottom-0 inset-x-0 z-50 flex items-start gap-3 p-3 bg-red-950/95 border-t border-red-500/40 backdrop-blur-sm"
              dir="rtl"
            >
              <div className="shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[11px] font-semibold text-red-300"
                  style={{ fontFamily: HE }}
                >
                  שגיאה{" "}
                  {err.errorType === "promise"
                    ? "ב-Promise"
                    : err.errorType === "console"
                      ? "ב-console"
                      : "בקוד"}
                  {err.line ? ` (שורה ${err.line})` : ""}
                </p>
                <p
                  className="text-[10px] text-red-400/80 font-mono truncate mt-0.5"
                  dir="ltr"
                >
                  {err.message}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("builder-prefill-message", {
                        detail: `יש שגיאת JavaScript בתצוגה המקדימה:\n\`\`\`\n${err.message}\n\`\`\`\nאנא תקן את הבאג הזה.`,
                      }),
                    );
                    setPreviewErrors([]);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/30 hover:bg-red-500/50 border border-red-500/40 rounded-md text-[11px] font-semibold text-red-200 hover:text-white transition-colors"
                  style={{ fontFamily: HE }}
                >
                  <Zap className="w-3 h-3" />
                  תקן עם AI
                </button>
                <button
                  onClick={() =>
                    setPreviewErrors((prev) =>
                      prev.map((e, i) =>
                        i === prev.length - 1 ? { ...e, dismissed: true } : e,
                      ),
                    )
                  }
                  className="p-1 rounded-md hover:bg-red-500/20 text-red-400/60 hover:text-red-300 transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
