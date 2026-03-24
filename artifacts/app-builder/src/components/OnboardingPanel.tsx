import { useState } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Code2,
  Store,
  Palette,
  Check,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

type UserMode = "entrepreneur" | "builder" | "developer" | "maker";
type BuildMode = "quick" | "guided";

interface OnboardingPanelProps {
  onComplete: (data: {
    userMode: UserMode;
    buildMode: BuildMode;
    projectType: string;
  }) => void;
  onSkip?: () => void;
}

const MODES: {
  id: UserMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: "entrepreneur",
    label: "יזם",
    description: "אני רוצה לבנות נוכחות דיגיטלית לעסק שלי",
    icon: <Store className="w-6 h-6" />,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
  {
    id: "builder",
    label: "בונה מוצר",
    description: "אני בונה אפליקציה עם תכונות ומשתמשים",
    icon: <Rocket className="w-6 h-6" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "developer",
    label: "מפתח",
    description: "אני מהנדס שרוצה קוד נקי ואדריכלות טובה",
    icon: <Code2 className="w-6 h-6" />,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
  {
    id: "maker",
    label: "יוצר",
    description: "אני אוהב להתנסות ולבנות דברים מגניבים",
    icon: <Palette className="w-6 h-6" />,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
];

const PROJECT_TYPES = [
  { id: "website", label: "אתר תדמית", desc: "דף הבית, אודות, צור קשר" },
  { id: "landing", label: "דף נחיתה", desc: "מיקוד בהמרות ולידים" },
  { id: "webapp", label: "אפליקציית ווב", desc: "דשבורד, ניהול, CRUD" },
  { id: "portfolio", label: "תיק עבודות", desc: "הצגת הפרויקטים שלי" },
  { id: "saas", label: "SaaS", desc: "פלטפורמה עם משתמשים ותשלום" },
  { id: "mobile", label: "אפליקציית מובייל", desc: "Expo / React Native" },
];

export default function OnboardingPanel({
  onComplete,
  onSkip,
}: OnboardingPanelProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMode, setSelectedMode] = useState<UserMode | null>(null);
  const [selectedBuildMode, setSelectedBuildMode] =
    useState<BuildMode>("quick");
  const [selectedType, setSelectedType] = useState<string>("website");

  function handleFinish() {
    if (!selectedMode) return;
    onComplete({
      userMode: selectedMode,
      buildMode: selectedBuildMode,
      projectType: selectedType,
    });
  }

  return (
    <div
      className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6"
      style={{ fontFamily: HE }}
      dir="rtl"
    >
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  step > s
                    ? "bg-violet-500 text-white"
                    : step === s
                      ? "bg-violet-500/20 border border-violet-500 text-violet-400"
                      : "bg-white/5 text-white/30",
                )}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "h-px w-8 flex-1",
                    step > s ? "bg-violet-500" : "bg-white/10",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Mode selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                ברוך הבא! 👋
              </h1>
              <p className="text-white/50">איך תרצה שהAI יעבוד איתך?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    "p-4 rounded-xl border text-right transition-all",
                    selectedMode === mode.id
                      ? `${mode.bg} ${mode.border} ${mode.color}`
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/8",
                  )}
                >
                  <div
                    className={cn(
                      "mb-2",
                      selectedMode === mode.id ? mode.color : "text-white/50",
                    )}
                  >
                    {mode.icon}
                  </div>
                  <div className="font-semibold mb-1">{mode.label}</div>
                  <div className="text-xs text-white/50">
                    {mode.description}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => selectedMode && setStep(2)}
              disabled={!selectedMode}
              className="w-full py-3 rounded-xl bg-violet-500 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              המשך <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2 — Project type */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                מה תרצה לבנות?
              </h1>
              <p className="text-white/50">
                בחר את סוג הפרויקט — ניתן לשנות מאוחר יותר
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={cn(
                    "p-4 rounded-xl border text-right transition-all",
                    selectedType === t.id
                      ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/8",
                  )}
                >
                  <div className="font-semibold mb-1">{t.label}</div>
                  <div className="text-xs text-white/50">{t.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl bg-white/5 text-white/70 flex items-center gap-2 hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" /> חזרה
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-semibold flex items-center justify-center gap-2"
              >
                המשך <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Build mode */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                איך להתחיל?
              </h1>
              <p className="text-white/50">בחר את סגנון הבנייה שמתאים לך</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setSelectedBuildMode("quick")}
                className={cn(
                  "w-full p-4 rounded-xl border text-right transition-all",
                  selectedBuildMode === "quick"
                    ? "bg-violet-500/10 border-violet-500/30"
                    : "bg-white/5 border-white/10 hover:bg-white/8",
                )}
              >
                <div className="flex items-center gap-3 mb-1">
                  <Sparkles
                    className={cn(
                      "w-5 h-5",
                      selectedBuildMode === "quick"
                        ? "text-violet-400"
                        : "text-white/40",
                    )}
                  />
                  <span
                    className={cn(
                      "font-semibold",
                      selectedBuildMode === "quick"
                        ? "text-violet-300"
                        : "text-white",
                    )}
                  >
                    בנייה מהירה
                  </span>
                </div>
                <p className="text-sm text-white/50 mr-8">
                  כתוב מה אתה רוצה — הAI יתחיל לבנות מיד
                </p>
              </button>
              <button
                onClick={() => setSelectedBuildMode("guided")}
                className={cn(
                  "w-full p-4 rounded-xl border text-right transition-all",
                  selectedBuildMode === "guided"
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-white/5 border-white/10 hover:bg-white/8",
                )}
              >
                <div className="flex items-center gap-3 mb-1">
                  <ArrowRight
                    className={cn(
                      "w-5 h-5",
                      selectedBuildMode === "guided"
                        ? "text-blue-400"
                        : "text-white/40",
                    )}
                  />
                  <span
                    className={cn(
                      "font-semibold",
                      selectedBuildMode === "guided"
                        ? "text-blue-300"
                        : "text-white",
                    )}
                  >
                    בנייה מודרכת
                  </span>
                </div>
                <p className="text-sm text-white/50 mr-8">
                  הAI ישאל כמה שאלות, ייצר מפרט, ואז יבנה
                </p>
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-3 rounded-xl bg-white/5 text-white/70 flex items-center gap-2 hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" /> חזרה
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-semibold flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" /> התחל לבנות!
              </button>
            </div>
          </div>
        )}

        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full text-center text-white/30 text-sm mt-4 hover:text-white/50 transition-colors"
          >
            דלג — אכתוב ישירות בצ'אט
          </button>
        )}
      </div>
    </div>
  );
}
