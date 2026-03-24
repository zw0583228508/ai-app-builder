import { Globe, Check, Copy, Users, Loader2, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface PreviewShareDialogProps {
  shareUrl: string | null;
  customSlug: string;
  shareCopied: boolean;
  slugSaving: boolean;
  slugError: string | null;
  slugSuccess: boolean;
  viewerCount: number;
  collabConnected: boolean;
  setShowShareDialog: (v: boolean) => void;
  setCustomSlug: (v: string) => void;
  setSlugError: (v: string | null) => void;
  setSlugSuccess: (v: boolean) => void;
  handleCopyShareUrl: () => void;
  handleSaveSlug: () => void;
}

export function PreviewShareDialog({
  shareUrl,
  customSlug,
  shareCopied,
  slugSaving,
  slugError,
  slugSuccess,
  viewerCount,
  collabConnected,
  setShowShareDialog,
  setCustomSlug,
  setSlugError,
  setSlugSuccess,
  handleCopyShareUrl,
  handleSaveSlug,
}: PreviewShareDialogProps) {
  if (!shareUrl) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShowShareDialog(false)}
    >
      <div
        className="w-full max-w-md mx-4 bg-[#0f0f18] border border-white/15 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p
                className="font-bold text-foreground text-sm"
                style={{ fontFamily: HE }}
              >
                שתף את הפרויקט
              </p>
              <p
                className="text-[11px] text-muted-foreground"
                style={{ fontFamily: HE }}
              >
                קישור ציבורי לפרויקט שלך
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowShareDialog(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4" style={{ fontFamily: HE }}>
          {/* Share URL */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              קישור לשיתוף
            </p>
            <div className="flex gap-2">
              <div
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground/80 font-mono truncate"
                dir="ltr"
              >
                {shareUrl}
              </div>
              <button
                onClick={handleCopyShareUrl}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0",
                  shareCopied
                    ? "bg-green-500/20 border-green-500/40 text-green-400"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10",
                )}
              >
                {shareCopied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {shareCopied ? "הועתק!" : "העתק"}
              </button>
            </div>
          </div>

          {/* Custom slug */}
          <div className="p-4 bg-white/3 border border-white/8 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-bold text-foreground">
                כתובת מותאמת אישית
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              קבע כתובת קצרה וקלה לזכירה לפרויקט שלך (a-z, 0-9, מקפים)
            </p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-primary/50 transition-colors">
                <span className="px-2 text-[11px] text-muted-foreground/60 shrink-0">
                  /s/
                </span>
                <input
                  value={customSlug}
                  onChange={(e) => {
                    setCustomSlug(e.target.value);
                    setSlugError(null);
                    setSlugSuccess(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveSlug()}
                  placeholder="my-cool-app"
                  className="flex-1 bg-transparent py-2 pr-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none"
                  dir="ltr"
                  maxLength={50}
                />
              </div>
              <button
                onClick={handleSaveSlug}
                disabled={slugSaving || !customSlug.trim()}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0",
                  slugSuccess
                    ? "bg-green-500/20 text-green-400"
                    : "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30",
                )}
              >
                {slugSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : slugSuccess ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  "שמור"
                )}
              </button>
            </div>
            {slugError && (
              <p className="text-[11px] text-red-400">{slugError}</p>
            )}
            {slugSuccess && (
              <p className="text-[11px] text-green-400">
                ✓ הכתובת עודכנה בהצלחה
              </p>
            )}
          </div>

          {/* Viewer count */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-green-500/8 border border-green-500/15 rounded-xl">
            <Users className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                {viewerCount}{" "}
                {viewerCount === 1 ? "משתמש צופה" : "משתמשים צופים"} עכשיו
              </p>
              <p className="text-[10px] text-muted-foreground">
                כולל אתה · מתעדכן בזמן אמת
              </p>
            </div>
            <div
              className={cn(
                "w-2 h-2 rounded-full ml-auto shrink-0",
                collabConnected
                  ? "bg-green-400 animate-pulse"
                  : "bg-muted-foreground/30",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
