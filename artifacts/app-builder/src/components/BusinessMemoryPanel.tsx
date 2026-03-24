import { useState, useEffect, useRef } from "react";
import {
  Brain,
  Sparkles,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Zap,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const HE = "Rubik, Arial, sans-serif";
const API = "/api";

interface UserDNA {
  id?: number;
  skillLevel?: string;
  preferredStack?: string;
  uiStyle?: string;
  deployPreference?: string;
  industryFocus?: string[];
  businessGoals?: string[];
  frameworks?: string[];
  primaryLanguages?: string[];
  growthGoals?: string[];
  costSensitivity?: string;
  totalProjects?: number;
  totalTokensUsed?: number;
  updatedAt?: string;
}

const SKILL_LEVELS = [
  { value: "beginner", label: "מתחיל", emoji: "🌱" },
  { value: "intermediate", label: "ביניים", emoji: "🌿" },
  { value: "advanced", label: "מתקדם", emoji: "🌳" },
  { value: "expert", label: "מומחה", emoji: "⚡" },
];

const UI_STYLES = [
  { value: "minimal", label: "מינימלי", emoji: "◻" },
  { value: "colorful", label: "צבעוני", emoji: "🌈" },
  { value: "corporate", label: "קורפורטיבי", emoji: "🏢" },
  { value: "playful", label: "משחקי", emoji: "🎮" },
  { value: "dark", label: "כהה", emoji: "🌙" },
];

const DEPLOY_PREFS = [
  { value: "vercel", label: "Vercel" },
  { value: "netlify", label: "Netlify" },
  { value: "self_hosted", label: "Self-hosted" },
  { value: "serverless", label: "Serverless" },
];

const INDUSTRY_OPTIONS = [
  "SaaS",
  "eCommerce",
  "FinTech",
  "HealthTech",
  "EdTech",
  "Media",
  "Gaming",
  "Real Estate",
  "Marketing",
  "B2B",
  "B2C",
  "Startup",
];

const STACK_OPTIONS = [
  "React",
  "Vue",
  "Svelte",
  "Angular",
  "Next.js",
  "Remix",
  "Node.js",
  "Python",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui",
];

export function BusinessMemoryPanel() {
  const [dna, setDna] = useState<UserDNA>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [expandedSection, setExpandedSection] = useState<string>("skills");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetch(`${API}/user-dna`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.dna) setDna(d.dna);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof UserDNA, value: unknown) {
    setDna((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/user-dna`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          skillLevel: dna.skillLevel,
          preferredStack: dna.preferredStack,
          uiStyle: dna.uiStyle,
          deployPreference: dna.deployPreference,
          industryFocus: dna.industryFocus,
          businessGoals: dna.businessGoals,
          frameworks: dna.frameworks,
          primaryLanguages: dna.primaryLanguages,
          growthGoals: dna.growthGoals,
          costSensitivity: dna.costSensitivity,
        }),
      });
      const d = await res.json();
      if (d.dna) setDna(d.dna);
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const extractingRef = useRef(false);

  async function extract() {
    if (extractingRef.current) return;
    extractingRef.current = true;
    setExtracting(true);
    try {
      const res = await fetch(`${API}/user-dna/extract`, {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (d.dna) {
        setDna(d.dna);
        setHasChanges(false);
      }
    } finally {
      setExtracting(false);
      extractingRef.current = false;
    }
  }

  function addGoal() {
    if (!newGoal.trim()) return;
    update("businessGoals", [...(dna.businessGoals ?? []), newGoal.trim()]);
    setNewGoal("");
  }

  function removeGoal(i: number) {
    update(
      "businessGoals",
      (dna.businessGoals ?? []).filter((_, idx) => idx !== i),
    );
  }

  function toggleIndustry(ind: string) {
    const current = dna.industryFocus ?? [];
    if (current.includes(ind)) {
      update(
        "industryFocus",
        current.filter((x) => x !== ind),
      );
    } else {
      update("industryFocus", [...current, ind]);
    }
  }

  function toggleStack(s: string) {
    const current = dna.frameworks ?? [];
    if (current.includes(s)) {
      update(
        "frameworks",
        current.filter((x) => x !== s),
      );
    } else {
      update("frameworks", [...current, s]);
    }
  }

  function Section({
    id,
    title,
    icon,
    children,
  }: {
    id: string;
    title: string;
    icon: string;
    children: React.ReactNode;
  }) {
    const open = expandedSection === id;
    return (
      <div className="border border-border/40 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(open ? "" : id)}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-right"
        >
          <span className="text-base">{icon}</span>
          <span
            className="flex-1 text-sm font-semibold text-foreground"
            style={{ fontFamily: HE }}
          >
            {title}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="w-5 h-5 animate-pulse text-primary" />
          <span className="text-sm" style={{ fontFamily: HE }}>
            טוען זיכרון עסקי...
          </span>
        </div>
      </div>
    );
  }

  const memoryActive = !!(
    dna.skillLevel ||
    dna.preferredStack ||
    dna.uiStyle ||
    (dna.industryFocus?.length ?? 0) > 0 ||
    (dna.businessGoals?.length ?? 0) > 0
  );

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-base font-bold text-foreground"
              style={{ fontFamily: HE }}
            >
              זיכרון עסקי
            </h2>
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: HE }}
            >
              ההעדפות שלך מוזנות לכל build אוטומטית
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
              memoryActive
                ? "bg-green-500/15 text-green-400 border border-green-500/30"
                : "bg-muted/40 text-muted-foreground border border-border/40",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                memoryActive
                  ? "bg-green-400 animate-pulse"
                  : "bg-muted-foreground",
              )}
            />
            {memoryActive ? "פעיל" : "ריק"}
          </div>
        </div>

        {/* Stats */}
        {(dna.totalProjects ?? 0) > 0 && (
          <div className="flex items-center gap-4 mt-3 px-1">
            <div className="text-center">
              <p className="text-lg font-bold text-primary tabular-nums">
                {dna.totalProjects ?? 0}
              </p>
              <p
                className="text-[10px] text-muted-foreground"
                style={{ fontFamily: HE }}
              >
                פרויקטים
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground tabular-nums">
                {Math.round((dna.totalTokensUsed ?? 0) / 1000)}K
              </p>
              <p
                className="text-[10px] text-muted-foreground"
                style={{ fontFamily: HE }}
              >
                טוקנים
              </p>
            </div>
            {dna.updatedAt && (
              <div className="text-center flex-1">
                <p
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: HE }}
                >
                  עודכן: {new Date(dna.updatedAt).toLocaleDateString("he-IL")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Auto-extract button */}
        <button
          onClick={extract}
          disabled={extracting}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-all disabled:opacity-60"
          style={{ fontFamily: HE }}
        >
          {extracting ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>מחלץ מההיסטוריה...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>חלץ DNA אוטומטית מהפרויקטים שלי</span>
            </>
          )}
        </button>

        {/* Skills & Experience */}
        <Section id="skills" title="כישורים ורמה" icon="🧠">
          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              style={{ fontFamily: HE }}
            >
              רמת ניסיון
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => update("skillLevel", level.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    dna.skillLevel === level.value
                      ? "border-primary/60 bg-primary/10 text-primary font-semibold"
                      : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
                  )}
                  style={{ fontFamily: HE }}
                >
                  <span>{level.emoji}</span>
                  <span>{level.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              style={{ fontFamily: HE }}
            >
              טכנולוגיות מועדפות
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STACK_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStack(s)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs border transition-all",
                    (dna.frameworks ?? []).includes(s)
                      ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-400 font-medium"
                      : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Style Preferences */}
        <Section id="style" title="העדפות עיצוב ו-Stack" icon="🎨">
          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              style={{ fontFamily: HE }}
            >
              סגנון UI מועדף
            </label>
            <div className="flex flex-wrap gap-2">
              {UI_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => update("uiStyle", style.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all",
                    dna.uiStyle === style.value
                      ? "border-primary/60 bg-primary/10 text-primary font-semibold"
                      : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
                  )}
                  style={{ fontFamily: HE }}
                >
                  <span>{style.emoji}</span>
                  <span>{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              style={{ fontFamily: HE }}
            >
              Stack מועדף לפרויקטים חדשים
            </label>
            <select
              value={dna.preferredStack ?? ""}
              onChange={(e) =>
                update("preferredStack", e.target.value || undefined)
              }
              className="w-full bg-background/60 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              style={{ fontFamily: HE }}
            >
              <option value="">ברירת מחדל (HTML/CSS/JS)</option>
              <option value="html">HTML + CSS + JS</option>
              <option value="react">React + Tailwind</option>
              <option value="vue">Vue.js</option>
              <option value="svelte">Svelte</option>
              <option value="nextjs">Next.js</option>
            </select>
          </div>

          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              style={{ fontFamily: HE }}
            >
              העדפת deploy
            </label>
            <div className="flex gap-2 flex-wrap">
              {DEPLOY_PREFS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => update("deployPreference", d.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs transition-all",
                    dna.deployPreference === d.value
                      ? "border-primary/60 bg-primary/10 text-primary font-medium"
                      : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Business Context */}
        <Section id="business" title="הקשר עסקי ומטרות" icon="🏢">
          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              style={{ fontFamily: HE }}
            >
              תחומי פעילות
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRY_OPTIONS.map((ind) => (
                <button
                  key={ind}
                  onClick={() => toggleIndustry(ind)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs border transition-all",
                    (dna.industryFocus ?? []).includes(ind)
                      ? "border-violet-400/60 bg-violet-400/10 text-violet-400 font-medium"
                      : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
                  )}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              style={{ fontFamily: HE }}
            >
              יעדים עסקיים ({dna.businessGoals?.length ?? 0}/5)
            </label>
            {(dna.businessGoals ?? []).map((goal, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <div
                  className="flex-1 bg-muted/30 border border-border/30 rounded-lg px-3 py-1.5 text-xs text-foreground"
                  style={{ fontFamily: HE }}
                >
                  {goal}
                </div>
                <button
                  onClick={() => removeGoal(i)}
                  className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {(dna.businessGoals?.length ?? 0) < 5 && (
              <div className="flex gap-2">
                <input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGoal()}
                  placeholder="הוסף יעד עסקי..."
                  className="flex-1 bg-background/60 border border-border/40 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50"
                  style={{ fontFamily: HE }}
                  dir="rtl"
                />
                <button
                  onClick={addGoal}
                  disabled={!newGoal.trim()}
                  className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              style={{ fontFamily: HE }}
            >
              רגישות לעלות
            </label>
            <div className="flex gap-2">
              {[
                { value: "low", label: "נמוכה", desc: "חיסכוני" },
                { value: "medium", label: "בינונית", desc: "מאוזן" },
                { value: "high", label: "גבוהה", desc: "ביצועים" },
              ].map((c) => (
                <button
                  key={c.value}
                  onClick={() => update("costSensitivity", c.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border text-center transition-all",
                    dna.costSensitivity === c.value
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border/70",
                  )}
                  style={{ fontFamily: HE }}
                >
                  <span className="text-xs font-medium">{c.label}</span>
                  <span className="text-[10px] opacity-60">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Save footer */}
      <div className="p-4 border-t border-border/40 shrink-0">
        <button
          onClick={save}
          disabled={saving || !hasChanges}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
            hasChanges
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              : "bg-muted/40 text-muted-foreground cursor-not-allowed",
          )}
          style={{ fontFamily: HE }}
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>שומר...</span>
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              <span>נשמר!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>שמור זיכרון עסקי</span>
            </>
          )}
        </button>
        <p
          className="text-[10px] text-muted-foreground/50 text-center mt-1.5"
          style={{ fontFamily: HE }}
        >
          {memoryActive
            ? "הזיכרון מוזן לכל build אוטומטית"
            : "מלא פרטים כדי לשפר את איכות ה-build"}
        </p>
      </div>
    </div>
  );
}
