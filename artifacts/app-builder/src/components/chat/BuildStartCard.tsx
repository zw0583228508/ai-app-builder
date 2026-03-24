import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, Layers, Database, Globe, Zap } from "lucide-react";

const PRIMARY = "hsl(191,90%,42%)";
const HE = "'Rubik', sans-serif";

interface Feature {
  icon: React.ReactNode;
  label: string;
  labelHe: string;
  delay: number;
}

const FEATURES: Feature[] = [
  { icon: <Layers className="w-3.5 h-3.5" />, label: "Full UI", labelHe: "ממשק מלא", delay: 0.3 },
  { icon: <Zap className="w-3.5 h-3.5" />, label: "App logic", labelHe: "לוגיקת האפליקציה", delay: 0.55 },
  { icon: <Database className="w-3.5 h-3.5" />, label: "Database structure", labelHe: "מבנה מסד הנתונים", delay: 0.8 },
  { icon: <Globe className="w-3.5 h-3.5" />, label: "Deploy-ready", labelHe: "מוכן לפרסום", delay: 1.05 },
];

interface BuildStartCardProps {
  prompt: string;
  isRTL?: boolean;
  isDone?: boolean;
}

function deriveAppLabel(prompt: string, isRTL: boolean): string {
  const p = prompt.toLowerCase();
  if (isRTL) {
    if (p.includes("קריוקי") || p.includes("karaoke")) return "אפליקציית קריוקי";
    if (p.includes("saas") || p.includes("saa")) return "פלטפורמת SaaS";
    if (p.includes("מרקטפלייס") || p.includes("marketplace")) return "מרקטפלייס";
    if (p.includes("חנות") || p.includes("store") || p.includes("ecommerce")) return "חנות אונליין";
    if (p.includes("דשבורד") || p.includes("dashboard")) return "דשבורד ניהולי";
    if (p.includes("מובייל") || p.includes("mobile")) return "אפליקציית מובייל";
    return "האפליקציה שלך";
  } else {
    if (p.includes("karaoke")) return "Karaoke App";
    if (p.includes("saas") || p.includes("saa")) return "SaaS Platform";
    if (p.includes("marketplace")) return "Marketplace";
    if (p.includes("store") || p.includes("ecommerce") || p.includes("shop")) return "Online Store";
    if (p.includes("dashboard")) return "Admin Dashboard";
    if (p.includes("mobile") || p.includes("app")) return "Mobile App";
    if (p.includes("ai") || p.includes("tool")) return "AI Tool";
    return "Your App";
  }
}

export function BuildStartCard({ prompt, isRTL = true, isDone = false }: BuildStartCardProps) {
  const [visibleFeatures, setVisibleFeatures] = useState<number[]>([]);
  const appLabel = deriveAppLabel(prompt, isRTL);

  useEffect(() => {
    FEATURES.forEach((feat, i) => {
      const t = setTimeout(
        () => setVisibleFeatures((prev) => [...prev, i]),
        feat.delay * 1000,
      );
      return () => clearTimeout(t);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(0,200,220,0.05) 0%, rgba(120,60,220,0.04) 100%)",
          borderColor: `${PRIMARY}22`,
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 border-b"
          style={{ borderColor: `${PRIMARY}15`, background: `${PRIMARY}08` }}
        >
          <motion.div
            animate={isDone ? {} : { rotate: [0, 10, -10, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: isDone ? 0 : Infinity, ease: "easeInOut" }}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${PRIMARY}20`, border: `1px solid ${PRIMARY}40` }}
          >
            {isDone ? (
              <Check className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
            ) : (
              <Sparkles className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
            )}
          </motion.div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-semibold truncate"
              style={{ color: "rgba(255,255,255,0.85)", fontFamily: HE }}
            >
              {isDone
                ? (isRTL ? "הגרסה הראשונה מוכנה ✓" : "First version ready ✓")
                : (isRTL ? "בונה את הגרסה הראשונה..." : "Building first version...")}
            </p>
            <p
              className="text-[10px] truncate mt-0.5"
              style={{ color: `${PRIMARY}80`, fontFamily: HE }}
            >
              {appLabel}
            </p>
          </div>
        </div>

        {/* Feature list */}
        <div className="px-4 py-3 space-y-2">
          {FEATURES.map((feat, i) => {
            const isVisible = visibleFeatures.includes(i);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: isRTL ? 8 : -8 }}
                animate={{ opacity: isVisible ? 1 : 0.15, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={
                    isVisible
                      ? { background: `${PRIMARY}18`, border: `1px solid ${PRIMARY}45`, color: PRIMARY }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" }
                  }
                >
                  {isVisible ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      {feat.icon}
                    </motion.div>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  )}
                </div>
                <span
                  className="text-[11px] font-medium"
                  style={{
                    color: isVisible ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
                    fontFamily: HE,
                  }}
                >
                  {isRTL ? feat.labelHe : feat.label}
                </span>

                {/* Shimmer for not-yet-visible */}
                {!isVisible && (
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden max-w-[80px]">
                    <motion.div
                      className="h-full rounded-full bg-white/[0.08]"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footer hint */}
        <AnimatePresence>
          {!isDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pb-3 flex items-center gap-1.5"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ background: `${PRIMARY}60` }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
              <span
                className="text-[10px]"
                style={{ color: "rgba(255,255,255,0.25)", fontFamily: HE }}
              >
                {isRTL ? "מעבד את הרעיון שלך..." : "Processing your idea..."}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
