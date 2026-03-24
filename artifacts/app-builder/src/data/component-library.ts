export interface ComponentItem {
  name: string;
  desc: string;
  prompt: string;
}

export interface ComponentCategory {
  category: string;
  icon: string;
  items: ComponentItem[];
}

export const COMPONENT_LIBRARY: ComponentCategory[] = [
  {
    category: "ניווט",
    icon: "🗂️",
    items: [
      {
        name: "Navbar מגיב",
        desc: "סרגל ניווט עם לוגו, קישורים, ותפריט המבורגר למובייל",
        prompt:
          "הוסף לאפליקציה סרגל ניווט מגיב עם לוגו, תפריט קישורים, ותפריט המבורגר למובייל. כולל hover effects ו-sticky positioning.",
      },
      {
        name: "Sidebar Panel",
        desc: "תפריט צד עם קטגוריות ואייקונים",
        prompt:
          "הוסף sidebar panel עם תפריט ניווט, קטגוריות, ואייקונים. כולל collapse/expand ו-active states.",
      },
      {
        name: "Breadcrumbs",
        desc: "ניווט מפת דרכים",
        prompt:
          "הוסף breadcrumbs navigation עם chevron separators ו-RTL support.",
      },
      {
        name: "Tabs Navigation",
        desc: "לשוניות עם תוכן דינאמי",
        prompt:
          "הוסף tabs navigation עם תוכן דינאמי לכל לשונית, כולל אנימציית מעבר.",
      },
    ],
  },
  {
    category: "Hero / כותרות",
    icon: "🚀",
    items: [
      {
        name: "Hero Section",
        desc: "כותרת ראשית עם CTA ותמונה",
        prompt:
          "הוסף hero section מרשים עם כותרת גדולה, תיאור, כפתור CTA, וגרדיאנט רקע. כולל אנימציית כניסה.",
      },
      {
        name: "Hero עם וידאו",
        desc: "כותרת עם רקע וידאו",
        prompt:
          "הוסף hero section עם רקע וידאו מלא, overlay כהה, כותרת לבנה, ו-CTA buttons.",
      },
      {
        name: "Hero Split-Screen",
        desc: "כותרת עם תמונה בצד",
        prompt:
          "הוסף split-screen hero section עם טקסט בצד אחד ותמונה/אילוסטרציה בצד השני.",
      },
      {
        name: "Announcement Bar",
        desc: "רצועת הכרזה בראש הדף",
        prompt:
          "הוסף announcement bar בראש הדף עם הודעה, קישור, וכפתור סגירה.",
      },
    ],
  },
  {
    category: "קארדים",
    icon: "🃏",
    items: [
      {
        name: "Product Card",
        desc: "קארד מוצר עם תמונה, מחיר ו-CTA",
        prompt:
          "הוסף product cards grid עם תמונות, כותרת מוצר, מחיר, דירוג כוכבים, וכפתור הוסף לסל.",
      },
      {
        name: "Blog Post Card",
        desc: "קארד פוסט בלוג",
        prompt:
          "הוסף blog post cards עם תמונה, תגיות, כותרת, תקציר קצר, תאריך ושם מחבר.",
      },
      {
        name: "Team Member Card",
        desc: "קארד חבר צוות עם תמונה ורשתות חברתיות",
        prompt:
          "הוסף team cards עם תמונת פרופיל, שם, תפקיד, ביו קצר, וקישורי LinkedIn/Twitter.",
      },
      {
        name: "Pricing Card",
        desc: "קארד תמחור עם תכונות",
        prompt:
          "הוסף pricing cards עם 3 מסלולים (בסיסי/מקצועי/עסקי), רשימת תכונות, ו-CTA. הדגש את המסלול המומלץ.",
      },
      {
        name: "Testimonial Card",
        desc: "קארד ביקורת לקוח",
        prompt:
          "הוסף testimonial cards עם ציטוט, תמונת לקוח, שם ותפקיד, ודירוג כוכבים.",
      },
    ],
  },
  {
    category: "טפסים",
    icon: "📝",
    items: [
      {
        name: "Contact Form",
        desc: "טופס יצירת קשר עם ולידציה",
        prompt:
          "הוסף contact form מקצועי עם שדות שם, מייל, טלפון, נושא, הודעה. כולל ולידציה ו-success message.",
      },
      {
        name: "Login / Register",
        desc: "טופס כניסה/הרשמה",
        prompt:
          "הוסף login/register form עם tabs לעבור בין כניסה להרשמה, שדות מתאימים, ו-remember me.",
      },
      {
        name: "Newsletter Signup",
        desc: "הרשמה לניוזלטר",
        prompt:
          "הוסף newsletter signup section עם כותרת, תיאור קצר, שדה מייל, וכפתור הרשמה עם אנימציית success.",
      },
      {
        name: "Search Bar",
        desc: "חיפוש עם autocomplete",
        prompt:
          "הוסף search bar מתקדם עם אייקון, placeholder, ו-live suggestions dropdown.",
      },
      {
        name: "File Upload",
        desc: "אזור גרירת קבצים",
        prompt:
          "הוסף drag-and-drop file upload zone עם progress bar, file type validation, ותצוגת קבצים שהועלו.",
      },
    ],
  },
  {
    category: "UI Elements",
    icon: "🎨",
    items: [
      {
        name: "Modal Dialog",
        desc: "חלון פופ-אפ עם overlay",
        prompt:
          "הוסף modal dialog עם overlay, כותרת, תוכן, כפתורי action, וסגירה ב-click חוץ. כולל אנימציית כניסה/יציאה.",
      },
      {
        name: "Toast Notifications",
        desc: "הודעות קופצות (success/error/info)",
        prompt:
          "הוסף toast notification system עם סוגים: success (ירוק), error (אדום), warning (צהוב), info (כחול). כולל auto-dismiss.",
      },
      {
        name: "Loading Skeleton",
        desc: "מסך טעינה עם skeleton",
        prompt:
          "הוסף loading skeleton components שמחקים את מבנה הדף תוך כדי טעינה, עם shimmer animation.",
      },
      {
        name: "Progress Bar",
        desc: "סרגל התקדמות אנימטיבי",
        prompt:
          "הוסף animated progress bars עם אחוזים, צבעים שונים, ו-striped/gradient variants.",
      },
      {
        name: "Accordion / FAQ",
        desc: "שאלות ותשובות מתפרסות",
        prompt:
          "הוסף FAQ accordion section עם שאלות ותשובות, אנימציית פתיחה/סגירה חלקה.",
      },
      {
        name: "Tooltip",
        desc: "הסברים קופצים על hover",
        prompt:
          "הוסף tooltip components לאלמנטים שונים עם hover effect ומיקום חכם (top/bottom/left/right).",
      },
    ],
  },
  {
    category: "נתונים ומדדים",
    icon: "📊",
    items: [
      {
        name: "Stats Dashboard",
        desc: "כרטיסי סטטיסטיקה עם מספרים",
        prompt:
          "הוסף statistics dashboard עם 4+ כרטיסי מדד (משתמשים, הכנסות, הזמנות, צמיחה) ואנימציית count-up.",
      },
      {
        name: "Data Table",
        desc: "טבלה עם מיון וסינון",
        prompt:
          "הוסף data table מקצועי עם sort, filter, pagination, וחיפוש. כולל row selection ו-export.",
      },
      {
        name: "Chart Section",
        desc: "גרפים ויזואליים עם Chart.js",
        prompt:
          "הוסף charts section עם Chart.js — bar chart, line chart, ו-pie chart עם נתונים לדוגמה ולגנדה.",
      },
      {
        name: "Timeline",
        desc: "ציר זמן אנכי",
        prompt:
          "הוסף vertical timeline עם אירועים, תאריכים, אייקונים, ואנימציית scroll-reveal.",
      },
    ],
  },
  {
    category: "Sections",
    icon: "📄",
    items: [
      {
        name: "Features Grid",
        desc: "גריד תכונות עם אייקונים",
        prompt:
          "הוסף features section עם grid של 6 תכונות, לכל אחת: אייקון, כותרת, ותיאור. כולל hover effects.",
      },
      {
        name: "How It Works",
        desc: "שלבי תהליך",
        prompt:
          "הוסף 'איך זה עובד' section עם 3-4 שלבים מחוברים בחצים, ממוספרים עם תיאור לכל שלב.",
      },
      {
        name: "CTA Section",
        desc: "קריאה לפעולה עם גרדיאנט",
        prompt:
          "הוסף CTA section עם גרדיאנט, כותרת שיווקית, תיאור קצר, ו-2 כפתורים (ראשי ומשני).",
      },
      {
        name: "Footer",
        desc: "פוטר מקצועי עם קישורים",
        prompt:
          "הוסף footer מקצועי עם לוגו, עמודות קישורים, רשתות חברתיות, ו-copyright.",
      },
      {
        name: "Cookie Banner",
        desc: "הודעת עוגיות GDPR",
        prompt:
          "הוסף cookie consent banner תחתון עם כפתורי אישור/דחייה ו-link לפוליסה.",
      },
    ],
  },
  {
    category: "גלריה ומדיה",
    icon: "🖼️",
    items: [
      {
        name: "Image Gallery",
        desc: "גלריה עם lightbox",
        prompt:
          "הוסף responsive image gallery עם masonry layout ו-lightbox לתצוגת תמונה מלאה בלחיצה.",
      },
      {
        name: "Carousel / Slider",
        desc: "קרוסלה עם חצים",
        prompt:
          "הוסף image carousel עם כפתורי הקודם/הבא, dots indicators, ו-auto-play אופציונלי.",
      },
      {
        name: "Video Player",
        desc: "נגן וידאו מותאם",
        prompt:
          "הוסף custom video player עם controls (play/pause/volume/fullscreen), progress bar, ו-thumbnail.",
      },
    ],
  },
  {
    category: "Commerce",
    icon: "🛒",
    items: [
      {
        name: "Shopping Cart",
        desc: "עגלת קניות עם פריטים",
        prompt:
          "הוסף shopping cart panel עם רשימת פריטים, כמות, מחיר, סיכום, וכפתור checkout.",
      },
      {
        name: "Product Gallery",
        desc: "גלריית מוצרים עם פילטרים",
        prompt:
          "הוסף product gallery עם filter buttons לפי קטגוריה, grid layout, ו-hover effects עם quick-view.",
      },
      {
        name: "Checkout Form",
        desc: "טופס תשלום שלב-אחר-שלב",
        prompt:
          "הוסף multi-step checkout form: פרטים אישיים → כתובת משלוח → פרטי תשלום → אישור הזמנה.",
      },
    ],
  },
];
