/**
 * Design Brain — Pre-generation design decision layer (Phase 1 of 15-phase pipeline)
 *
 * Runs a fast Haiku call before the main code generation to produce a
 * DesignBrief: typed, structured design decisions that are injected into
 * the system prompt. This ensures every generated app has:
 *   - Industry-appropriate color palette (not always indigo)
 *   - Correct page structure for the product type
 *   - Audience-adapted copy tone
 *   - Layout type matched to content strategy
 *   - Motion level appropriate for brand
 *
 * Pipeline position: runs in parallel with architecture/UI agents for complex
 * requests, or standalone for simple create requests. Skipped for edit/fix.
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AI_MODELS } from "../core/AIService";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ProductType =
  | "saas"
  | "marketplace"
  | "ai-tool"
  | "media"
  | "fintech"
  | "edu"
  | "portfolio"
  | "booking"
  | "ecommerce"
  | "dashboard"
  | "game"
  | "tool"
  | "landing-page"
  | "general";

export type VisualStyle =
  | "modern-saas"
  | "luxury-dark"
  | "soft-pastel"
  | "bold-gradient"
  | "enterprise-clean"
  | "fintech-trust"
  | "ai-futuristic"
  | "media-editorial"
  | "creator-bold"
  | "minimal-elegant"
  | "playful-colorful"
  | "tech-dark";

export type AudienceType =
  | "enterprise"
  | "startup"
  | "consumer"
  | "creator"
  | "finance"
  | "developer"
  | "general";

export type ConversionGoal =
  | "signup"
  | "demo"
  | "install"
  | "purchase"
  | "waitlist"
  | "trial"
  | "explore"
  | "contact"
  | "none";

export type LayoutType =
  | "centered-hero"
  | "split-hero"
  | "asymmetric"
  | "minimal"
  | "bento"
  | "fullscreen"
  | "dashboard";

export type MotionLevel = "subtle" | "medium" | "expressive";

export type CopyTone =
  | "premium"
  | "startup-modern"
  | "enterprise-clear"
  | "playful"
  | "technical"
  | "high-conversion"
  | "elegant-minimal";

export interface DesignBrief {
  productType: ProductType;
  visualStyle: VisualStyle;
  audienceType: AudienceType;
  conversionGoal: ConversionGoal;
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  colorText: string;
  colorStyle: "dark" | "light" | "gradient";
  layoutType: LayoutType;
  sectionOrder: string[];
  motionLevel: MotionLevel;
  copyTone: CopyTone;
  headlineDirection: string;
  ctaText: string;
  secondaryCtaText: string;
}

// ─────────────────────────────────────────────────────────────
// Safe fallback
// ─────────────────────────────────────────────────────────────

export const DEFAULT_DESIGN_BRIEF: DesignBrief = {
  productType: "saas",
  visualStyle: "modern-saas",
  audienceType: "startup",
  conversionGoal: "signup",
  colorPrimary: "#6366f1",
  colorAccent: "#a78bfa",
  colorBg: "#f8f8fc",
  colorText: "#0f0f18",
  colorStyle: "light",
  layoutType: "centered-hero",
  sectionOrder: [
    "hero",
    "trust-bar",
    "features",
    "testimonials",
    "pricing",
    "faq",
    "cta",
    "footer",
  ],
  motionLevel: "medium",
  copyTone: "startup-modern",
  headlineDirection: "Focus on the core benefit, be specific and concrete",
  ctaText: "Get Started Free",
  secondaryCtaText: "See How It Works",
};

// ─────────────────────────────────────────────────────────────
// Design Brain system prompt
// ─────────────────────────────────────────────────────────────

const DESIGN_BRAIN_SYSTEM = `You are a world-class product designer and UX strategist. Analyze the app-building request and produce a design decision brief.

Return ONLY valid JSON — no explanation, no markdown, just the JSON object:

{
  "productType": "saas|marketplace|ai-tool|media|fintech|edu|portfolio|booking|ecommerce|dashboard|game|tool|landing-page|general",
  "visualStyle": "modern-saas|luxury-dark|soft-pastel|bold-gradient|enterprise-clean|fintech-trust|ai-futuristic|media-editorial|creator-bold|minimal-elegant|playful-colorful|tech-dark",
  "audienceType": "enterprise|startup|consumer|creator|finance|developer|general",
  "conversionGoal": "signup|demo|install|purchase|waitlist|trial|explore|contact|none",
  "colorPrimary": "#hex — MUST match industry (see rules below)",
  "colorAccent": "#hex — complementary accent",
  "colorBg": "#hex — page background",
  "colorText": "#hex — main text color",
  "colorStyle": "dark|light|gradient",
  "layoutType": "centered-hero|split-hero|asymmetric|minimal|bento|fullscreen|dashboard",
  "sectionOrder": ["section1", "section2", "..."],
  "motionLevel": "subtle|medium|expressive",
  "copyTone": "premium|startup-modern|enterprise-clear|playful|technical|high-conversion|elegant-minimal",
  "headlineDirection": "one sentence about what the headline should emphasize",
  "ctaText": "Specific action-oriented primary CTA (NOT 'Get Started')",
  "secondaryCtaText": "Specific secondary CTA"
}

COLOR SELECTION RULES (mandatory — do NOT default to indigo unless it fits):
- SaaS / productivity: violet #7C3AED or electric blue #3B82F6 or emerald #059669
- AI tools: cyan #06B6D4 or electric violet #8B5CF6 or neon green #10B981
- Fintech / finance: deep blue #1E40AF or navy #1E3A5F or trust-green #15803D
- E-commerce / retail: amber #F59E0B or rose #F43F5E or warm orange #EA580C
- Media / creative / music: hot pink #EC4899 or bold purple #9333EA or electric red #DC2626
- Health / wellness: teal #0D9488 or sage #4D7C0F or warm blue #0284C7
- Education: sky #0EA5E9 or warm indigo #6366F1 or energetic orange #F97316
- Portfolio / personal: sophisticated slate #334155 or gold #B45309 or charcoal #1F2937
- Booking / services: professional blue #2563EB or coral #F97316 or forest #15803D
- Dashboard / internal: slate #475569 with vivid accent
- Game / entertainment: bold gradient — pink to violet or cyan to blue
- Food / restaurant: warm red #DC2626 or amber #D97706 or deep green #166534
- Law / professional services: deep navy #1E3A5F or charcoal #111827 or burgundy #7F1D1D

DARK background rule: use dark bg (#0a0a0f or #0f0f18 or #0d0d1a) only for: luxury, AI-futuristic, tech-dark, media-editorial, game

LAYOUT SELECTION RULES:
- split-hero: SaaS with product screenshot, AI tools, productivity apps
- centered-hero: portfolios, landing pages, bold brands, single-product
- asymmetric: creative agencies, media, music platforms
- bento: dashboards, feature-heavy SaaS, comparison tools
- minimal: portfolios, luxury brands, simple services
- fullscreen: games, immersive experiences, single-CTA pages
- dashboard: admin panels, analytics, internal tools

SECTION ORDER by product type:
- SaaS landing: ["hero", "trust-logos", "problem-solution", "features-grid", "demo-preview", "testimonials", "pricing-tiers", "faq", "final-cta", "footer"]
- AI tool: ["hero", "live-demo-preview", "features-grid", "use-cases", "testimonials", "pricing-tiers", "faq", "footer"]
- E-commerce: ["hero-product", "featured-products", "value-props", "social-proof", "featured-collection", "newsletter-cta", "footer"]
- Portfolio: ["hero-identity", "featured-work", "about-skills", "case-studies", "testimonial", "contact", "footer"]
- Booking: ["hero-cta", "services-cards", "how-it-works", "testimonials", "pricing-simple", "contact-booking", "footer"]
- Dashboard: ["stats-summary", "main-chart", "data-table", "quick-actions", "recent-activity"]
- Media: ["hero-splash", "featured-content", "category-grid", "trending", "newsletter", "footer"]
- Marketplace: ["hero-search", "category-browse", "featured-listings", "how-it-works", "trust-signals", "cta", "footer"]
- Fintech: ["hero-trust", "product-overview", "features", "security-trust", "social-proof", "pricing", "footer"]
- General landing: ["hero", "features", "social-proof", "cta", "footer"]

CTA TEXT RULES (never use generic CTAs):
- SaaS: "Start Free Trial", "Launch My Workspace", "Try It Free Today"
- AI: "Generate My First [Thing]", "Start Building Now", "See It In Action"
- E-commerce: "Shop the Collection", "Explore Products", "Buy Now"
- Booking: "Book My Appointment", "Reserve My Spot", "Schedule a Call"
- Portfolio: "View My Work", "See My Projects", "Explore Case Studies"
- Waitlist: "Join the Waitlist", "Get Early Access", "Reserve My Spot"
- Demo: "Book a Demo", "See a Live Demo", "Watch It Work"

MOTION RULES:
- subtle: finance, law, enterprise, portfolio, luxury
- medium: SaaS, AI tools, education, booking, services
- expressive: media, games, creative, entertainment, playful consumer`;

// ─────────────────────────────────────────────────────────────
// Core function
// ─────────────────────────────────────────────────────────────

export async function buildDesignBrief(
  userMessage: string,
  mode: string,
  stack: string,
): Promise<DesignBrief> {
  try {
    const res = await anthropic.messages.create({
      model: AI_MODELS.haiku,
      max_tokens: 700,
      system: DESIGN_BRAIN_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Mode: ${mode} | Stack: ${stack}\nRequest: ${userMessage.slice(0, 1000)}`,
        },
      ],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return DEFAULT_DESIGN_BRIEF;

    const parsed = JSON.parse(m[0]) as Partial<DesignBrief>;

    return {
      productType: parsed.productType ?? DEFAULT_DESIGN_BRIEF.productType,
      visualStyle: parsed.visualStyle ?? DEFAULT_DESIGN_BRIEF.visualStyle,
      audienceType: parsed.audienceType ?? DEFAULT_DESIGN_BRIEF.audienceType,
      conversionGoal:
        parsed.conversionGoal ?? DEFAULT_DESIGN_BRIEF.conversionGoal,
      colorPrimary:
        parsed.colorPrimary?.match(/^#[0-9a-f]{6}$/i)?.[0] ??
        DEFAULT_DESIGN_BRIEF.colorPrimary,
      colorAccent:
        parsed.colorAccent?.match(/^#[0-9a-f]{6}$/i)?.[0] ??
        DEFAULT_DESIGN_BRIEF.colorAccent,
      colorBg:
        parsed.colorBg?.match(/^#[0-9a-f]{6}$/i)?.[0] ??
        DEFAULT_DESIGN_BRIEF.colorBg,
      colorText:
        parsed.colorText?.match(/^#[0-9a-f]{6}$/i)?.[0] ??
        DEFAULT_DESIGN_BRIEF.colorText,
      colorStyle: parsed.colorStyle ?? DEFAULT_DESIGN_BRIEF.colorStyle,
      layoutType: parsed.layoutType ?? DEFAULT_DESIGN_BRIEF.layoutType,
      sectionOrder:
        Array.isArray(parsed.sectionOrder) && parsed.sectionOrder.length > 0
          ? parsed.sectionOrder
          : DEFAULT_DESIGN_BRIEF.sectionOrder,
      motionLevel: parsed.motionLevel ?? DEFAULT_DESIGN_BRIEF.motionLevel,
      copyTone: parsed.copyTone ?? DEFAULT_DESIGN_BRIEF.copyTone,
      headlineDirection:
        parsed.headlineDirection ?? DEFAULT_DESIGN_BRIEF.headlineDirection,
      ctaText: parsed.ctaText ?? DEFAULT_DESIGN_BRIEF.ctaText,
      secondaryCtaText:
        parsed.secondaryCtaText ?? DEFAULT_DESIGN_BRIEF.secondaryCtaText,
    };
  } catch {
    return DEFAULT_DESIGN_BRIEF;
  }
}

// ─────────────────────────────────────────────────────────────
// Format brief as system prompt injection block
// ─────────────────────────────────────────────────────────────

export function formatDesignBriefForPrompt(brief: DesignBrief): string {
  const isDark = brief.colorStyle === "dark";
  const textColor = isDark ? "#e8e8f0" : brief.colorText;

  return `
══════════════════════════════════════════════════════════════
DESIGN BRIEF — pre-analyzed design decisions (MANDATORY — follow exactly)
══════════════════════════════════════════════════════════════
Product: ${brief.productType} | Audience: ${brief.audienceType} | Goal: ${brief.conversionGoal}
Visual style: ${brief.visualStyle} | Layout: ${brief.layoutType} | Motion: ${brief.motionLevel}

COLOR SYSTEM — override ALL default CSS variables with these exact hex values:
• --primary: ${brief.colorPrimary}
• --primary-dark: ${adjustHexDarkness(brief.colorPrimary, -20)}
• --accent: ${brief.colorAccent}
• --bg: ${brief.colorBg}
• --surface: ${isDark ? adjustHexDarkness(brief.colorBg, 8) : "#ffffff"}
• --surface2: ${isDark ? adjustHexDarkness(brief.colorBg, 15) : "#f5f5fa"}
• --text: ${textColor}
• --text-muted: ${isDark ? "rgba(232,232,240,0.6)" : "rgba(15,15,24,0.55)"}
• --border: ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}
${isDark ? `• Body background: ${brief.colorBg} (dark theme — do NOT use light backgrounds)` : ""}

LAYOUT: ${getLayoutInstruction(brief.layoutType)}

PAGE SECTIONS — build in this exact order:
${brief.sectionOrder.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}

COPY DIRECTION:
• Tone: ${getCopyToneInstruction(brief.copyTone)}
• Headline: ${brief.headlineDirection}
• Primary CTA: "${brief.ctaText}"
• Secondary CTA: "${brief.secondaryCtaText}"
• Avoid ALL generic phrases: "revolutionary", "seamless", "innovative", "cutting-edge", "next-level"
• Write benefit-first, outcome-focused copy with specific language

MOTION: ${getMotionInstruction(brief.motionLevel)}
`;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function adjustHexDarkness(hex: string, amount: number): string {
  try {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch {
    return hex;
  }
}

function getLayoutInstruction(layout: LayoutType): string {
  const map: Record<LayoutType, string> = {
    "centered-hero":
      "Centered layout — headline + subheadline + CTA centered, max-width 760px for text",
    "split-hero":
      "Split hero — text block left 50%, product visual/screenshot right 50%, equal height",
    asymmetric:
      "Asymmetric — dominant visual (60-70%) with text overlay or offset. Break the grid intentionally",
    minimal:
      "Minimal — generous whitespace, type-led, max 2 elements per section, zero visual noise",
    bento:
      "Bento grid — CSS grid with varied card sizes (2x1, 1x2, 1x1), each card = one key benefit",
    fullscreen:
      "Fullscreen sections — each section fills 100vh, strong visual anchor, single CTA per screen",
    dashboard:
      "Dashboard — sidebar nav, header with user info, main content area with cards and charts",
  };
  return map[layout] ?? map["centered-hero"];
}

function getCopyToneInstruction(tone: CopyTone): string {
  const map: Record<CopyTone, string> = {
    premium:
      "Premium — restrained, confident, no exclamation marks, sophisticated vocabulary",
    "startup-modern":
      "Startup-modern — conversational, direct, benefit-first, casual confidence",
    "enterprise-clear":
      "Enterprise-clear — precise, trustworthy, jargon-appropriate, proof-based",
    playful:
      "Playful — warm, enthusiastic, human, uses light humor, accessible language",
    technical:
      "Technical — accurate, detailed, respects the reader's intelligence, specific",
    "high-conversion":
      "High-conversion — urgency-aware, specific benefits, social proof anchored, action-forward",
    "elegant-minimal":
      "Elegant-minimal — fewer words, more weight. Every word earns its place",
  };
  return map[tone] ?? map["startup-modern"];
}

function getMotionInstruction(motion: MotionLevel): string {
  const map: Record<MotionLevel, string> = {
    subtle:
      "Subtle — only hover transitions (0.2s ease) and opacity fades. No scroll animations. Calm and professional.",
    medium:
      "Medium — AOS scroll reveals (fade-up, data-aos-duration='600'), hover transforms, button press feedback. Polished but not distracting.",
    expressive:
      "Expressive — GSAP entrance animations, parallax scrolling, staggered card reveals, hero particle/gradient animation, active micro-interactions on all elements.",
  };
  return map[motion] ?? map["medium"];
}
