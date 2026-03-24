import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check } from "lucide-react";

const STAGES_HE = [
  { label: "מבין את הרעיון שלך...", duration: 500 },
  { label: "מתכנן את מבנה האפליקציה...", duration: 800 },
  { label: "מייצר את הגרסה הראשונה שלך...", duration: 800 },
];

const STAGES_EN = [
  { label: "Understanding your idea...", duration: 500 },
  { label: "Designing your app structure...", duration: 800 },
  { label: "Generating your first version...", duration: 800 },
];

const PRIMARY = "hsl(191,90%,42%)";

interface BuildingTransitionProps {
  isRTL?: boolean;
}

export function BuildingTransition({ isRTL = true }: BuildingTransitionProps) {
  const stages = isRTL ? STAGES_HE : STAGES_EN;
  const [stageIndex, setStageIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    stages.forEach((stage, i) => {
      const t = setTimeout(() => {
        setStageIndex(i);
        if (i > 0) {
          setCompletedStages((prev) => [...prev, i - 1]);
        }
      }, elapsed);
      timers.push(t);
      elapsed += stage.duration;
    });

    const finishT = setTimeout(() => {
      setCompletedStages([0, 1, 2]);
      setDone(true);
    }, elapsed);
    timers.push(finishT);

    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "hsl(220,16%,5%)" }}
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-xs px-6">
        {/* Animated icon */}
        <motion.div
          animate={
            done
              ? { scale: [1, 1.15, 1], rotate: 0 }
              : { scale: [1, 1.06, 1], rotate: [0, 4, -4, 0] }
          }
          transition={{ duration: done ? 0.4 : 2, repeat: done ? 0 : Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY}, hsl(270,80%,55%))`,
            boxShadow: `0 0 40px ${PRIMARY}40`,
          }}
        >
          {done ? (
            <Check className="w-8 h-8 text-white" />
          ) : (
            <Sparkles className="w-8 h-8 text-white" />
          )}
        </motion.div>

        {/* Stage list */}
        <div className="flex flex-col gap-3 w-full" dir={isRTL ? "rtl" : "ltr"}>
          {stages.map((stage, i) => {
            const isCompleted = completedStages.includes(i);
            const isActive = i === stageIndex && !isCompleted;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
                animate={{ opacity: i <= stageIndex ? 1 : 0.2, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                {/* Status dot */}
                <div className="relative flex-shrink-0">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: `${PRIMARY}25`, border: `1.5px solid ${PRIMARY}60` }}
                    >
                      <Check className="w-3 h-3" style={{ color: PRIMARY }} />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-5 h-5 rounded-full"
                      style={{ background: `${PRIMARY}20`, border: `1.5px solid ${PRIMARY}`, boxShadow: `0 0 8px ${PRIMARY}50` }}
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className="text-sm font-medium"
                  style={{
                    fontFamily: isRTL ? "'Rubik', sans-serif" : "'Inter', sans-serif",
                    color: isCompleted
                      ? `${PRIMARY}90`
                      : isActive
                        ? "rgba(255,255,255,0.85)"
                        : "rgba(255,255,255,0.2)",
                  }}
                >
                  {stage.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${PRIMARY}, hsl(270,80%,55%))` }}
            initial={{ width: "0%" }}
            animate={{
              width: done ? "100%" : `${(stageIndex / (stages.length - 1)) * 85 + 10}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
