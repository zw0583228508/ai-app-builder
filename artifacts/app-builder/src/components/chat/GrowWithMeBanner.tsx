import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

const HE = "'Rubik', sans-serif";

interface GrowInfo {
  emoji: string;
  title: string;
  description: string;
}

interface GrowWithMeBannerProps {
  growInfo: GrowInfo | null;
  onAccept: () => void;
  onDismiss: () => void;
}

export function GrowWithMeBanner({
  growInfo,
  onAccept,
  onDismiss,
}: GrowWithMeBannerProps) {
  return (
    <AnimatePresence>
      {growInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5 overflow-hidden"
        >
          <div className="px-4 py-3 flex items-start gap-3">
            <span className="text-2xl shrink-0">{growInfo.emoji}</span>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold text-foreground"
                style={{ fontFamily: HE }}
              >
                {growInfo.title}
              </p>
              <p
                className="text-xs text-muted-foreground mt-0.5 leading-relaxed"
                style={{ fontFamily: HE }}
              >
                {growInfo.description}
              </p>
            </div>
            <div className="flex gap-2 shrink-0 mt-0.5">
              <button
                onClick={onAccept}
                className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors flex items-center gap-1"
                style={{ fontFamily: HE }}
              >
                <ArrowUp className="w-3 h-3" />
                שדרג
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-xs hover:text-foreground transition-colors"
                style={{ fontFamily: HE }}
              >
                אחר כך
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
