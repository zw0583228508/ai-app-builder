export interface IdeaCard {
  icon: string;
  title: string;
  desc: string;
  prompt: string;
}

export const ENTREPRENEUR_IDEAS: IdeaCard[] = [
  {
    icon: "🛍️",
    title: "חנות מקוונת",
    desc: "גלריה, מחירון, WhatsApp leads",
    prompt:
      "בנה לי חנות מקוונת מרשימה לתכשיטי כסף בעבודת יד. כולל גלריית מוצרים, מחירון, וכפתור WhatsApp בולט. צבעים: שחור וזהב.",
  },
  {
    icon: "🍕",
    title: "אתר מסעדה",
    desc: "תפריט, הזמנת שולחן, מפה",
    prompt:
      "בנה אתר למסעדה איטלקית יוקרתית בשם 'לה סטלה'. תפריט עם קטגוריות, טופס הזמנת שולחן, ביקורות לקוחות ומיקום במפה.",
  },
  {
    icon: "💼",
    title: "עמוד עסקי",
    desc: "שירותים, אודות, צור קשר",
    prompt:
      "בנה עמוד עסקי מקצועי לעסק ייעוץ פיננסי. hero מרשים, רשימת שירותים בכרטיסיות, קורות חיים וטופס יצירת קשר.",
  },
  {
    icon: "💇",
    title: "מספרה / קוסמטיקה",
    desc: "שירותים, מחירים, קביעת תור",
    prompt:
      "בנה אתר למספרה מודרנית בשם LUXE. גלריית עבודות, רשימת שירותים ומחירים, וכפתור קביעת תור בולט.",
  },
  {
    icon: "🏋️",
    title: "כושר / בריאות",
    desc: "תוכניות, testimonials, הצטרפות",
    prompt:
      "בנה אתר לחדר כושר פרמיום. hero מרשים, תוכניות חברות עם מחירים, testimonials ורשימת מאמנים.",
  },
  {
    icon: "🎓",
    title: "קורס / אקדמיה",
    desc: "תוכנית, מחיר, הרשמה",
    prompt:
      "בנה דף מכירה לקורס דיגיטלי בשיווק ברשתות חברתיות. מה תלמד, מי המרצה, ביקורות תלמידים ולחצן הרשמה.",
  },
];

export const BUILDER_IDEAS: IdeaCard[] = [
  {
    icon: "🚀",
    title: "SaaS Landing Page",
    desc: "Hero, פיצ'רים, תמחור עם GSAP",
    prompt:
      "Build a stunning SaaS landing page with GSAP entrance animations, feature cards with AOS scroll reveals, a testimonials carousel with Swiper, a pricing table with monthly/annual toggle, and a CTA footer. Dark professional theme with purple gradient.",
  },
  {
    icon: "📊",
    title: "לוח מחוונים",
    desc: "KPIs, ApexCharts, טבלאות נתונים",
    prompt:
      "Build an admin analytics dashboard with KPI stat cards with CountUp animation, a revenue line chart using ApexCharts, user distribution donut chart, and a sortable/filterable data table using Alpine.js.",
  },
  {
    icon: "🛒",
    title: "חנות אונליין",
    desc: "גריד מוצרים, עגלה, Stripe",
    prompt:
      "Build a full e-commerce store with a product grid, hover effects, a slide-out cart drawer with quantity controls, and a Stripe payment checkout modal. Use Alpine.js for all interactivity with localStorage persistence.",
  },
  {
    icon: "🤖",
    title: "ממשק AI",
    desc: "פרומפטים, streaming, היסטוריה",
    prompt:
      "Build a clean AI chatbot interface with a message history panel, a prompt input with send button, animated typing indicator, markdown rendering, and a sidebar with conversation history.",
  },
  {
    icon: "🗺️",
    title: "מאתר מיקומים",
    desc: "מפת Leaflet, חיפוש, פינים",
    prompt:
      "Build a store locator app using Leaflet.js and OpenStreetMap. Include a search bar, a list of locations on the left, custom map pins, popup info cards on click, and a 'get directions' button.",
  },
  {
    icon: "📅",
    title: "מערכת הזמנות",
    desc: "לוח שנה, משבצות זמן, טופס",
    prompt:
      "Build a professional appointment booking interface with a calendar date picker, available time slots display, a booking form with validation, and a confirmation screen with summary.",
  },
];

export const MAKER_IDEAS: IdeaCard[] = [
  {
    icon: "🌌",
    title: "חוויית Three.js",
    desc: "עולם 3D, חלקיקים, אור",
    prompt:
      "בנה לי חוויית Three.js מרשימה עם עולם תלת-ממדי, מערכת חלקיקים שמגיבה לעכבר, תאורה דינמית, ואנימציות smooth. משהו שנראה מגניב ומלא חיים.",
  },
  {
    icon: "🎮",
    title: "משחק כיפי",
    desc: "Canvas, קפיצות, ניקוד",
    prompt:
      "בנה לי משחק ב-Canvas JavaScript — ממש כיפי, עם דמות שאפשר לשלוט בה, מכשולים אקראיים, ניקוד, רמות קושי גדלות, ואפקטי סאונד. משהו שיהיה כיף לשחק בזמן שיעמום.",
  },
  {
    icon: "🎵",
    title: "ויזואליזציה של מוזיקה",
    desc: "Web Audio, גלים, צבעים",
    prompt:
      "בנה ויזואליזר מוזיקה ב-Web Audio API ו-Canvas — גלי קול צבעוניים שמגיבים לאודיו, אפקטים פסיכדליים, ואפשרות להעלות שיר. משהו שנראה מגניב בצד של מוזיקה.",
  },
  {
    icon: "🌱",
    title: "Habit Tracker אישי",
    desc: "סטריקים, גרפים, ימים",
    prompt:
      "בנה לי tracker להרגלים אישיים — כרטיסים לכל הרגל, סטריק של ימים רצופים, גרף שבועי יפה, ו-confetti כשמשלים יעד. הכל ב-localStorage, לא צריך שרת.",
  },
  {
    icon: "🎨",
    title: "סטודיו ציור",
    desc: "Canvas, כלים, צבעים",
    prompt:
      "בנה אפליקציית ציור ב-Canvas — מברשות שונות בגדלים, פלטת צבעים, מחק, undo/redo, שמירת הציור כ-PNG, ואפקט watercolor מגניב. ממש כיפי לשחק איתו.",
  },
  {
    icon: "🔮",
    title: "גנרטיבי אמנות",
    desc: "אלגוריתמים, P5.js, אקראי",
    prompt:
      "בנה גנרטור אמנות גנרטיבית עם P5.js — פטרנים אקראיים שנוצרים בכל לחיצה, צבעים מהסם, צורות שמתפתחות, ואפשרות להוריד כ-PNG. כל ריצה תיצור משהו ייחודי.",
  },
];

export const DEVELOPER_IDEAS: IdeaCard[] = [
  {
    icon: "⚛️",
    title: "שלד SPA",
    desc: "ניתוב, state, ארכיטקטורה",
    prompt:
      "Build a complete React-like SPA using Alpine.js with client-side routing, centralized state management, reusable component patterns, lazy loading of views, and a clean architecture that's easy to extend.",
  },
  {
    icon: "🔐",
    title: "זרימת Auth",
    desc: "Login, JWT, נתיבים מוגנים",
    prompt:
      "Build a complete authentication flow with login/signup forms, JWT token handling in localStorage, protected route logic, session persistence, refresh token pattern, and proper error handling with form validation.",
  },
  {
    icon: "⚡",
    title: "צ'אט WebSocket",
    desc: "Real-time, חדרים, נוכחות",
    prompt:
      "Build a real-time chat interface using WebSockets with simulated messages. Include message rooms, online presence indicators, typing indicators, message read receipts, and optimistic UI updates.",
  },
  {
    icon: "🗄️",
    title: "סייר REST API",
    desc: "Fetch, cache, טיפול בשגיאות",
    prompt:
      "Build a REST API explorer tool with method/URL input, response syntax highlighting, request history, error handling, and a Postman-like interface.",
  },
  {
    icon: "🧩",
    title: "ספריית קומפוננטים",
    desc: "Design system, tokens, תיעוד",
    prompt:
      "Build an interactive component library documentation page showcasing buttons, form inputs, cards, modals, badges, alerts, tooltips with live code examples and a design token reference table.",
  },
  {
    icon: "🎮",
    title: "חוויית WebGL",
    desc: "Three.js, shaders, controls",
    prompt:
      "Build an immersive Three.js experience with a 3D scene, custom lighting, particle system with custom shaders, orbit controls, post-processing effects (bloom, vignette), and animated camera transitions triggered by scrolling.",
  },
];

export const MODE_CONFIG = {
  entrepreneur: {
    icon: "🏢",
    label: "יזם",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "שפה עסקית, ללא קוד",
    ideas: ENTREPRENEUR_IDEAS,
    welcomeTitle: "מה נבנה היום?",
    welcomeSubtitle:
      "תאר את העסק שלך — אבנה לך אתר, אפליקציה, או דף נחיתה מקצועי תוך דקות.",
    placeholder: "תאר את הרעיון, אני אבנה אותו מיד...",
    quickStartLabel: "רעיונות מהירים",
  },
  builder: {
    icon: "🔧",
    label: "בונה",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    description: "רואה קוד, שולט בעיצוב",
    ideas: BUILDER_IDEAS,
    welcomeTitle: "מה נבנה?",
    welcomeSubtitle:
      "בקש לבנות, לשנות, לתקן — אסביר כל החלטת ארכיטקטורה ואספק קוד נקי.",
    placeholder: "קומפוננט, עיצוב, שינוי — מה בונים?",
    quickStartLabel: "רעיונות מהירים",
  },
  developer: {
    icon: "💻",
    label: "מפתח",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    description: "שליטה מלאה בקוד",
    ideas: DEVELOPER_IDEAS,
    welcomeTitle: "מה אנחנו בונים?",
    welcomeSubtitle:
      "תאר את הדרישות — אספק קוד ברמת פרודקשן עם ביצועים, אבטחה, ו-edge cases.",
    placeholder: "API, ארכיטקטורה, אלגוריתם — תאר את הדרישות...",
    quickStartLabel: "רעיונות מהירים",
  },
  maker: {
    icon: "🎨",
    label: "מייקר",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    description: "בונה לכיף ולעצמי",
    ideas: MAKER_IDEAS,
    welcomeTitle: "מה מגניב לבנות?",
    welcomeSubtitle:
      "ספר לי מה עולה לך בראש — משחק, כלי אישי, ניסוי, אנימציה. בואו נעשה משהו מדהים.",
    placeholder: "ניסוי, אנימציה, משחק — מה מגניב לבנות?",
    quickStartLabel: "השראה",
  },
};

export const GROW_WITH_ME_MESSAGES: Record<
  string,
  { title: string; description: string; emoji: string }
> = {
  builder: {
    emoji: "🔧",
    title: "מוכן לשדרג?",
    description:
      "אתה שואל שאלות טכניות יותר — עבור למצב בונה לגישה לקוד, הסברי ארכיטקטורה ושליטה רבה יותר.",
  },
  developer: {
    emoji: "💻",
    title: "אתה חושב כמו מפתח!",
    description:
      "אתה משתמש בטרמינולוגיה טכנית — עבור למצב מפתח לגישה מלאה לקוד, הערות ביצועים וניתוח אבטחה.",
  },
  maker: {
    emoji: "🎨",
    title: "רוצה לבנות לכיף?",
    description:
      "זה נשמע כמו פרויקט אישי — עבור למצב מייקר. פחות שאלות עסקיות, יותר יצירתיות וחופש.",
  },
};
