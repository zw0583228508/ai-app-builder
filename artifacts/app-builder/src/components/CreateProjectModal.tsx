import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Monitor,
  Globe,
  Smartphone,
  Briefcase,
  FileCode,
  Sparkles,
  ChevronDown,
  Settings2,
} from "lucide-react";
import { useCreateProject, ProjectType } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROJECT_TYPES = [
  {
    id: "webapp",
    label: "אפליקציה ווב",
    icon: Monitor,
    desc: "אפליקציית ווב אינטראקטיבית עם לוגיקה",
    defaultStack: "html",
  },
  {
    id: "mobile",
    label: "אפליקציה מובייל",
    icon: Smartphone,
    desc: "PWA responsive לנייד, מגע ואנימציות",
    defaultStack: "html",
  },
  {
    id: "website",
    label: "אתר",
    icon: Globe,
    desc: "אתר רב-עמודי אינפורמטיבי",
    defaultStack: "html",
  },
  {
    id: "landing",
    label: "דף נחיתה",
    icon: FileCode,
    desc: "עמוד יחיד ממוקד המרה",
    defaultStack: "html",
  },
  {
    id: "portfolio",
    label: "פורטפוליו",
    icon: Briefcase,
    desc: "הצג את העבודות והכישורים שלך",
    defaultStack: "html",
  },
  {
    id: "other",
    label: "אחר",
    icon: FileCode,
    desc: "קומפוננט מותאם או ניסוי",
    defaultStack: "html",
  },
] as const;

const STACK_OPTIONS = [
  {
    id: "html",
    label: "HTML",
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  },
  {
    id: "react",
    label: "React",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    id: "nextjs",
    label: "Next.js",
    color: "text-white border-white/20 bg-white/5",
  },
  {
    id: "vue",
    label: "Vue 3",
    color: "text-green-400 border-green-500/30 bg-green-500/10",
  },
  {
    id: "svelte",
    label: "Svelte",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
  },
  {
    id: "node",
    label: "Node.js",
    color: "text-lime-400 border-lime-500/30 bg-lime-500/10",
  },
  {
    id: "fastapi",
    label: "FastAPI",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    id: "django",
    label: "Django",
    color: "text-teal-400 border-teal-500/30 bg-teal-500/10",
  },
  {
    id: "angular",
    label: "Angular",
    color: "text-red-500 border-red-600/30 bg-red-600/10",
  },
];

export function CreateProjectModal({
  isOpen,
  onClose,
}: CreateProjectModalProps) {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("webapp");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stackOverride, setStackOverride] = useState<string | null>(null);

  const createProject = useCreateProject();

  const selectedProjectType = PROJECT_TYPES.find((pt) => pt.id === type)!;
  const effectiveStack = stackOverride ?? selectedProjectType.defaultStack;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createProject.mutate(
      { data: { title, description, type } },
      {
        onSuccess: async (newProject) => {
          if (effectiveStack !== "html") {
            await fetch(`/api/projects/${newProject.id}`, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ stack: effectiveStack }),
            });
          }
          onClose();
          setLocation(`/project/${newProject.id}`);
          setTitle("");
          setDescription("");
          setType("webapp");
          setStackOverride(null);
          setShowAdvanced(false);
        },
      },
    );
  };

  const handleTypeChange = (newType: ProjectType) => {
    setType(newType);
    setStackOverride(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111118] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 w-full max-w-lg overflow-hidden flex flex-col"
            dir="rtl"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2
                  className="text-base font-semibold text-slate-100"
                  style={{ fontFamily: HE }}
                >
                  פרויקט חדש
                </h2>
                <p
                  className="text-xs text-slate-500 mt-0.5"
                  style={{ fontFamily: HE }}
                >
                  מה תרצה לבנות היום?
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              {/* Project Name */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-slate-400"
                  style={{ fontFamily: HE }}
                >
                  שם הפרויקט
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="לדוגמה: לוח מחוונים של ACME"
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0f] border border-white/[0.08] rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-all text-right text-sm"
                  style={{ fontFamily: HE }}
                />
              </div>

              {/* Project Type */}
              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-slate-400"
                  style={{ fontFamily: HE }}
                >
                  סוג פרויקט
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_TYPES.map((pt) => {
                    const Icon = pt.icon;
                    const isSelected = type === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => handleTypeChange(pt.id as ProjectType)}
                        className={cn(
                          "flex items-start gap-2.5 p-3 rounded-xl border text-right transition-all duration-150",
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500/30 shadow-sm"
                            : "bg-[#0a0a0f] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]",
                        )}
                      >
                        <div
                          className={cn(
                            "p-1.5 rounded-lg shrink-0 mt-0.5",
                            isSelected
                              ? "bg-indigo-500/20 text-indigo-400"
                              : "bg-white/[0.04] text-slate-500",
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div
                            className={cn(
                              "text-xs font-medium",
                              isSelected ? "text-indigo-300" : "text-slate-300",
                            )}
                            style={{ fontFamily: HE }}
                          >
                            {pt.label}
                          </div>
                          <div
                            className="text-[10px] text-slate-600 mt-0.5 leading-tight"
                            style={{ fontFamily: HE }}
                          >
                            {pt.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Initial Instructions */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-slate-400"
                  style={{ fontFamily: HE }}
                >
                  הוראות ראשוניות{" "}
                  <span className="text-slate-600 font-normal">
                    (אופציונלי)
                  </span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תאר מה אתה רוצה לבנות כדי לתת ל-AI הקשר..."
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0f] border border-white/[0.08] rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-all resize-none h-20 text-right text-sm"
                  style={{ fontFamily: HE }}
                />
              </div>

              {/* Advanced: Tech Stack Override */}
              <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/[0.02] transition-all"
                  style={{ fontFamily: HE }}
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>הגדרות מתקדמות</span>
                    {stackOverride && (
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-medium">
                        טכנולוגיה:{" "}
                        {
                          STACK_OPTIONS.find((s) => s.id === stackOverride)
                            ?.label
                        }
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform duration-200",
                      showAdvanced && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.06]">
                        <p
                          className="text-[10px] text-slate-600 mb-2.5"
                          style={{ fontFamily: HE }}
                        >
                          המערכת בחרה אוטומטית:{" "}
                          <span className="text-slate-400 font-medium">
                            {
                              STACK_OPTIONS.find(
                                (s) =>
                                  s.id === selectedProjectType.defaultStack,
                              )?.label
                            }
                          </span>
                          . ניתן לשנות:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {STACK_OPTIONS.map((s) => {
                            const isActive = effectiveStack === s.id;
                            const isDefault =
                              selectedProjectType.defaultStack === s.id &&
                              !stackOverride;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() =>
                                  setStackOverride(
                                    s.id === selectedProjectType.defaultStack
                                      ? null
                                      : s.id,
                                  )
                                }
                                className={cn(
                                  "px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all",
                                  isActive
                                    ? s.color
                                    : "text-slate-600 border-white/[0.06] hover:text-slate-400 hover:border-white/[0.12]",
                                )}
                                style={{ fontFamily: HE }}
                              >
                                {s.label}
                                {isDefault && (
                                  <span className="mr-1 text-[9px] opacity-60">
                                    (ברירת מחדל)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-start gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!title.trim() || createProject.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{ fontFamily: HE }}
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> יוצר...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> צור פרויקט
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-200 transition-colors"
                  style={{ fontFamily: HE }}
                >
                  ביטול
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
