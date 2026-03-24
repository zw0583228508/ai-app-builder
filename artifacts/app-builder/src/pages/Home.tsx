import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import {
  ArrowRight,
  LayoutTemplate,
  Clock,
  FileCode2,
  Zap,
  Globe,
  ShoppingBag,
  Briefcase,
  BarChart3,
  BookOpen,
  Palette,
  Rocket,
  ChevronRight,
  Lock,
  Sparkles,
  Play,
  Code2,
  Database,
  Layers,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TemplatesModal } from "@/components/TemplatesModal";
import { BuildingTransition } from "@/components/BuildingTransition";
import { useLocation } from "wouter";
import { useListProjects } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useLang } from "@/lib/i18n";

const PRIMARY = "hsl(191,90%,42%)";

const USER_MODES = [
  { id: "entrepreneur", icon: "🏢", labelHe: "יזם", labelEn: "Entrepreneur" },
  { id: "builder", icon: "🔧", labelHe: "בונה", labelEn: "Builder" },
  { id: "developer", icon: "💻", labelHe: "מפתח", labelEn: "Developer" },
  { id: "maker", icon: "🎨", labelHe: "מייקר", labelEn: "Maker" },
];

export default function Home() {
  const { t, meta, lang } = useLang();
  const isRTL = meta.rtl;

  const [showTemplates, setShowTemplates] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [input, setInput] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState("entrepreneur");
  const [, navigate] = useLocation();
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const STARTER_PROMPTS = [
    { icon: ShoppingBag, label: isRTL ? "חנות אונליין" : "Online store", prompt: "Build a beautiful e-commerce store with product gallery, cart and checkout." },
    { icon: Globe, label: isRTL ? "דף נחיתה SaaS" : "SaaS landing page", prompt: "Build a stunning SaaS landing page with hero, features and pricing." },
    { icon: Briefcase, label: isRTL ? "אתר עסקי" : "Business site", prompt: "Build a professional business website with services, reviews and contact." },
    { icon: BarChart3, label: isRTL ? "דשבורד אנליטיקס" : "Analytics dashboard", prompt: "Build an analytics dashboard with charts, KPIs and data tables." },
    { icon: BookOpen, label: isRTL ? "פורטפוליו" : "Portfolio", prompt: "Build a stunning portfolio with gallery, bio and contact form." },
    { icon: Palette, label: isRTL ? "אתר יצירתי" : "Creative site", prompt: "Build a creative website with animations and unique design." },
    { icon: Rocket, label: isRTL ? "אפליקציית SaaS" : "SaaS app", prompt: "Build a full SaaS app with auth, dashboard and billing." },
    { icon: Database, label: isRTL ? "אפליקציית CRUD" : "CRUD app", prompt: "Build an app with database, forms and CRUD operations." },
  ];

  const VALUE_ITEMS = isRTL
    ? [
        { icon: "🎨", label: "ממשק משתמש" },
        { icon: "⚙️", label: "לוגיקת צד שרת" },
        { icon: "🗄️", label: "מבנה מסד נתונים" },
        { icon: "🚀", label: "מוכן לפרסום" },
      ]
    : [
        { icon: "🎨", label: "Full UI" },
        { icon: "⚙️", label: "Backend logic" },
        { icon: "🗄️", label: "Database structure" },
        { icon: "🚀", label: "Deploy-ready" },
      ];

  const currentModeObj = USER_MODES.find((m) => m.id === selectedMode) || USER_MODES[0];
  const modeLabel = isRTL ? currentModeObj.labelHe : currentModeObj.labelEn;

  const handleProjectCreateError = async (res: Response) => {
    setIsTransitioning(false);
    if (res.status === 401) {
      setSessionExpired(true);
      return;
    }
    if (res.status === 402) {
      const data = await res.json().catch(() => ({}));
      setCreateError(
        (data as { error?: string }).error ||
          (isRTL
            ? "הגעת למגבלת הפרויקטים — מחק פרויקט קיים או שדרג לתוכנית Pro"
            : "Project limit reached — delete a project or upgrade to Pro"),
      );
    } else {
      setCreateError(
        isRTL
          ? "לא הצלחנו ליצור פרויקט. נסה שוב."
          : "Failed to create project. Please try again.",
      );
    }
    setTimeout(() => setCreateError(null), 5000);
  };

  const handleCreate = async (prompt?: string) => {
    const text = prompt ?? input.trim();
    if (!text || isTransitioning) return;
    setIsTransitioning(true);
    setCreateError(null);
    try {
      const title = text.slice(0, 50) + (text.length > 50 ? "..." : "");
      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type: "website", userMode: selectedMode }),
      });
      if (!res.ok) {
        await handleProjectCreateError(res);
        return;
      }
      const project = await res.json();
      sessionStorage.setItem("builder_pending_prompt", text);
      setTimeout(() => navigate(`/project/${project.id}`), 600);
    } catch {
      setIsTransitioning(false);
      setCreateError(
        isRTL ? "שגיאת רשת. בדוק חיבור ונסה שוב." : "Network error. Check your connection and try again.",
      );
      setTimeout(() => setCreateError(null), 5000);
    }
  };

  const handleSelectTemplate = async (prompt: string, title: string) => {
    setIsTransitioning(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type: "website", userMode: selectedMode }),
      });
      if (!res.ok) {
        await handleProjectCreateError(res);
        return;
      }
      const project = await res.json();
      sessionStorage.setItem("builder_pending_prompt", prompt);
      setTimeout(() => navigate(`/project/${project.id}`), 600);
    } catch {
      setIsTransitioning(false);
    }
  };

  const recentProjects = projects?.slice(0, 6) ?? [];

  return (
    <Layout>
      <AnimatePresence>
        {isTransitioning && <BuildingTransition isRTL={isRTL} />}
      </AnimatePresence>

      <div
        className="relative w-full h-full overflow-y-auto"
        dir={isRTL ? "rtl" : "ltr"}
        style={{ fontFamily: meta.font, background: "hsl(220,16%,5%)" }}
        key={lang}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[hsl(191,90%,42%)]/5 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-purple-600/4 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center min-h-full px-4 pt-10 pb-20">

          {/* ── Logo ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 mb-8"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(191,90%,42%)] to-purple-500 flex items-center justify-center shadow-lg shadow-[hsl(191,90%,42%)]/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              AI Builder
            </span>
          </motion.div>

          {/* ── Hero headline ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-center mb-8 max-w-xl"
          >
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3 tracking-tight">
              {isRTL ? (
                <>בנה אפליקציה מלאה<br /><span style={{ color: PRIMARY }}>עם AI</span></>
              ) : (
                <>Build a full app<br /><span style={{ color: PRIMARY }}>with AI</span></>
              )}
            </h1>
            <p className="text-sm text-white/45 leading-relaxed max-w-sm mx-auto">
              {isRTL
                ? "תאר את הרעיון שלך ואני אעזור לך להפוך אותו למוצר אמיתי"
                : "Describe your idea and I'll help turn it into a real product"}
            </p>
          </motion.div>

          {/* ── Return trigger for returning users ── */}
          {!projectsLoading && recentProjects.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              onClick={() => navigate(`/project/${recentProjects[0].id}`)}
              className="w-full max-w-2xl flex items-center justify-between gap-3 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] hover:border-[hsl(191,90%,42%)]/30 hover:bg-[hsl(191,90%,42%)]/5 rounded-xl transition-all group mb-4"
              dir={isRTL ? "rtl" : "ltr"}
            >
              <div className={cn("flex items-center gap-3 min-w-0", isRTL && "flex-row-reverse")}>
                <div className="w-6 h-6 rounded-lg bg-[hsl(191,90%,42%)]/10 border border-[hsl(191,90%,42%)]/20 flex items-center justify-center shrink-0">
                  <Play className="w-3 h-3 text-[hsl(191,90%,42%)]/60 group-hover:text-[hsl(191,90%,42%)] transition-colors" />
                </div>
                <p className="text-[11px] text-white/40 group-hover:text-white/65 transition-colors truncate">
                  <span className="text-white/25">{isRTL ? "ממשיך מאיפה שהפסקת · " : "Continue from where you left off · "}</span>
                  {recentProjects[0].title}
                </p>
              </div>
              <div className={cn("flex items-center gap-1 shrink-0", isRTL && "flex-row-reverse")}>
                <span className="text-[10px] text-white/25 group-hover:text-[hsl(191,90%,42%)]/70 transition-colors font-medium">
                  {isRTL ? "המשך" : "Continue"}
                </span>
                <ChevronRight className={cn("w-3.5 h-3.5 text-white/15 group-hover:text-[hsl(191,90%,42%)]/60 transition-all shrink-0", isRTL ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5")} />
              </div>
            </motion.button>
          )}

          {/* ── Main prompt input ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-2xl mb-2"
          >
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/50 focus-within:border-[hsl(191,90%,42%)]/50 focus-within:shadow-[hsl(191,90%,42%)]/10 focus-within:shadow-2xl transition-all duration-300">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder={
                  isRTL
                    ? "דוגמה: בנה לי אפליקציית קריוקי עם ניקוד ולוח תוצאות"
                    : "Example: Build me a karaoke app with scoring and leaderboard"
                }
                className="w-full bg-transparent px-5 pt-5 pb-3 text-white placeholder:text-white/25 resize-none focus:outline-none min-h-[90px] leading-relaxed"
                style={{ fontSize: "16px" }}
                dir={isRTL ? "rtl" : "ltr"}
                rows={3}
                autoFocus
              />

              {/* Bottom toolbar */}
              <div className={cn("flex items-center justify-between px-4 pb-4 pt-1 gap-3", isRTL && "flex-row-reverse")}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    {isRTL ? "תבניות מוכנות" : "Ready templates"}
                  </button>
                  <button
                    onClick={() => navigate("/gallery")}
                    className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {isRTL ? "גלריית קהילה" : "Community gallery"}
                  </button>
                </div>
                <button
                  onClick={() => handleCreate()}
                  disabled={!input.trim() || isTransitioning}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[hsl(191,90%,42%)] text-black rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-[hsl(191,90%,50%)] transition-all shadow-lg shadow-[hsl(191,90%,42%)]/30 hover:-translate-y-0.5 disabled:hover:translate-y-0 active:translate-y-0 shrink-0"
                >
                  <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
                  {isRTL ? "התחל לבנות" : "Start building"}
                </button>
              </div>
            </div>

            {/* Session expired */}
            {sessionExpired && (
              <div className="mt-2.5 flex flex-col gap-2 px-3 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[12px] text-amber-300 animate-in slide-in-from-top-1 duration-200" dir="rtl" style={{ fontFamily: "'Rubik', sans-serif" }}>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>הסשן פג. יש להתחבר מחדש.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { window.location.href = import.meta.env.DEV ? "/api/dev-login" : "/api/login"; }}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-200 text-[11px] font-medium transition-colors"
                  >
                    כנס מחדש
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {createError && (
              <div className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-xl text-[12px] text-red-400 animate-in slide-in-from-top-1 duration-200" dir={isRTL ? "rtl" : "ltr"} style={{ fontFamily: isRTL ? "'Rubik', sans-serif" : "inherit" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {createError}
              </div>
            )}
          </motion.div>

          {/* ── Secondary mode indicator ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.14 }}
            className="mb-5 relative"
            ref={modeDropdownRef}
          >
            <button
              onClick={() => setShowModeDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/55 transition-colors"
            >
              <span>{currentModeObj.icon}</span>
              <span>
                {isRTL ? `מצב ${modeLabel}` : `${modeLabel} mode`}
              </span>
              <span className="text-white/20">·</span>
              <span className="underline underline-offset-2 decoration-white/20">
                {isRTL ? "שנה" : "Change"}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {showModeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-20 bg-[#13131e] border border-white/10 rounded-xl shadow-2xl shadow-black/60 p-1.5 min-w-[160px]"
                >
                  {USER_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMode(m.id); setShowModeDropdown(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left",
                        selectedMode === m.id
                          ? "bg-white/[0.06] text-white"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
                      )}
                    >
                      <span>{m.icon}</span>
                      <span>{isRTL ? m.labelHe : m.labelEn}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Starter prompt chips ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.17 }}
            className="flex flex-wrap justify-center gap-2 mb-8 max-w-2xl"
          >
            {STARTER_PROMPTS.map((tp) => (
              <button
                key={tp.label}
                onClick={() => {
                  setInput(tp.prompt);
                  textareaRef.current?.focus();
                }}
                disabled={isTransitioning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-full text-xs text-white/40 hover:text-white/80 hover:border-[hsl(191,90%,42%)]/30 hover:bg-[hsl(191,90%,42%)]/5 transition-all"
              >
                <tp.icon className="w-3 h-3 text-[hsl(191,90%,42%)]/50" />
                {tp.label}
              </button>
            ))}
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-dashed border-white/[0.07] rounded-full text-xs text-white/30 hover:text-[hsl(191,90%,42%)] hover:border-[hsl(191,90%,42%)]/30 transition-all"
            >
              <Zap className="w-3 h-3" />
              {isRTL ? "עוד תבניות" : "More templates"}
            </button>
          </motion.div>

          {/* ── Value proof ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-2xl mb-10"
          >
            <p className="text-[10px] text-white/20 uppercase tracking-[0.18em] text-center mb-3 font-medium">
              {isRTL ? "מה תקבל" : "What you'll get"}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {VALUE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[10px] text-white/40 text-center leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Recent projects ── */}
          {(projectsLoading || recentProjects.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="w-full max-w-2xl mb-10"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white/25" />
                  <span className="text-xs text-white/25 font-medium uppercase tracking-wider">
                    {isRTL ? "פרויקטים אחרונים" : "Recent projects"}
                  </span>
                </div>
                <button
                  onClick={() => navigate("/gallery")}
                  className="flex items-center gap-1 text-xs text-white/25 hover:text-white/50 transition-colors"
                >
                  {isRTL ? "גלריה" : "Gallery"} <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {projectsLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-xl animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] shrink-0" />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="h-3 bg-white/[0.06] rounded w-3/4" />
                          <div className="h-2.5 bg-white/[0.04] rounded w-1/3" />
                        </div>
                      </div>
                    ))
                  : recentProjects.map((p, i) => (
                      <motion.button
                        key={p.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.27 + i * 0.03 }}
                        onClick={() => navigate(`/project/${p.id}`)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/12 hover:bg-white/[0.05] transition-all group",
                          isRTL ? "text-right" : "text-left",
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[hsl(191,90%,42%)]/8 border border-[hsl(191,90%,42%)]/15 flex items-center justify-center shrink-0">
                          <FileCode2 className="w-3.5 h-3.5 text-[hsl(191,90%,42%)]/50 group-hover:text-[hsl(191,90%,42%)] transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-white/65 group-hover:text-white/90 truncate transition-colors">{p.title}</p>
                          <p className="text-[11px] text-white/25" dir="ltr">{format(new Date(p.updatedAt), "d MMM, HH:mm")}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-all group-hover:translate-x-0.5 shrink-0" />
                      </motion.button>
                    ))}
              </div>
            </motion.div>
          )}

          {/* ── Compact features footer ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-2xl"
          >
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {[
                { icon: "🧠", label: isRTL ? "סוכן תכנון" : "Planner agent" },
                { icon: "🛡️", label: isRTL ? "QA אוטומטי" : "Auto QA" },
                { icon: "🌐", label: isRTL ? "פרסום בלחיצה" : "1-click deploy" },
                { icon: "🎙️", label: isRTL ? "קלט קולי" : "Voice input" },
                { icon: "🖼️", label: isRTL ? "יצירת תמונות" : "Image gen" },
                { icon: "💻", label: isRTL ? "עורך קוד" : "Code editor" },
              ].map((f) => (
                <span key={f.label} className="text-[10px] text-white/25 flex items-center gap-1">
                  <span>{f.icon}</span>
                  {f.label}
                </span>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      <TemplatesModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleSelectTemplate}
      />
    </Layout>
  );
}
