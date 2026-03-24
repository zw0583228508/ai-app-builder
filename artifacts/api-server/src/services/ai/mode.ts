export function detectUserMode(
  message: string,
): "entrepreneur" | "builder" | "developer" | "maker" {
  const lowerMsg = message.toLowerCase();

  const makerSignals = [
    // Hebrew
    "כיף", "מגניב", "ניסוי", "שחק", "גיים", "חידה", "לעצמי", "אישי",
    "לא בשביל עסק", "פרויקט קטן", "יומן", "קיר תמונות", "פלייליסט אישי",
    "מעקב אישי", "רשימה אישית",
    // English
    "for myself", "personal project", "side project", "just me",
    "no business", "for fun", "fun", "cool", "play", "game", "hobby",
    "experiment", "trying out", "just for me", "just playing",
    "three.js", "canvas", "webgl", "p5.js", "web audio",
    "pixel art", "animation", "generative", "procedural", "shader",
    "particle", "physics sim", "tracker", "habit", "journal", "diary",
    "wishlist",
  ];
  const makerScore = makerSignals.filter((s) => lowerMsg.includes(s)).length;
  if (makerScore >= 2) return "maker";

  const devKeywords = [
    // Hebrew tech terms
    "ריאקט", "קומפוננט", "הוק", "אפיאי", "ממשק תכנות", "בייסדייטה",
    "דוקר", "גיטהאב", "דפלוימנט", "מייגריישן",
    // English
    "react", "vue", "angular", "typescript", "javascript", "nodejs",
    "node.js", "api", "rest api", "graphql", "postgresql", "mysql",
    "mongodb", "redis", "docker", "kubernetes", "git", "github",
    "backend", "frontend", "component", "hook", "state management",
    "webpack", "vite", "npm", "yarn", "pnpm", "ci/cd", "microservices",
    "deployment", "aws", "gcp", "azure", "cloud", "function", "endpoint",
    "middleware", "authentication", "jwt", "oauth", "database schema",
    "migration", "orm", "prisma", "drizzle", "nextjs", "next.js",
    "express", "fastapi", "django", "rails", "laravel", "framework",
    "scss", "sass", "rollup", "esbuild", "tailwind config",
    "responsive breakpoints", "flexbox", "css grid", "web components",
    "service worker", "pwa", "websocket", "sse", "event stream", "cors",
    "environment variable", "env", "dockerfile", "nginx", "apache", "ssl",
  ];

  const builderKeywords = [
    // Hebrew
    "דשבורד", "אדמין", "מסחר אלקטרוני", "אתר", "חנות", "לקוחות",
    "תשלום", "הרשמה", "כניסה", "ניהול", "מערכת", "ממשק משתמש",
    "אפליקציה", "פלטפורמה", "פורטל", "שירות", "מוצר", "שיווק",
    "מחיר", "מנוי", "הזמנה", "פגישה",
    // English
    "dashboard", "admin panel", "cms", "crm", "e-commerce", "ecommerce",
    "user flow", "mobile app", "web app", "saas", "platform", "portal",
    "integrate", "integration", "third party", "i want control",
    "customize", "configure", "payment", "stripe", "checkout",
    "product page", "user auth", "login", "signup", "register", "role",
    "permission", "multi user", "notification", "email", "analytics",
    "report", "export", "import", "search", "filter", "sort",
    "pagination", "upload", "file", "gallery", "blog", "article",
    "content management", "user profile", "settings", "subscription",
    "plan", "pricing", "booking", "appointment", "calendar", "real time",
    "live", "chat", "messaging", "marketplace", "inventory",
  ];

  const devScore = devKeywords.filter((kw) => lowerMsg.includes(kw)).length;
  const builderScore = builderKeywords.filter((kw) =>
    lowerMsg.includes(kw),
  ).length;

  if (devScore >= 2) return "developer";
  if (devScore >= 1 || builderScore >= 2) return "builder";
  return "entrepreneur";
}
