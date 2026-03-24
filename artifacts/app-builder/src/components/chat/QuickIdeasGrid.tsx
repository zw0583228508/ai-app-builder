import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface ModeIdea {
  icon: string;
  title: string;
  desc: string;
  prompt: string;
}

interface ModeConfig {
  icon: string;
  bgColor: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  quickStartLabel: string;
  ideas: ModeIdea[];
  color?: string;
}

interface QuickIdeasGridProps {
  modeConfig: ModeConfig;
  onIdeaSelect: (prompt: string) => void;
  onIdeaSubmit?: (prompt: string) => void;
  maxIdeas?: number;
  mode?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06 + 0.15,
      duration: 0.35,
      ease: "easeOut" as const,
    },
  }),
};

const MODE_CAPABILITIES: Record<string, string[]> = {
  entrepreneur: [
    "דף נחיתה",
    "חנות אונליין",
    "קביעת פגישות",
    "מחירים וחבילות",
    "כפתור וואטסאפ",
    "טופס יצירת קשר",
  ],
  builder: [
    "בניית דפים",
    "ארכיטקטורה",
    "עיצוב UI",
    "אינטגרציות",
    "פרסום",
    "שינויים בזמן אמת",
  ],
  developer: [
    "קוד פרודקשן",
    "ביצועים",
    "אבטחה",
    "REST API",
    "WebSockets",
    "אנימציות",
  ],
  maker: [
    "אנימציות",
    "Three.js / WebGL",
    "משחקים",
    "Canvas",
    "Web Audio",
    "ניסויים",
  ],
};

export function QuickIdeasGrid({
  modeConfig,
  onIdeaSelect,
  onIdeaSubmit,
  maxIdeas = 6,
  mode,
}: QuickIdeasGridProps) {
  const ideas = modeConfig.ideas.slice(0, maxIdeas);
  const capabilities =
    (mode && MODE_CAPABILITIES[mode]) || MODE_CAPABILITIES.builder;

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full pb-6">
      {/* Hero section */}
      <motion.div
        className="flex flex-col items-center text-center mt-8 mb-10"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-2xl",
            modeConfig.bgColor,
          )}
        >
          {modeConfig.icon}
        </div>
        <h3
          className="text-xl font-bold mb-2 text-slate-100 tracking-tight"
          style={{ fontFamily: HE }}
        >
          {modeConfig.welcomeTitle}
        </h3>
        <p
          className="text-sm text-slate-400 max-w-sm leading-relaxed"
          style={{ fontFamily: HE }}
        >
          {modeConfig.welcomeSubtitle}
        </p>
      </motion.div>

      {/* Capability hints — subtle row showing what chat can do */}
      <motion.div
        className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        {capabilities.map((cap) => (
          <span
            key={cap}
            className="text-[10px] text-slate-500 border border-white/[0.06] bg-white/[0.025] px-2 py-0.5 rounded-full"
            style={{ fontFamily: HE }}
          >
            {cap}
          </span>
        ))}
      </motion.div>

      {/* Section label */}
      <motion.p
        className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 mb-3 px-1"
        style={{ fontFamily: HE }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {modeConfig.quickStartLabel}
      </motion.p>

      {/* Idea cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ideas.map((idea, idx) => (
          <motion.button
            key={idx}
            custom={idx}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            onClick={() => {
              onIdeaSelect(idea.prompt);
              onIdeaSubmit?.(idea.prompt);
            }}
            className="group text-right p-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/[0.12] hover:border-indigo-500/20 transition-all duration-200 flex items-start gap-3.5 w-full"
          >
            <span className="text-xl shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200 origin-center">
              {idea.icon}
            </span>
            <div className="flex-1 min-w-0 text-right">
              <p
                className="text-sm font-semibold text-slate-200 mb-0.5 group-hover:text-white transition-colors"
                style={{ fontFamily: HE }}
              >
                {idea.title}
              </p>
              <p
                className="text-xs text-slate-500 leading-relaxed"
                style={{ fontFamily: HE }}
              >
                {idea.desc}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
