/**
 * prompt-builder.ts — System prompt assembly for AI generation
 *
 * Extracted from ai-generation.ts (CODE-01 refactor).
 * Centralises all prompt construction logic so that ai-generation.ts
 * stays focused on streaming/IO orchestration.
 */

import type { DetectedIntent } from "../../../services/ai/intent";
import { getIntentSystemAddition } from "../../../services/ai/intent";
import {
  LANDING_PAGE_DESIGN_RULES,
  isMarketingPageRequest,
} from "../../../services/ai/prompts/index";
import {
  COPY_BRAIN_RULES,
  COMPONENT_VARIATION_RULES,
  LAYOUT_INTELLIGENCE_RULES,
  MOTION_ENGINE_RULES,
} from "../../../services/ai/prompts/design-system";
import { getSystemPrompt } from "../../../services/ai/system-prompt";
import { assertPromptSafe } from "../../../lib/prompt-sanity-check";

// ─────────────────────────────────────────────────────────────
// Edit-mode system prompt (static — no user data injected)
// ─────────────────────────────────────────────────────────────

const EDIT_SYSTEM_PROMPT = `You are an expert web developer making targeted edits to an existing project.
RESPOND IN THE SAME LANGUAGE AS THE USER (Hebrew → Hebrew, English → English).

EDITING RULES (MANDATORY):
• Read the [CURRENT APP CODE] carefully before touching anything
• Change ONLY what the user explicitly asked to change
• Preserve ALL existing features, styles, content, and structure
• Never remove or restructure things that were not mentioned
• For HTML projects: use the patch format (<<<REPLACE>>>...<<<WITH>>>...<<<END>>>) for surgical changes
• For React/multi-file projects: output ONLY the changed files

VOICE RULES (MANDATORY — no exceptions):
• NO FILLER: never say "Sure!", "Of course!", "Great!", "As requested", "Here is the updated code", "I have made the changes", "I will now"
• NO PREAMBLE: never restate what the user asked or describe what you're about to do
• NO TRAILING QUESTION: do NOT end with a question unless something is genuinely unclear
• FIRST WORD: always a verb — "עדכנתי", "תיקנתי", "הוספתי", "Updated", "Fixed", "Added"

RESPONSE FORMAT — BEFORE the code (1-2 lines max):
[VERB] + [WHAT changed] + [WHERE if not obvious]

Hebrew:
✅ "עדכנתי את הכותרת הראשית — גופן גדול יותר, מרווח הדוק."
✅ "תיקנתי את ה-overflow במובייל וכיוונתי את הכרטיסים."
✅ "הוספתי טופס יצירת קשר עם ולידציה ואישור שליחה."
✅ "שינתי את צבע הרקע ועדכנתי את הפלטה לאורך כל הדף."

English:
✅ "Updated the hero headline — larger font, tighter tracking."
✅ "Fixed mobile overflow and corrected card alignment."
✅ "Added contact form with validation and success state."

❌ NEVER: "I will now..." / "Here is the updated..." / "As requested..." / "I've made the changes you asked for"
❌ NEVER end with "What else would you like to change?" or any variant`;

// ─────────────────────────────────────────────────────────────
// Public interface
// ─────────────────────────────────────────────────────────────

export interface PromptBuildArgs {
  currentMode: string;
  capabilities: Record<string, boolean>;
  projectType: string | null | undefined;
  stack: string;
  detectedIntent: DetectedIntent;
  userContent: string;
  designBriefBlock: string;
  userDnaContext: string;
  dnaContext: string;
  memoryChunkContext: string;
  agentContext: string;
  userLang?: string;
}

/**
 * Assemble the full system prompt for a Claude generation request.
 * Calls assertPromptSafe before returning — throws if credentials detected.
 */
export function buildSystemPrompt(args: PromptBuildArgs): string {
  const {
    currentMode,
    capabilities,
    projectType,
    stack,
    detectedIntent,
    userContent,
    designBriefBlock,
    userDnaContext,
    dnaContext,
    memoryChunkContext,
    agentContext,
    userLang,
  } = args;

  const isEditOrFix =
    detectedIntent.intent === "edit" || detectedIntent.intent === "fix";
  const isCreateIntent = detectedIntent.intent === "create";
  const isBuildIntent =
    isCreateIntent || detectedIntent.intent === "add_feature";

  const baseSystemPrompt = isEditOrFix
    ? EDIT_SYSTEM_PROMPT
    : getSystemPrompt(
        currentMode,
        capabilities,
        projectType ?? undefined,
        stack,
        detectedIntent.intent,
        userLang,
      );

  const needsLandingPageFallback =
    !isEditOrFix &&
    !isCreateIntent &&
    isBuildIntent &&
    isMarketingPageRequest(userContent) &&
    stack === "html";

  const systemPrompt =
    baseSystemPrompt +
    (designBriefBlock ? "\n" + designBriefBlock : "") +
    (isBuildIntent ? "\n" + COPY_BRAIN_RULES : "") +
    (isBuildIntent ? "\n" + COMPONENT_VARIATION_RULES : "") +
    (isBuildIntent ? "\n" + LAYOUT_INTELLIGENCE_RULES : "") +
    (isBuildIntent ? "\n" + MOTION_ENGINE_RULES : "") +
    (needsLandingPageFallback ? "\n" + LANDING_PAGE_DESIGN_RULES : "") +
    (!isEditOrFix && userDnaContext ? "\n" + userDnaContext : "") +
    (!isEditOrFix && dnaContext ? "\n" + dnaContext : "") +
    (!isEditOrFix ? memoryChunkContext : "") +
    agentContext +
    getIntentSystemAddition(detectedIntent.intent);

  assertPromptSafe(systemPrompt);
  return systemPrompt;
}

/** Helper — derive intent flags used across the pipeline. */
export function deriveIntentFlags(intent: DetectedIntent["intent"]): {
  isEditOrFix: boolean;
  isCreateIntent: boolean;
  isBuildIntent: boolean;
} {
  const isEditOrFix = intent === "edit" || intent === "fix";
  const isCreateIntent = intent === "create";
  const isBuildIntent = isCreateIntent || intent === "add_feature";
  return { isEditOrFix, isCreateIntent, isBuildIntent };
}
