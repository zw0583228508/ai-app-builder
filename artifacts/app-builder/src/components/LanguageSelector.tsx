import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useLang, LANGUAGES, type LangCode } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { lang, setLang, t, meta } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition-all",
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-[12px]"
        )}
        title={t("language")}
      >
        <span className="text-base leading-none">{meta.flag}</span>
        {!compact && (
          <>
            <span className="text-white/60 font-medium">{meta.nativeLabel}</span>
            <ChevronDown className={cn("w-3 h-3 text-white/30 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 bg-[hsl(220,16%,8%)] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/50 py-1.5 overflow-hidden",
            compact ? "left-0 w-48" : "right-0 w-52"
          )}
          style={{ direction: "ltr" }}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-white/25 uppercase tracking-widest border-b border-white/[0.06] mb-1">
            {t("language")}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code as LangCode); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.06] transition-colors",
                  lang === l.code && "bg-white/[0.05]"
                )}
              >
                <span className="text-xl leading-none w-6 text-center">{l.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-white/80">{l.nativeLabel}</div>
                  <div className="text-[10px] text-white/35">{l.label}</div>
                </div>
                {lang === l.code && <Check className="w-3.5 h-3.5 text-[hsl(191,90%,42%)] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
