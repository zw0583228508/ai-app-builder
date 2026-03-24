import { useEffect, useState, useCallback } from "react";
import { useRoute } from "wouter";
import {
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface ProjectMeta {
  title: string;
  type: string;
  stack: string;
}

const TYPE_LABELS: Record<string, string> = {
  webapp: "אפליקציה",
  website: "אתר",
  landing: "דף נחיתה",
  mobile: "אפליקציית מובייל",
  portfolio: "פורטפוליו",
  other: "פרויקט",
};

export default function ShareView() {
  const [, params] = useRoute("/s/:token");
  const token = params?.token;
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [copied, setCopied] = useState(false);
  const [showBar, setShowBar] = useState(false);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const homeUrl =
    typeof window !== "undefined"
      ? window.location.origin +
        (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "")
      : "/";

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    fetch(`/api/projects/share/${token}/meta`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProjectMeta | null) => {
        if (data) setMeta(data);
      })
      .catch(() => {});
    // Delay bar reveal so iframe loads first
    const t = setTimeout(() => setShowBar(true), 800);
    return () => clearTimeout(t);
  }, [token]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  }, [currentUrl]);

  if (!token) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen bg-[#0a0a10] text-center"
        dir="rtl"
      >
        <AlertCircle className="w-12 h-12 text-red-400/60 mb-4" />
        <h1
          className="text-xl font-bold text-white/80"
          style={{ fontFamily: HE }}
        >
          קישור לא תקין
        </h1>
      </div>
    );
  }

  const typeLabel = meta ? (TYPE_LABELS[meta.type] ?? "פרויקט") : "פרויקט";
  const projectTitle = meta?.title ?? "פרויקט";

  return (
    <div className="flex flex-col h-screen bg-[#0a0a10] overflow-hidden">
      {/* Full-screen iframe */}
      <div className="flex-1 relative overflow-hidden">
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a10] z-10 gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin relative z-10" />
            </div>
            <p className="text-white/30 text-sm" style={{ fontFamily: HE }}>
              טוען פרויקט...
            </p>
          </div>
        )}

        {status === "error" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a10] z-10 text-center px-8"
            dir="rtl"
          >
            <AlertCircle className="w-12 h-12 text-red-400/60 mb-4" />
            <h1
              className="text-xl font-bold text-white/80 mb-2"
              style={{ fontFamily: HE }}
            >
              הפרויקט לא נמצא
            </h1>
            <p className="text-white/30 text-sm" style={{ fontFamily: HE }}>
              הקישור לא תקין או שהפרויקט נמחק.
            </p>
            <a
              href={homeUrl}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-colors"
              style={{ fontFamily: HE }}
            >
              <Sparkles className="w-4 h-4" />
              בנה פרויקט משלך
            </a>
          </div>
        )}

        <iframe
          src={`/api/projects/share/${token}`}
          className="w-full h-full border-none"
          title={projectTitle}
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
          sandbox="allow-scripts allow-forms allow-popups allow-modals"
        />
      </div>

      {/* Viral bottom bar */}
      <AnimatePresence>
        {showBar && status === "ok" && (
          <motion.div
            initial={{ y: 72, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 72, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              delay: 0.1,
            }}
            className="shrink-0 relative z-50"
          >
            {/* Gradient separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

            <div
              className="bg-[#0c0c16]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4"
              dir="rtl"
              style={{ fontFamily: HE }}
            >
              {/* Branding + Project info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider shrink-0">
                      נבנה עם AI Builder
                    </span>
                    <span className="text-white/15 text-[10px]">·</span>
                    <span className="text-[11px] text-white/50 font-medium truncate">
                      {typeLabel}: {projectTitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Copy link */}
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
                    copied
                      ? "bg-green-500/15 border-green-500/30 text-green-400"
                      : "bg-white/[0.04] border-white/10 text-white/40 hover:text-white/70 hover:border-white/20",
                  )}
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? "הועתק" : "העתק קישור"}
                </button>

                {/* Build your own CTA */}
                <a
                  href={homeUrl}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-[11px] font-bold transition-colors shadow-md shadow-indigo-500/25"
                >
                  בנה כזה בחינם
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
