export type ChatIntent =
  | "create"
  | "edit"
  | "fix"
  | "deploy"
  | "git_push"
  | "inspect"
  | "add_feature"
  | "general";

export interface DetectedIntent {
  intent: ChatIntent;
  label: string;
  emoji: string;
}

// \b does not work with Hebrew chars (they are non-word chars in JS regex).
// Use two separate patterns: Latin terms with \b, Hebrew terms without \b.
function matchesIntent(
  content: string,
  latinPattern: RegExp,
  hebrewPattern: RegExp | null,
): boolean {
  if (latinPattern.test(content)) return true;
  if (hebrewPattern && hebrewPattern.test(content)) return true;
  return false;
}

export function detectChatIntent(
  content: string,
  hasExistingCode: boolean,
): DetectedIntent {
  const lower = content.toLowerCase();

  // deploy
  if (
    matchesIntent(
      lower,
      /\b(deploy|publish|netlify|make.?live|go.?live)\b/,
      /פרסם|פרסום|הפוך.?לחי|העלה.?לאינטרנט|שים.?באינטרנט/,
    )
  )
    return { intent: "deploy", label: "פורס לנטליפיי", emoji: "🚀" };

  // git_push
  if (
    matchesIntent(
      lower,
      /\b(push|commit|github|git.?push|sync.?git|push.?to.?git)\b/,
      /גיטהאב|שמור.?ב.?git|סנכרן.?github/,
    )
  )
    return { intent: "git_push", label: "מסנכרן GitHub", emoji: "📦" };

  // fix
  if (
    matchesIntent(
      lower,
      /\b(fix|bug|error|broken|crash|not.?working|doesn.?t.?work|problem|issue)\b/,
      /לא.?עובד|תקן|שגיאה|באג|שבור|לא.?מופיע|לא.?נטען|בעיה/,
    )
  )
    return { intent: "fix", label: "מתקן בעיה", emoji: "🔧" };

  // continue / keep going
  if (
    hasExistingCode &&
    matchesIntent(
      lower,
      /\b(continue|keep.?going|carry.?on|keep.?building|add.?more|extend|keep.?it.?going|go.?on)\b/,
      /המשך|תמשיך|המשיך|המשיכ|עוד.?קצת|תמשיך.?מאיפה/,
    )
  )
    return { intent: "add_feature", label: "ממשיך לבנות", emoji: "▶️" };

  // inspect
  if (
    hasExistingCode &&
    matchesIntent(
      lower,
      /\b(what.?is|what.?has|show.?me|explain|check|inspect|describe|summarize)\b/,
      /מה.?יש|הצג|בדוק|הסבר|מה.?עשית|מה.?בנית|תראה.?לי|מה.?המצב/,
    )
  )
    return { intent: "inspect", label: "בודק את הפרויקט", emoji: "🔍" };

  // add feature
  if (
    hasExistingCode &&
    matchesIntent(
      lower,
      /\b(add|include|append|integrate|implement|create.?a.?new|build.?a.?new)\b/,
      /הוסף|תוסיף|הכנס|צרף|שלב|הוסיפ/,
    )
  )
    return { intent: "add_feature", label: "מוסיף פיצ'ר", emoji: "✨" };

  // edit
  if (
    hasExistingCode &&
    matchesIntent(
      lower,
      /\b(change|modify|update|rename|move|adjust|replace|resize|color|font|style|text)\b/,
      /שנה|עדכן|החלף|הזז|תשנה|תעדכן|ישר/,
    )
  )
    return { intent: "edit", label: "עורך קוד קיים", emoji: "✏️" };

  // create / rebuild
  if (
    !hasExistingCode ||
    matchesIntent(
      lower,
      /\b(new|rebuild|start.?over|from.?scratch)\b/,
      /מאפס|בנה.?חדש|בנה.?מחדש/,
    )
  )
    return { intent: "create", label: "בונה פרויקט", emoji: "🏗️" };

  if (hasExistingCode)
    return { intent: "edit", label: "עורך קוד קיים", emoji: "✏️" };

  return { intent: "general", label: "מעדכן פרויקט", emoji: "⚡" };
}

export function getIntentSystemAddition(intent: ChatIntent): string {
  switch (intent) {
    case "fix":
      return `

🔧 INTENT: BUG FIX — SURGICAL PATCH MODE
The user is reporting a bug or broken behavior. Your ONLY job is to find and fix the broken part.
RULES:
• DO NOT rewrite the entire application
• DO NOT change things that work
• DO NOT add unrequested features
• Make a minimal, surgical fix — touch as few lines as possible
• Keep all existing features, styles, and content intact
• For React/multi-file projects: output ONLY the files that change, using FILE: path format
• For HTML projects: output ONLY the changed sections using this EXACT patch format:

<<<REPLACE>>>
[copy the EXACT text from the current code that needs to change — enough context to be unique]
<<<WITH>>>
[the replacement text]
<<<END>>>

Use multiple <<<REPLACE>>>...<<<WITH>>>...<<<END>>> blocks if multiple spots need changing.
Do NOT output the complete HTML file — only the patch blocks.
After the patches, briefly explain in Hebrew: what was broken and exactly what you changed.`;

    case "edit":
      return `

✏️ INTENT: TARGETED EDIT — PATCH MODE
The user wants to change a specific part. CHANGE ONLY what they asked for.
RULES:
• Preserve ALL other code exactly as-is
• Do NOT remove existing features or content
• Do NOT add unrequested things
• For React/multi-file projects: output ONLY the files that change, using FILE: path format
• For HTML projects: output ONLY the changed sections using this EXACT patch format:

<<<REPLACE>>>
[copy the EXACT text from the current code that needs to change — enough context to be unique]
<<<WITH>>>
[the replacement text]
<<<END>>>

Use multiple <<<REPLACE>>>...<<<WITH>>>...<<<END>>> blocks if multiple spots need changing.
Do NOT output the complete HTML file — only the patch blocks.`;

    case "add_feature":
      return `

✨ INTENT: ADD FEATURE
The user wants to add something new to an existing project. Integrate it naturally.
RULES:
• DO NOT remove or change existing features
• DO NOT rebuild from scratch
• Integrate the new feature smoothly into the existing design and code
• Use the same style, colors, and patterns already in the project`;

    case "inspect":
      return `

🔍 INTENT: INSPECT PROJECT STATE
The user wants to understand the current state of their project.
Provide a clear, concise summary of: what the project does, its main features, the tech stack used, and current status.
Do NOT generate new code unless explicitly asked. Just explain what exists.`;

    default:
      return "";
  }
}

export function detectContextualSuggestions(
  generatedCode: string,
  capabilities?: Record<string, boolean>,
): Array<{ type: string; title: string; desc: string; action: string }> {
  const suggestions: Array<{
    type: string;
    title: string;
    desc: string;
    action: string;
  }> = [];
  const code = generatedCode.toLowerCase();

  const hasLocalStorage = code.includes("localstorage");
  const hasFetchApi = code.includes("fetch(") && code.includes("/api");
  const hasIndexedDB = code.includes("indexeddb");
  const hasDb = hasLocalStorage || hasFetchApi || hasIndexedDB;

  if (hasDb && !capabilities?.supabase && !capabilities?.mongodb) {
    suggestions.push({
      type: "database",
      title: "🗄️ הוסף מסד נתונים",
      desc: "הפרויקט שומר נתונים — שדרג לאחסון קבוע ואמיתי",
      action: "open_database",
    });
  }

  const hasApiKey = /apikey|api_key|apiToken|api_token/i.test(generatedCode);
  if (hasApiKey) {
    suggestions.push({
      type: "secrets",
      title: "🔒 שמור מפתחות בבטחה",
      desc: "זוהו API keys בקוד — העבר אותם ל-Secrets",
      action: "open_secrets",
    });
  }

  const hasAuth =
    code.includes("login") ||
    code.includes("signup") ||
    code.includes("password");
  if (
    hasAuth &&
    !capabilities?.auth0 &&
    !capabilities?.clerk &&
    !capabilities?.supabase
  ) {
    suggestions.push({
      type: "auth",
      title: "🔐 הוסף מערכת כניסה",
      desc: "הפרויקט מכיל טפסי login — חבר Supabase Auth או Clerk",
      action: "open_secrets",
    });
  }

  const looksLikeProduct =
    code.includes("pricing") ||
    code.includes("checkout") ||
    code.includes("shop");
  if (looksLikeProduct && suggestions.length === 0) {
    suggestions.push({
      type: "deploy",
      title: "🚀 פרסם את האתר",
      desc: "הפרויקט נראה מוכן — פרסם אותו ברשת עם Netlify",
      action: "open_deploy",
    });
  }

  return suggestions.slice(0, 2);
}

// ── Next-Step Engine ──────────────────────────────────────────────────────────
// Generates ONE smart next-step suggestion after a successful build/edit.
// Purely deterministic — zero extra API latency.
// ─────────────────────────────────────────────────────────────────────────────
const NEXT_STEPS = {
  he: {
    mobile: "שפר את גרסת המובייל",
    animations: "הוסף אנימציות ואפקטי כניסה",
    typography: "שפר את הגופנים והמרווחים",
    colors: "עדכן את פלטת הצבעים",
    content: "שפר את התוכן והכותרות",
    hover: "הוסף אפקטי hover ומיקרו-אנימציות",
    layout: "שפר את הפריסה הוויזואלית",
    dark: "הוסף תמיכה במצב dark",
  },
  en: {
    mobile: "Improve the mobile version",
    animations: "Add entrance animations",
    typography: "Refine typography and spacing",
    colors: "Refine the color palette",
    content: "Improve content and headings",
    hover: "Add hover effects and micro-animations",
    layout: "Polish the visual layout",
    dark: "Add dark mode support",
  },
};

export function detectNextStep(
  userMessage: string,
  generatedCode: string,
  messageCount: number,
  language: "he" | "en",
): string | null {
  const msg = userMessage.toLowerCase();
  const code = generatedCode.toLowerCase();
  const s = NEXT_STEPS[language];

  // Context-aware: what was just done → suggest the natural next thing
  if (/mobile|מובייל/.test(msg)) return s.animations;
  if (/צבע|color|theme/.test(msg)) return s.typography;
  if (/טקסט|text|כותר|title|תוכן|content/.test(msg)) return s.layout;
  if (/form|טופס|שליחה/.test(msg)) return s.mobile;
  if (/animation|אנימציה|transition|hover/.test(msg)) return s.content;
  if (/layout|פריסה|מבנה|structure/.test(msg)) return s.mobile;
  if (/font|גופן|spacing|רווח|typography/.test(msg)) return s.hover;
  if (/dark|כהה/.test(msg)) return s.animations;

  // Code-aware: what's missing from the generated output
  if (!code.includes("@media") && messageCount <= 4) return s.mobile;
  if (
    code.includes("@media") &&
    !code.includes("transition:") &&
    !code.includes("animation:")
  )
    return s.animations;
  if (!code.includes("prefers-color-scheme") && messageCount >= 3)
    return s.dark;

  // Rotating fallback based on session depth
  const fallbacks = [
    s.mobile,
    s.animations,
    s.typography,
    s.hover,
    s.colors,
    s.layout,
  ];
  return fallbacks[messageCount % fallbacks.length];
}
