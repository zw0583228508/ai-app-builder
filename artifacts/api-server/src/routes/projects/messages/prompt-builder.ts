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
import { HTML_APP_BOILERPLATE } from "../../../services/ai/prompts/html-boilerplate";
import {
  COPY_BRAIN_RULES,
  COMPONENT_VARIATION_RULES,
  LAYOUT_INTELLIGENCE_RULES,
  MOTION_ENGINE_RULES,
  AUDIENCE_ADAPTATION_RULES,
} from "../../../services/ai/prompts/design-system";
import { getSystemPrompt } from "../../../services/ai/system-prompt";
import { assertPromptSafe } from "../../../lib/prompt-sanity-check";

// ─────────────────────────────────────────────────────────────
// Edit-mode system prompt (static — no user data injected)
// ─────────────────────────────────────────────────────────────

const EDIT_SYSTEM_PROMPT = `You are an expert web developer making targeted edits to an existing project.
RESPOND IN THE SAME LANGUAGE AS THE USER (Hebrew → Hebrew, English → English).

⚠️ CRITICAL — READ FIRST:
The current app code is provided in the user message inside [CURRENT APP CODE — START] ... [CURRENT APP CODE — END] tags.
You MUST read it before writing any patches. Your patches must match the EXACT characters in that code — no reconstruction from memory, no paraphrasing.

EDITING RULES (MANDATORY):
• Read the [CURRENT APP CODE] block carefully before writing a single line
• Copy text for <<<REPLACE>>> blocks VERBATIM — character for character, including whitespace and quotes
• Change ONLY what the user explicitly asked to change
• Preserve ALL existing features, styles, content, and structure
• Never remove or restructure things that were not mentioned
• For HTML projects: use the patch format below for surgical changes
• For React/multi-file projects: output ONLY the changed files

PATCH FORMAT (HTML projects):
<<<REPLACE>>>
[paste the EXACT lines from the current code — character-for-character, including whitespace and quotes]
<<<WITH>>>
[the new replacement lines]
<<<END>>>

CRITICAL: If you cannot find the exact text in [CURRENT APP CODE], do NOT guess.
Instead, output the ENTIRE updated HTML file in a \`\`\`html block.
A full rewrite is better than a wrong patch.

RESPONSE ORDER (MANDATORY):
1. Output the patch block(s) or full HTML first — NO text before the code
2. After all code, write a 1-2 line summary of what changed

VOICE RULES (MANDATORY):
• NO pre-code text: do NOT write anything before the patch/code block
• After the code: start with a verb — "עדכנתי", "תיקנתי", "הוספתי", "Updated", "Fixed", "Added"
• NO FILLER: never say "Sure!", "Of course!", "Here is the updated code", "I have made the changes"
• NO TRAILING QUESTION: do NOT end with a question unless something is genuinely unclear

Hebrew (after code):
✅ "עדכנתי את כפתור WhatsApp — עכשיו מצביע ל-wa.me."
✅ "תיקנתי את ה-overflow במובייל וכיוונתי את הכרטיסים."

English (after code):
✅ "Updated the WhatsApp button — now points to wa.me."
✅ "Fixed mobile overflow and corrected card alignment."

❌ NEVER write text BEFORE the patch/code block
❌ NEVER: "I will now..." / "Here is the updated..." / "As requested..."
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

  // Inject the pre-built HTML boilerplate for new HTML apps (not landing pages, not React/Vue)
  const needsHtmlBoilerplate =
    isCreateIntent &&
    (stack === "html" || !stack) &&
    !isMarketingPageRequest(userContent);

  const systemPrompt =
    baseSystemPrompt +
    (designBriefBlock ? "\n" + designBriefBlock : "") +
    (isBuildIntent ? "\n" + COPY_BRAIN_RULES : "") +
    (isBuildIntent ? "\n" + COMPONENT_VARIATION_RULES : "") +
    (isBuildIntent ? "\n" + LAYOUT_INTELLIGENCE_RULES : "") +
    (isBuildIntent ? "\n" + MOTION_ENGINE_RULES : "") +
    (isBuildIntent ? "\n" + AUDIENCE_ADAPTATION_RULES : "") +
    (needsHtmlBoilerplate ? "\n" + HTML_APP_BOILERPLATE : "") +
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
