import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface Template {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  category: string;
  prompt: string;
  gradient: string;
}

const TEMPLATES: Template[] = [
  {
    id: "saas-landing",
    emoji: "🚀",
    title: "SaaS Landing Page",
    desc: "hero מרשים, pricing tables, testimonials, CTA",
    category: "עסקי",
    gradient: "from-violet-500/20 to-blue-500/20",
    prompt: "בנה לי דף נחיתה מרשים ל-SaaS בשם 'FlowAI' — כלי AI לניהול משימות. כולל: hero עם headline מדהים + CTA, features section עם 6 תכונות, pricing tables (חינם/פרו/enterprise), testimonials, FAQ, ו-footer מלא. עיצוב מודרני בסגול וכחול.",
  },
  {
    id: "ecommerce",
    emoji: "🛍️",
    title: "חנות מקוונת",
    desc: "גלריית מוצרים, עגלת קניות, checkout",
    category: "מסחר",
    gradient: "from-pink-500/20 to-rose-500/20",
    prompt: "בנה חנות אופנה מקוונת מרשימה בשם 'LUXE'. כולל: header עם navigation, hero slider, גלריית מוצרים עם filter לפי קטגוריה ומחיר, כרטיסי מוצר עם הוספה לעגלה, עגלת קניות צדדית (sidebar drawer), וfooter מלא. עיצוב אלגנטי בשחור ולבן.",
  },
  {
    id: "restaurant",
    emoji: "🍕",
    title: "אתר מסעדה",
    desc: "תפריט, הזמנת שולחן, מפה",
    category: "מזון",
    gradient: "from-orange-500/20 to-yellow-500/20",
    prompt: "בנה אתר מסעדה איטלקית יוקרתית בשם 'Bella Roma'. כולל: hero עם וידאו/אנימציה, תפריט עם קטגוריות (ראשונות, עיקריות, קינוחים, משקאות) וכרטיסי מנות עם תמונות ומחירים, טופס הזמנת שולחן, ביקורות לקוחות, ו-Google Maps embed. צבעים: חם ואלגנטי.",
  },
  {
    id: "portfolio",
    emoji: "🎨",
    title: "פורטפוליו יוצר",
    desc: "גלריה, about, contact",
    category: "אישי",
    gradient: "from-emerald-500/20 to-teal-500/20",
    prompt: "בנה פורטפוליו מרשים לצלם/מעצב בשם 'Alex Studio'. כולל: hero fullscreen עם שם גדול ואנימציה, about עם bio ותמונה, גלריה עם masonry layout ו-lightbox, skills section, process section, ו-contact form עם social links. עיצוב מינימליסטי.",
  },
  {
    id: "dashboard",
    emoji: "📊",
    title: "Admin Dashboard",
    desc: "charts, tables, stats, dark mode",
    category: "כלים",
    gradient: "from-blue-500/20 to-cyan-500/20",
    prompt: "בנה admin dashboard מלא ומרשים. כולל: sidebar navigation, header עם notifications ו-user menu, stats cards (revenue, users, orders, growth), line/bar/pie charts ב-Chart.js, data table עם search ו-filter ו-pagination, recent activity feed. Dark theme מלא.",
  },
  {
    id: "blog",
    emoji: "✍️",
    title: "בלוג מגזין",
    desc: "hero, כרטיסי מאמרים, categories",
    category: "תוכן",
    gradient: "from-slate-500/20 to-gray-500/20",
    prompt: "בנה בלוג/מגזין מקצועי בשם 'TechPulse'. כולל: header עם navigation ו-search, hero עם featured article גדול, grid כרטיסי מאמרים עם תמונות/כותרות/תקציר, sidebar עם categories/tags/popular posts, newsletter signup, ו-footer. עיצוב נקי כמו Medium.",
  },
  {
    id: "fitness",
    emoji: "🏋️",
    title: "חדר כושר",
    desc: "תוכניות, מאמנים, pricing, join",
    category: "בריאות",
    gradient: "from-red-500/20 to-orange-500/20",
    prompt: "בנה אתר חדר כושר פרמיום בשם 'PowerFit'. כולל: hero דרמטי עם CTA גדול, services/classes section, pricing plans עם toggle חודשי/שנתי, מאמנים עם bio ו-social, testimonials, schedule/timetable, ו-contact. Energetic design.",
  },
  {
    id: "real-estate",
    emoji: "🏠",
    title: "נדל\"ן",
    desc: "חיפוש נכסים, listings, agent",
    category: "נדל\"ן",
    gradient: "from-amber-500/20 to-yellow-500/20",
    prompt: "בנה אתר נדל\"ן מקצועי. כולל: hero עם search bar גדול (עיר, סוג נכס, מחיר), featured listings בgrid עם תמונות/פרטים/מחיר, מפה אינטראקטיבית, agent profiles, mortgage calculator, ו-contact form. עיצוב אמין ומקצועי.",
  },
  {
    id: "wedding",
    emoji: "💍",
    title: "אתר חתונה",
    desc: "RSVP, gallery, our story, venue",
    category: "אישי",
    gradient: "from-pink-500/20 to-purple-500/20",
    prompt: "בנה אתר חתונה רומנטי ומרגש. כולל: hero עם שמות הזוג ותאריך עם countdown timer, our story עם timeline, venue details עם מפה, gallery עם תמונות ב-masonry, RSVP form, dress code, ו-thank you section. עיצוב עדין ורומנטי.",
  },
  {
    id: "startup",
    emoji: "⚡",
    title: "Startup / Product",
    desc: "product hunt style, features, demo",
    category: "עסקי",
    gradient: "from-indigo-500/20 to-violet-500/20",
    prompt: "בנה דף מוצר startup מרשים בסגנון Product Hunt. כולל: hero גדול עם product demo/mockup, key features ב-alternating sections עם illustrations, how it works ב-3 שלבים, social proof (users count, logos), pricing, FAQ, ו-CTA חזק. ולדיזיין מודרני.",
  },
  {
    id: "app-mobile",
    emoji: "📱",
    title: "אפליקציה מובייל",
    desc: "app landing, screenshots, download",
    category: "אפליקציה",
    gradient: "from-cyan-500/20 to-blue-500/20",
    prompt: "בנה דף נחיתה לאפליקציית מובייל בשם 'FocusFlow' לניהול זמן. כולל: hero עם iPhone mockup ו-app screenshots, features section עם icons, how it works, ratings ב-App Store/Google Play, testimonials מ-users, ו-download buttons. עיצוב טרנדי.",
  },
  {
    id: "todo-app",
    emoji: "✅",
    title: "אפליקציית מזכרות",
    desc: "todo list, drag & drop, categories",
    category: "כלים",
    gradient: "from-green-500/20 to-emerald-500/20",
    prompt: "בנה אפליקציית TODO מתקדמת ומעוצבת. כולל: sidebar עם categories/projects, main area עם tasks שניתן לgrouping לפי תאריך/עדיפות, הוספת task עם modal מלא (כותרת, תיאור, תאריך, עדיפות, תגיות), drag & drop למיון, search, ו-stats. Dark/Light mode.",
  },
];

const CATEGORIES = ["הכל", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))];

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (prompt: string, title: string) => void;
}

export function TemplatesModal({ isOpen, onClose, onSelectTemplate }: TemplatesModalProps) {
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = activeCategory === "הכל"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory);

  const handleSelect = async (template: Template) => {
    setLoading(template.id);
    await new Promise((r) => setTimeout(r, 100)); // small visual delay
    onSelectTemplate(template.prompt, template.title);
    onClose();
    setLoading(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: HE }}>
              תבניות מוכנות 🚀
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: HE }}>
              בחר תבנית לשינוי מהיר — ה-AI יבנה אותה לפי הסגנון שלך
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-6 pt-4 pb-2 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
              )}
              style={{ fontFamily: HE }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 px-6 pb-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                disabled={!!loading}
                className={cn(
                  "group relative p-4 rounded-xl border border-border/50 bg-card/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-right cursor-pointer disabled:opacity-60",
                  `bg-gradient-to-br ${t.gradient} bg-opacity-10`
                )}
              >
                {loading === t.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground/60 mb-0.5" style={{ fontFamily: HE }}>
                      {t.category}
                    </p>
                    <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: HE }}>
                      {t.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: HE }}>
                      {t.desc}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
