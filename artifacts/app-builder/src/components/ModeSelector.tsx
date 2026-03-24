import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface ModeSelectorProps {
  currentMode: string;
  onSelect: (mode: string) => void;
  onClose: () => void;
}

const MODES = [
  {
    id: "entrepreneur",
    icon: "🏢",
    label: "יזם",
    subtitle: "שפה עסקית, ללא קוד",
    description: "תאר את הרעיון שלך בשפה פשוטה. ה-AI מטפל בכל ההחלטות הטכניות ובונה את המוצר מיידית.",
    features: ["שפה עסקית פשוטה", "ללא מונחים טכניים", "תוצאות מיידיות", "שאלות discovery"],
    color: "amber",
    borderClass: "border-amber-500/30",
    bgClass: "bg-amber-500/5",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    checkClass: "text-amber-400",
  },
  {
    id: "builder",
    icon: "🔧",
    label: "בונה",
    subtitle: "רואה קוד, שולט בעיצוב",
    description: "ראה את הקוד מאחורי המוצר עם הסברים ברורים. שנה דרך שיחה או ערוך ישירות — ללא תכנות עמוק.",
    features: ["קוד גלוי", "הסברי ארכיטקטורה", "\"למה בנית ככה?\"", "רמזי התאמה קלים"],
    color: "indigo",
    borderClass: "border-indigo-500/30",
    bgClass: "bg-indigo-500/5",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    checkClass: "text-indigo-400",
  },
  {
    id: "developer",
    icon: "💻",
    label: "מפתח",
    subtitle: "שליטה מלאה בקוד",
    description: "קוד ברמת פרודקשן עם עומק טכני — הערות ביצועים, ניתוח אבטחה, החלטות stack.",
    features: ["פרטים טכניים מלאים", "אופטימיזציית ביצועים", "ניתוח אבטחה", "המלצות stack"],
    color: "emerald",
    borderClass: "border-emerald-500/30",
    bgClass: "bg-emerald-500/5",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    checkClass: "text-emerald-400",
  },
  {
    id: "maker",
    icon: "🎨",
    label: "מייקר",
    subtitle: "בונה לכיף ולעצמי",
    description: "בונה דברים מגניבים לעצמך — משחקים, כלים אישיים, ניסויים. ה-AI הוא חבר, לא יועץ עסקי.",
    features: ["שתי שאלות ואז build מיידי", "רעיונות יצירתיים מפתיעים", "Three.js, Canvas, Web Audio", "ללא שאלות עסקיות"],
    color: "purple",
    borderClass: "border-purple-500/30",
    bgClass: "bg-purple-500/5",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    checkClass: "text-purple-400",
  },
];

export function ModeSelector({ currentMode, onSelect, onClose }: ModeSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-[#16161f] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-bold text-slate-100" style={{ fontFamily: HE }}>
              בחר את המצב שלך
            </h2>
            <p className="text-xs text-slate-400 mt-0.5" style={{ fontFamily: HE }}>
              ה-AI מתאים את עצמו לרמתך לחלוטין
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Cards */}
        <div className="p-4 space-y-3">
          {MODES.map((mode) => {
            const isActive = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onSelect(mode.id)}
                className={cn(
                  "w-full text-right p-4 rounded-xl border transition-all group",
                  isActive
                    ? `${mode.borderClass} ${mode.bgClass}`
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                    {mode.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-semibold text-sm text-slate-200" style={{ fontFamily: HE }}>
                        {mode.label}
                      </span>
                      <span
                        className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", mode.badgeClass)}
                        style={{ fontFamily: HE }}
                      >
                        {mode.subtitle}
                      </span>
                      {isActive && (
                        <span
                          className="text-xs text-slate-400 font-medium"
                          style={{ fontFamily: HE }}
                        >
                          נוכחי
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2" style={{ fontFamily: HE }}>
                      {mode.description}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {mode.features.map((f, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1 text-[10px] text-slate-500"
                          style={{ fontFamily: HE }}
                        >
                          <Check
                            className={cn(
                              "w-3 h-3 shrink-0",
                              isActive ? mode.checkClass : "text-slate-600"
                            )}
                          />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-[#0a0a0f]">
          <p className="text-[10px] text-slate-500 text-center leading-relaxed" style={{ fontFamily: HE }}>
            ניתן לעבור בין המצבים בכל זמן. ה-AI מתאים עצמו מיידית.
            <br />
            <span className="text-indigo-400/80">Grow With Me — הפלטפורמה גדלה עם הכישורים שלך.</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
