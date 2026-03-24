import { eq } from "drizzle-orm";
import { db, projectDnaTable, userDnaTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";

export async function getProjectDNA(
  projectId: number,
): Promise<typeof projectDnaTable.$inferSelect | null> {
  try {
    const rows = await db
      .select()
      .from(projectDnaTable)
      .where(eq(projectDnaTable.projectId, projectId))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── Phase 6: map stored values to clear AI-actionable labels ──────────────────
function productTypeLabel(businessModel: string | null | undefined): string {
  if (!businessModel) return "";
  const m = businessModel.toLowerCase();
  if (m.includes("saas")) return "SaaS web application";
  if (m.includes("ecommerce") || m.includes("shop") || m.includes("store"))
    return "e-commerce store";
  if (m.includes("lead") || m.includes("landing"))
    return "lead-gen landing page";
  if (m.includes("portfolio")) return "portfolio site";
  if (m.includes("blog")) return "blog / content site";
  if (m.includes("service") || m.includes("agency"))
    return "service / agency site";
  return businessModel;
}

function designLabel(visualStyle: string | null | undefined): string {
  if (!visualStyle) return "";
  const v = visualStyle.toLowerCase();
  if (v.includes("minimal") || v === "minimal")
    return "minimal — clean whitespace, subtle borders, muted palette";
  if (v.includes("dark"))
    return "dark theme — deep backgrounds, glowing accents, contrast-first";
  if (v.includes("colorful") || v.includes("vibrant"))
    return "bold & colorful — saturated palette, high energy";
  if (v.includes("retro"))
    return "retro / nostalgic — warm tones, textured surfaces";
  if (v.includes("glass") || v.includes("blur"))
    return "glassmorphism — frosted glass panels, backdrop blur";
  if (v.includes("weird") || v.includes("experi"))
    return "experimental — unexpected layouts, creative type";
  return visualStyle;
}

export function buildDNAContext(
  dna: typeof projectDnaTable.$inferSelect | null,
  mode: string,
): string {
  if (!dna) return "";

  // ── Maker mode: creative profile ─────────────────────────────────────────
  if (mode === "maker") {
    const interests = Array.isArray(dna.interests)
      ? (dna.interests as string[]).join(", ")
      : "";
    const techCuriosity = Array.isArray(dna.techCuriosity)
      ? (dna.techCuriosity as string[]).join(", ")
      : "";
    if (!interests && !techCuriosity && !dna.projectVibe && !dna.visualStyle)
      return "";

    const designDesc = designLabel(dna.visualStyle);
    return `
══════════════════════════════════════════════════════════════
🎨 MAKER PROFILE — Apply these in every response
══════════════════════════════════════════════════════════════
${dna.projectVibe ? `Project vibe: ${dna.projectVibe}` : ""}
${designDesc ? `Visual direction: ${designDesc}` : ""}
${interests ? `Creator interests: ${interests}` : ""}
${techCuriosity ? `Tech curiosity: ${techCuriosity}` : ""}
CONTINUITY RULES:
• Match the established vibe/aesthetic — never drift to a different style
• Reference earlier creative decisions explicitly, don't start from scratch
• Suggestions must feel personal and contextual to this creator's taste
• If they say "make it cooler" — escalate within their established aesthetic
• Reuse color palette, motion style, and interaction patterns from prior code
`;
  }

  // ── Developer mode: technical-first context ───────────────────────────────
  if (mode === "developer") {
    const techParts: string[] = [];
    if (dna.visualStyle)
      techParts.push(`UI aesthetic: ${designLabel(dna.visualStyle)}`);
    if (dna.businessModel)
      techParts.push(`Domain context: ${productTypeLabel(dna.businessModel)}`);
    if (dna.targetAudience) techParts.push(`End users: ${dna.targetAudience}`);
    if (dna.primaryGoal)
      techParts.push(`Key feature / main conversion: ${dna.primaryGoal}`);
    const colors = dna.brandColors
      ? typeof dna.brandColors === "object"
        ? Object.entries(dna.brandColors as Record<string, string>)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : ""
      : "";
    if (colors) techParts.push(`Brand colors (use in code): ${colors}`);
    if (techParts.length === 0) return "";
    return `
══════════════════════════════════════════════════════════════
🔬 PROJECT CONTEXT — Technical reference for every response
══════════════════════════════════════════════════════════════
${techParts.join("\n")}
CONTINUITY RULES:
• Preserve architecture decisions already in the codebase — don't rearchitect unless asked
• Maintain established naming conventions, file structure, and patterns
• UI aesthetic is established — new components must match it
• Performance and accessibility decisions must be consistent across files
`;
  }

  // ── Business modes (entrepreneur / builder): product + brand context ──────
  const hasAny =
    dna.businessModel ||
    dna.targetAudience ||
    dna.primaryGoal ||
    dna.brandTone ||
    dna.visualStyle;
  if (!hasAny) return "";

  const tone = Array.isArray(dna.brandTone)
    ? (dna.brandTone as string[]).join(", ")
    : typeof dna.brandTone === "string"
      ? dna.brandTone
      : "";
  const colors = dna.brandColors
    ? typeof dna.brandColors === "object"
      ? Object.entries(dna.brandColors as Record<string, string>)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : JSON.stringify(dna.brandColors)
    : "";
  const productType = productTypeLabel(dna.businessModel);
  const designDesc = designLabel(dna.visualStyle);

  return `
══════════════════════════════════════════════════════════════
🧠 PROJECT MEMORY — Carry this in EVERY response, no exceptions
══════════════════════════════════════════════════════════════
${productType ? `Product type: ${productType}` : ""}
${dna.targetAudience ? `Target audience: ${dna.targetAudience}` : ""}
${dna.primaryGoal ? `Primary goal / main CTA: ${dna.primaryGoal}` : ""}
${tone ? `Brand voice: ${tone}` : ""}
${designDesc ? `Design direction: ${designDesc} — apply this to ALL sections` : ""}
${colors ? `Brand colors: ${colors} — use these, not generic palette` : ""}
CONTINUITY RULES (strictly enforced):
• Never ask questions that this memory already answers
• Apply brand voice and design direction automatically — no exceptions
• All edits must respect the established product type and audience
• Color palette is locked — always use brand colors for new sections
• If user says "same style" or "like before" — this block defines exactly what that means
• Never introduce generic placeholder content — everything must fit the established brand
`;
}

export function buildUserDNAContext(
  dna: typeof userDnaTable.$inferSelect | null,
): string {
  if (!dna) return "";
  const parts: string[] = [];
  if (dna.skillLevel && dna.skillLevel !== "beginner")
    parts.push(`Developer skill level: ${dna.skillLevel}`);
  if (dna.preferredStack) parts.push(`Preferred stack: ${dna.preferredStack}`);
  if (dna.uiStyle) parts.push(`UI style preference: ${dna.uiStyle}`);
  if (dna.deployPreference)
    parts.push(`Deploy preference: ${dna.deployPreference}`);
  if (
    Array.isArray(dna.industryFocus) &&
    (dna.industryFocus as string[]).length > 0
  )
    parts.push(`Industry focus: ${(dna.industryFocus as string[]).join(", ")}`);
  if (
    Array.isArray(dna.businessGoals) &&
    (dna.businessGoals as string[]).length > 0
  )
    parts.push(
      `Business goals: ${(dna.businessGoals as string[]).slice(0, 3).join("; ")}`,
    );
  if (Array.isArray(dna.frameworks) && (dna.frameworks as string[]).length > 0)
    parts.push(`Known frameworks: ${(dna.frameworks as string[]).join(", ")}`);
  if (parts.length === 0) return "";
  return `
══════════════════════════════════════════════════════════════
🧬 USER DNA — Persistent preferences for this developer
══════════════════════════════════════════════════════════════
${parts.join("\n")}
Apply these preferences consistently. Adapt code style, UI choices, and explanations to match.
`;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 500,
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * 2 ** i));
    }
  }
  throw new Error("withRetry: unreachable");
}

// ── Phase 5: Smart extraction gate ────────────────────────────────────────────
// Returns true when the exchange is substantive enough to extract from.
// Skips short/trivial exchanges that carry no meaningful decisions.
export function shouldExtractMemory(
  userMessage: string,
  aiResponse: string,
  intent?: string,
): boolean {
  // Never extract from pure inspection (no decisions made)
  if (intent === "inspect") return false;
  // Skip if AI response is too short to contain real information
  if (aiResponse.length < 300) return false;
  // Skip if the user message is a trivial fix request (<30 chars)
  if (userMessage.trim().length < 30 && intent === "fix") return false;
  return true;
}

export async function extractAndSaveDNA(
  projectId: number,
  userMessage: string,
  aiResponse: string,
  mode: string,
  intent?: string,
): Promise<void> {
  try {
    // Phase 5: gate — skip trivial exchanges
    if (!shouldExtractMemory(userMessage, aiResponse, intent)) return;

    const isMaker = mode === "maker";
    const systemPrompt = isMaker
      ? `Extract creative profile from this conversation. Return ONLY valid JSON:
{
  "projectVibe": "fun|useful|creative|learning|experimental",
  "interests": ["array", "of", "topics"],
  "techCuriosity": ["array", "of", "technologies"],
  "visualStyle": "minimal|colorful|dark|retro|glassmorphism|experimental"
}`
      : `Extract business context from this conversation. Return ONLY valid JSON.
For visualStyle, capture the specific design aesthetic: one of "minimal", "dark", "colorful", "glassmorphism", "retro", "bold", "clean".
For businessModel, use: "SaaS|eCommerce|Lead Gen|Portfolio|Blog|Service|Other".
{
  "businessModel": "SaaS|eCommerce|Lead Gen|Portfolio|Blog|Service|Other or null",
  "targetAudience": "specific short description (e.g. 'Israeli SMB owners', 'fitness enthusiasts') or null",
  "primaryGoal": "the main CTA or conversion goal (e.g. 'book a demo', 'purchase product') or null",
  "brandTone": ["professional", "warm", "playful", "bold", "minimal", "luxury"] — pick 1-3 that fit,
  "visualStyle": "minimal|dark|colorful|glassmorphism|retro|bold|clean or null",
  "brandColors": {"primary": "#hex", "accent": "#hex"} or null
}`;

    const extraction = await withRetry(() =>
      anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `User: ${userMessage.slice(0, 800)}\n\nAI: ${aiResponse.slice(0, 800)}`,
          },
        ],
      }),
    );

    const raw =
      extraction.content[0].type === "text"
        ? extraction.content[0].text.trim()
        : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;
    let extracted: Record<string, string | null | undefined>;
    try {
      extracted = JSON.parse(jsonMatch[0]) as Record<
        string,
        string | null | undefined
      >;
    } catch {
      return;
    }

    const upsertValues = isMaker
      ? {
          projectId,
          projectVibe: extracted.projectVibe ?? null,
          interests: extracted.interests ?? null,
          techCuriosity: extracted.techCuriosity ?? null,
          visualStyle: extracted.visualStyle ?? null,
          updatedAt: new Date(),
        }
      : {
          projectId,
          businessModel: extracted.businessModel ?? null,
          targetAudience: extracted.targetAudience ?? null,
          primaryGoal: extracted.primaryGoal ?? null,
          brandTone: extracted.brandTone ?? null,
          brandColors: extracted.brandColors ?? null,
          visualStyle: extracted.visualStyle ?? null,
          updatedAt: new Date(),
        };

    await db
      .insert(projectDnaTable)
      .values(upsertValues as typeof projectDnaTable.$inferInsert)
      .onConflictDoUpdate({
        target: projectDnaTable.projectId,
        set: upsertValues as Partial<typeof projectDnaTable.$inferInsert>,
      });
  } catch {
    /* non-critical — never block the main flow */
  }
}

export interface MemoryChunk {
  content: string;
  keywords: string[];
  importance: number;
  createdAt: string;
}

// ── Phase 5: Simple string similarity (word overlap ratio) ────────────────────
function chunkSimilarity(a: string, b: string): number {
  const wordsA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
  const wordsB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

const MAX_CHUNKS = 30;
const SIMILARITY_THRESHOLD = 0.65; // chunks >65% similar are considered duplicates

export async function extractAndSaveMemoryChunks(
  projectId: number,
  userMessage: string,
  aiResponse: string,
  existingChunks: MemoryChunk[],
  intent?: string,
): Promise<void> {
  try {
    // Phase 5: gate — skip trivial exchanges
    if (!shouldExtractMemory(userMessage, aiResponse, intent)) return;

    const prompt = `Extract the key technical decisions and design choices made in this exchange. Return ONLY a JSON object:
{
  "chunk": "one sentence describing the key decision or design choice made",
  "keywords": ["array", "of", "3-5", "keywords"],
  "importance": 1-10
}
If no meaningful decision was made, return {"chunk": null}.`;

    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: prompt,
      messages: [
        {
          role: "user",
          content: `User: ${userMessage.slice(0, 500)}\nAI: ${aiResponse.slice(0, 500)}`,
        },
      ],
    });

    const raw =
      res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;
    let parsed: { chunk?: string; keywords?: string[]; importance?: number };
    try {
      parsed = JSON.parse(jsonMatch[0]) as {
        chunk?: string;
        keywords?: string[];
        importance?: number;
      };
    } catch {
      return;
    }
    if (!parsed.chunk) return;

    const newImportance = parsed.importance ?? 5;

    // Phase 5: deduplication — skip if too similar to an existing chunk
    const isDuplicate = existingChunks.some(
      (c) => chunkSimilarity(c.content, parsed.chunk!) > SIMILARITY_THRESHOLD,
    );
    if (isDuplicate) return;

    // Phase 5: importance-based eviction — if at cap, only add if important enough
    if (
      existingChunks.length >= MAX_CHUNKS &&
      newImportance <= Math.min(...existingChunks.map((c) => c.importance))
    ) {
      return;
    }

    const newChunk: MemoryChunk = {
      content: parsed.chunk,
      keywords: parsed.keywords ?? [],
      importance: newImportance,
      createdAt: new Date().toISOString(),
    };

    // Add, then trim to cap by importance (drop lowest-importance chunks first)
    const updated = [...existingChunks, newChunk]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, MAX_CHUNKS);

    await db
      .insert(projectDnaTable)
      .values({
        projectId,
        memoryChunks: updated as unknown as Record<string, unknown>[],
      })
      .onConflictDoUpdate({
        target: projectDnaTable.projectId,
        set: {
          memoryChunks: updated as unknown as Record<string, unknown>[],
          updatedAt: new Date(),
        },
      });
  } catch {
    /* non-critical */
  }
}

// ── Phase 5: Recency-weighted chunk scoring ────────────────────────────────────
// Combines keyword relevance + base importance + recency decay.
// Chunks < 24 h old: full score. Chunks > 7 days old: 50 % penalty.
function recencyFactor(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / 86_400_000;
  if (ageDays < 1) return 1.0;
  if (ageDays < 3) return 0.9;
  if (ageDays < 7) return 0.75;
  return 0.5;
}

export function scoreMemoryChunks(
  chunks: MemoryChunk[],
  userMessage: string,
): MemoryChunk[] {
  const lowerMsg = userMessage.toLowerCase();
  return chunks
    .map((chunk) => {
      const kwScore = chunk.keywords.filter((kw) =>
        lowerMsg.includes(kw.toLowerCase()),
      ).length;
      const decay = recencyFactor(chunk.createdAt);
      const score = (kwScore * 3 + chunk.importance) * decay;
      return { ...chunk, _score: score };
    })
    .sort(
      (a, b) =>
        (b as MemoryChunk & { _score: number })._score -
        (a as MemoryChunk & { _score: number })._score,
    )
    .slice(0, 5);
}

export function buildMemoryChunkContext(chunks: MemoryChunk[]): string {
  if (chunks.length === 0) return "";
  return `\n══════════════════════════════════════════════════════════════
🗃️ RELEVANT PAST DECISIONS — Never repeat these, stay consistent
══════════════════════════════════════════════════════════════
${chunks.map((c) => `• ${c.content}`).join("\n")}\n`;
}
