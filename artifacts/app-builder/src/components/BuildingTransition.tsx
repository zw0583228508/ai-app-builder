import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const MESSAGES_HE = [
  "מנתח את הרעיון...",
  "מתכנן את האפליקציה...",
  "מכין את שלבי הבנייה הראשונים...",
  "מגדיר את הארכיטקטורה...",
  "כמעט מוכן...",
];

const MESSAGES_EN = [
  "Analyzing your idea...",
  "Planning the app structure...",
  "Setting up first build steps...",
  "Designing the architecture...",
  "Almost ready...",
];

interface BuildingTransitionProps {
  isRTL?: boolean;
}

export function BuildingTransition({ isRTL = true }: BuildingTransitionProps) {
  const messages = isRTL ? MESSAGES_HE : MESSAGES_EN;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 900);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "hsl(220,16%,5%)" }}
    >
      <div className="flex flex-col items-center gap-6">
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 6, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(191,90%,42%)] to-purple-500 flex items-center justify-center shadow-2xl shadow-[hsl(191,90%,42%)]/40"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>

        <div className="h-7 overflow-hidden" style={{ minWidth: 240 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-base font-medium text-white/70 text-center"
              dir={isRTL ? "rtl" : "ltr"}
              style={{
                fontFamily: isRTL
                  ? "'Rubik', sans-serif"
                  : "'Inter', sans-serif",
              }}
            >
              {messages[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="rounded-full bg-[hsl(191,90%,42%)]"
              animate={{
                width: i === msgIndex % 5 ? 20 : 6,
                opacity: i === msgIndex % 5 ? 1 : 0.25,
              }}
              transition={{ duration: 0.3 }}
              style={{ height: 6 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
