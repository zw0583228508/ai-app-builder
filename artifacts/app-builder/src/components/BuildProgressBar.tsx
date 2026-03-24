import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const HE = "'Rubik', sans-serif";

const STEPS_HE = [
  { label: "רעיון", emoji: "💡" },
  { label: "מבנה", emoji: "🏗️" },
  { label: "ממשק", emoji: "🎨" },
  { label: "לוגיקה", emoji: "⚙️" },
  { label: "הפצה", emoji: "🚀" },
];

const STEPS_EN = [
  { label: "Idea", emoji: "💡" },
  { label: "Structure", emoji: "🏗️" },
  { label: "UI", emoji: "🎨" },
  { label: "Backend", emoji: "⚙️" },
  { label: "Launch", emoji: "🚀" },
];

function getActiveStep(messageCount: number): number {
  if (messageCount === 0) return 0;
  if (messageCount <= 2) return 1;
  if (messageCount <= 4) return 2;
  if (messageCount <= 7) return 3;
  return 4;
}

interface BuildProgressBarProps {
  messageCount: number;
  isRTL?: boolean;
}

export function BuildProgressBar({ messageCount, isRTL = true }: BuildProgressBarProps) {
  const steps = isRTL ? STEPS_HE : STEPS_EN;
  const activeStep = getActiveStep(messageCount);

  return (
    <div
      className="px-4 pt-2.5 pb-2 border-b border-white/[0.04] bg-[#0a0a0f]"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between gap-1 max-w-sm mx-auto">
        {steps.map((step, idx) => {
          const isDone = idx < activeStep;
          const isActive = idx === activeStep;
          return (
            <div key={idx} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <motion.div
                  animate={{
                    scale: isActive ? [1, 1.12, 1] : 1,
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: isActive ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all duration-300",
                    isDone
                      ? "bg-[hsl(191,90%,42%)]/20 border border-[hsl(191,90%,42%)]/40"
                      : isActive
                        ? "bg-[hsl(191,90%,42%)]/15 border border-[hsl(191,90%,42%)]/50 shadow-sm shadow-[hsl(191,90%,42%)]/20"
                        : "bg-white/[0.03] border border-white/[0.07]",
                  )}
                >
                  {isDone ? (
                    <Check className="w-3 h-3 text-[hsl(191,90%,42%)]" />
                  ) : (
                    <span
                      className={cn(
                        "text-[10px]",
                        isActive ? "opacity-100" : "opacity-30",
                      )}
                    >
                      {step.emoji}
                    </span>
                  )}
                </motion.div>
                <span
                  className={cn(
                    "text-[9px] font-medium transition-colors duration-300 truncate px-0.5",
                    isDone
                      ? "text-[hsl(191,90%,42%)]/60"
                      : isActive
                        ? "text-white/70"
                        : "text-white/20",
                  )}
                  style={{ fontFamily: HE }}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex-1 h-px mx-1 mb-4 min-w-[8px]">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      idx < activeStep
                        ? "bg-[hsl(191,90%,42%)]/30"
                        : "bg-white/[0.06]",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
