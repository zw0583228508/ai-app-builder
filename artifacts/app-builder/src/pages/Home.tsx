import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import {
  ArrowRight,
  LayoutTemplate,
  Clock,
  FileCode2,
  ChevronRight,
  Lock,
  Sparkles,
  Play,
  Layers,
  ChevronDown,
  FolderOpen,
  LogIn,
  User,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion, AnimatePresence } from "framer-motion";
import { TemplatesModal } from "@/components/TemplatesModal";
import { BuildingTransition } from "@/components/BuildingTransition";
import { useLocation } from "wouter";
import { useListProjects } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useLang } from "@/lib/i18n";

const PRIMARY = "hsl(191,90%,42%)";

const ROTATING_PLACEHOLDERS_HE = [
  "צור אפליקציית קריוקי עם ניקוד ולוח תוצאות",
  "בנה לי SaaS לניהול לקוחות ופרויקטים",
  "עשה כלי AI ויראלי שאנשים ישתפו",
  "בנה חנות אונליין עם סל קניות ותשלום",
  "צור דשבורד אנליטיקס עם גרפים בזמן אמת",
];

const ROTATING_PLACEHOLDERS_EN = [
  "Create a karaoke app with scoring and leaderboards",
  "Build me a SaaS for managing clients",
  "Make a viral AI tool people will share",
  "Build an online store with cart and checkout",
  "Create an analytics dashboard with real-time charts",
];

const QUICK_CHIPS_HE = [
  { label: "רעיון AI", prompt: "בנה כלי AI חכם שעוזר למשתמשים לפתור בעיות יומיומיות" },
  { label: "אפליקציית מובייל", prompt: "בנה אפליקציית מובייל חברתית עם פרופיל, פיד ודחיפות" },
  { label: "מוצר SaaS", prompt: "בנה פלטפורמת SaaS עם הרשמה, תשלום ולוח ניהול" },
  { label: "מרקטפלייס", prompt: "בנה מרקטפלייס עם מוכרים, קונים, ביקורות ותשלומים" },
  { label: "דשבורד", prompt: "בנה דשבורד ניהולי עם טבלאות, גרפים ומסנני נתונים" },
];

const QUICK_CHIPS_EN = [
  { label: "AI startup idea", prompt: "Build a smart AI tool that helps users solve everyday problems" },
  { label: "Mobile app", prompt: "Build a social mobile app with profiles, feed and push notifications" },
  { label: "SaaS product", prompt: "Build a SaaS platform with signup, payment and management dashboard" },
  { label: "Marketplace", prompt: "Build a marketplace with sellers, buyers, reviews and payments" },
  { label: "Dashboard", prompt: "Build an admin dashboard with tables, charts and data filters" },
];

const USER_MODES = [
  { id: "entrepreneur", icon: "🏢", labelHe: "יזם", labelEn: "Entrepreneur" },
  { id: "builder", icon: "🔧", labelHe: "בונה", labelEn: "Builder" },
  { id: "developer", icon: "💻", labelHe: "מפתח", labelEn: "Developer" },
  { id: "maker", icon: "🎨", labelHe: "מייקר", labelEn: "Maker" },
];

export default function Home() {
  const { meta, lang } = useLang();
  const isRTL = meta.rtl;
  const { user, isAuthenticated, login, logout } = useAuth();

  const [showTemplates, setShowTemplates] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [input, setInput] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState("entrepreneur");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  const [, navigate] = useLocation();
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  const PLACEHOLDERS = isRTL ? ROTATING_PLACEHOLDERS_HE : ROTATING_PLACEHOLDERS_EN;
  const CHIPS = isRTL ? QUICK_CHIPS_HE : QUICK_CHIPS_EN;

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [input]);

  // Rotating placeholder every 2.5s
  useEffect(() => {
    if (input) return;
    const interval = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
        setPhVisible(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, [input, PLACEHOLDERS.length]);

  // Close mode dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node))
        setShowModeDropdown(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const currentModeObj = USER_MODES.find((m) => m.id === selectedMode) || USER_MODES[0];
  const modeLabel = isRTL ? currentModeObj.labelHe : currentModeObj.labelEn;

  const handleProjectCreateError = async (res: Response) => {
    setIsTransitioning(false);
    if (res.status === 401) { setSessionExpired(true); return; }
    if (res.status === 402) {
      const data = await res.json().catch(() => ({}));
      setCreateError((data as { error?: string }).error || (isRTL ? "הגעת למגבלת הפרויקטים" : "Project limit reached"));
    } else {
      setCreateError(isRTL ? "לא הצלחנו ליצור פרויקט. נסה שוב." : "Failed to create project. Please try again.");
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
      if (!res.ok) { await handleProjectCreateError(res); return; }
      const project = await res.json();
      sessionStorage.setItem("builder_pending_prompt", text);
      setTimeout(() => navigate(`/project/${project.id}`), 700);
    } catch {
      setIsTransitioning(false);
      setCreateError(isRTL ? "שגיאת רשת. בדוק חיבור ונסה שוב." : "Network error. Check connection and try again.");
      setTimeout(() => setCreateError(null), 5000);
    }
  };

  const handleSelectTemplate = async (prompt: string, title: string) => {
    setIsTransitioning(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type: "website", userMode: selectedMode }),
      });
      if (!res.ok) { await handleProjectCreateError(res); return; }
      const project = await res.json();
      sessionStorage.setItem("builder_pending_prompt", prompt);
      setTimeout(() => navigate(`/project/${project.id}`), 700);
    } catch { setIsTransitioning(false); }
  };

  const recentProjects = projects?.slice(0, 4) ?? [];

  return (
    <Layout hideSidebar>
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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[hsl(191,90%,42%)]/7 rounded-full blur-[150px]" />
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-purple-600/4 rounded-full blur-[120px]" />
        </div>

        {/* ── Top navbar ── */}
        <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[hsl(191,90%,42%)] to-purple-500 flex items-center justify-center shadow-lg shadow-[hsl(191,90%,42%)]/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">AI Builder</span>
          </div>
          {/* Nav actions */}
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            {isAuthenticated && (
              <button
                onClick={() => navigate("/gallery")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-white/40 hover:text-white/75 hover:bg-white/[0.05] transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {isRTL ? "הפרויקטים שלי" : "My projects"}
              </button>
            )}
            {isAuthenticated ? (
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-white/35 hover:text-white/65 hover:bg-white/[0.05] transition-all"
                title={isRTL ? "יציאה" : "Sign out"}
              >
                <User className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{user?.firstName || user?.email || (isRTL ? "חשבון" : "Account")}</span>
              </button>
            ) : (
              <button
                onClick={() => login()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium bg-white/[0.07] border border-white/[0.1] text-white/65 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.18] transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                {isRTL ? "התחבר" : "Sign in"}
              </button>
            )}
          </div>
        </nav>

        <div className="relative z-10 flex flex-col items-center min-h-[calc(100%-72px)] px-4 pt-6 pb-24">

          {/* HERO */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-center mb-8 max-w-2xl"
          >
            <h1 className="text-4xl sm:text-5xl md:text-[3.2rem] font-black text-white leading-[1.1] mb-4 tracking-tight">
              {isRTL ? (
                <>בנה אפליקציה אמיתית<br /><span style={{ color: PRIMARY }}>רק בלתרמד אותה</span></>
              ) : (
                <>Build a full app<br /><span style={{ color: PRIMARY }}>just by describing it</span></>
              )}
            </h1>
            <p className="text-base text-white/38 leading-relaxed">
              {isRTL
                ? "בלי קוד. בלי הגדרות. פשוט תגיד לי מה אתה רוצה."
                : "No coding. No setup. Describe your idea and I'll turn it into a real product."}
            </p>
          </motion.div>

          {/* Return trigger for returning users */}
          {!projectsLoading && recentProjects.length > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.07 }}
              onClick={() => navigate(`/project/${recentProjects[0].id}`)}
              className="w-full max-w-3xl flex items-center justify-between gap-3 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] hover:border-[hsl(191,90%,42%)]/30 hover:bg-[hsl(191,90%,42%)]/5 rounded-xl transition-all group mb-5"
              dir={isRTL ? "rtl" : "ltr"}
            >
              <div className={cn("flex items-center gap-3 min-w-0", isRTL && "flex-row-reverse")}>
                <div className="w-6 h-6 rounded-lg bg-[hsl(191,90%,42%)]/10 border border-[hsl(191,90%,42%)]/20 flex items-center justify-center shrink-0">
                  <Play className="w-3 h-3 text-[hsl(191,90%,42%)]/60 group-hover:text-[hsl(191,90%,42%)] transition-colors" />
                </div>
                <p className="text-[11px] text-white/40 group-hover:text-white/65 transition-colors truncate">
                  <span className="text-white/20">{isRTL ? "המשך מאיפה שעצרת · " : "Continue where you left off · "}</span>
                  {recentProjects[0].title}
                </p>
              </div>
              <ChevronRight className={cn("w-3.5 h-3.5 text-white/15 group-hover:text-[hsl(191,90%,42%)]/60 transition-all shrink-0", isRTL ? "rotate-180" : "")} />
            </motion.button>
          )}

          {/* MAIN INPUT */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-3xl mb-2"
          >
            <div
              className={cn(
                "relative rounded-2xl border bg-white/[0.04] shadow-2xl shadow-black/50 transition-all duration-300",
                input
                  ? "border-[hsl(191,90%,42%)]/50 shadow-[hsl(191,90%,42%)]/10"
                  : "border-white/10 focus-within:border-[hsl(191,90%,42%)]/50 focus-within:shadow-[hsl(191,90%,42%)]/8",
              )}
            >
              {/* Rotating placeholder (shown when input empty) */}
              {!input && (
                <div
                  className="absolute top-5 pointer-events-none select-none"
                  style={{ [isRTL ? "right" : "left"]: "1.25rem" }}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIdx}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: phVisible ? 1 : 0, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3 }}
                      className="text-white/22 text-base leading-relaxed"
                      style={{ fontFamily: meta.font }}
                    >
                      {PLACEHOLDERS[placeholderIdx]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}

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
                placeholder=""
                className="w-full bg-transparent px-5 pt-5 pb-3 text-white resize-none focus:outline-none min-h-[90px] leading-relaxed relative z-10"
                style={{ fontSize: "16px" }}
                dir={isRTL ? "rtl" : "ltr"}
                rows={3}
                autoFocus
              />

              {/* Bottom bar */}
              <div className={cn("flex items-center justify-between px-4 pb-4 pt-1 gap-3", isRTL && "flex-row-reverse")}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    {isRTL ? "תבניות" : "Templates"}
                  </button>
                  <button
                    onClick={() => navigate("/gallery")}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {isRTL ? "גלריה" : "Gallery"}
                  </button>
                </div>

                <button
                  onClick={() => handleCreate()}
                  disabled={!input.trim() || isTransitioning}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0",
                    "shadow-lg hover:-translate-y-0.5 active:translate-y-0",
                    "disabled:opacity-35 disabled:hover:translate-y-0 disabled:cursor-not-allowed",
                    input.trim()
                      ? "bg-[hsl(191,90%,42%)] text-black hover:bg-[hsl(191,90%,50%)] shadow-[hsl(191,90%,42%)]/40"
                      : "bg-white/8 text-white/30 border border-white/10",
                  )}
                >
                  {isTransitioning ? (
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
                  )}
                  {isRTL ? "התחל לבנות" : "Start building"}
                </button>
              </div>
            </div>

            {/* Errors */}
            {sessionExpired && (
              <div className="mt-2.5 flex flex-col gap-2 px-3 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[12px] text-amber-300 animate-in slide-in-from-top-1" dir="rtl" style={{ fontFamily: "'Rubik', sans-serif" }}>
                <div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 shrink-0" /><span>הסשן פג — יש להתחבר מחדש</span></div>
                <button onClick={() => { window.location.href = import.meta.env.DEV ? "/api/dev-login" : "/api/login"; }} className="self-start px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[11px] font-medium">כנס מחדש</button>
              </div>
            )}
            {createError && (
              <div className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-xl text-[12px] text-red-400 animate-in slide-in-from-top-1" dir={isRTL ? "rtl" : "ltr"}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {createError}
              </div>
            )}
          </motion.div>

          {/* Mode indicator (secondary) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-5 relative"
            ref={modeDropdownRef}
          >
            <button
              onClick={() => setShowModeDropdown((p) => !p)}
              className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors"
            >
              <span>{currentModeObj.icon}</span>
              <span>{isRTL ? `מצב ${modeLabel}` : `${modeLabel} mode`}</span>
              <span className="text-white/15">·</span>
              <span className="underline underline-offset-2 decoration-white/15">{isRTL ? "שנה" : "Change"}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showModeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-20 bg-[#13131e] border border-white/10 rounded-xl shadow-2xl shadow-black/60 p-1.5 min-w-[160px]"
                >
                  {USER_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMode(m.id); setShowModeDropdown(false); }}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left", selectedMode === m.id ? "bg-white/[0.06] text-white" : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]")}
                    >
                      <span>{m.icon}</span><span>{isRTL ? m.labelHe : m.labelEn}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* QUICK CHIPS */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="flex flex-wrap justify-center gap-2 mb-10 max-w-xl"
          >
            {CHIPS.map((chip) => (
              <motion.button
                key={chip.label}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setInput(chip.prompt); textareaRef.current?.focus(); }}
                disabled={isTransitioning}
                className="px-3.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-[12px] text-white/45 hover:text-white/85 hover:border-[hsl(191,90%,42%)]/35 hover:bg-[hsl(191,90%,42%)]/6 transition-all"
              >
                {chip.label}
              </motion.button>
            ))}
          </motion.div>

          {/* VALUE PROOF */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="w-full max-w-md mb-10"
          >
            <p className="text-[9px] text-white/18 uppercase tracking-[0.2em] text-center mb-3 font-medium">
              {isRTL ? "מה תקבל" : "What you'll get"}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(isRTL
                ? [{ icon: "🎨", label: "UI מלא" }, { icon: "⚙️", label: "לוגיקה" }, { icon: "🗄️", label: "DB" }, { icon: "🚀", label: "פרסום" }]
                : [{ icon: "🎨", label: "Full UI" }, { icon: "⚙️", label: "Logic" }, { icon: "🗄️", label: "Database" }, { icon: "🚀", label: "Deploy" }]
              ).map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white/[0.025] border border-white/[0.05]">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[9px] text-white/35 text-center">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RECENT PROJECTS */}
          {(projectsLoading || recentProjects.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="w-full max-w-3xl mb-8"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-[10px] text-white/20 font-medium uppercase tracking-wider">
                    {isRTL ? "פרויקטים אחרונים" : "Recent projects"}
                  </span>
                </div>
                <button onClick={() => navigate("/gallery")} className="text-[10px] text-white/20 hover:text-white/45 transition-colors flex items-center gap-0.5">
                  {isRTL ? "כל הגלריה" : "See all"} <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
                {projectsLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl animate-pulse">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 bg-white/[0.05] rounded w-3/4" />
                          <div className="h-2 bg-white/[0.03] rounded w-1/3" />
                        </div>
                      </div>
                    ))
                  : recentProjects.map((p, i) => (
                      <motion.button
                        key={p.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.28 + i * 0.03 }}
                        onClick={() => navigate(`/project/${p.id}`)}
                        className={cn("flex items-center gap-3 px-4 py-3 bg-white/[0.025] border border-white/[0.05] rounded-xl hover:border-white/10 hover:bg-white/[0.04] transition-all group", isRTL ? "text-right" : "text-left")}
                      >
                        <div className="w-7 h-7 rounded-lg bg-[hsl(191,90%,42%)]/8 border border-[hsl(191,90%,42%)]/12 flex items-center justify-center shrink-0">
                          <FileCode2 className="w-3.5 h-3.5 text-[hsl(191,90%,42%)]/40 group-hover:text-[hsl(191,90%,42%)] transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-white/55 group-hover:text-white/85 truncate transition-colors">{p.title}</p>
                          <p className="text-[10px] text-white/20" dir="ltr">{format(new Date(p.updatedAt), "d MMM, HH:mm")}</p>
                        </div>
                        <ChevronRight className={cn("w-3 h-3 text-white/15 group-hover:text-white/35 transition-all shrink-0", isRTL ? "rotate-180" : "group-hover:translate-x-0.5")} />
                      </motion.button>
                    ))}
              </div>
            </motion.div>
          )}

          {/* SOCIAL PROOF FOOTER */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32 }}
            className="flex flex-wrap justify-center gap-x-5 gap-y-1.5"
          >
            {(isRTL
              ? ["🧠 סוכן תכנון", "🛡️ QA אוטומטי", "🌐 פרסום בלחיצה", "🎙️ קלט קולי", "🖼️ יצירת תמונות"]
              : ["🧠 Planner agent", "🛡️ Auto QA", "🌐 1-click deploy", "🎙️ Voice input", "🖼️ Image gen"]
            ).map((f) => (
              <span key={f} className="text-[10px] text-white/20">{f}</span>
            ))}
          </motion.div>

        </div>
      </div>

      <TemplatesModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </Layout>
  );
}
