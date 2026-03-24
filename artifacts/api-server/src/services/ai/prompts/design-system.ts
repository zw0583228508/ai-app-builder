/**
 * Design System Prompt Blocks (Phases 3–8 of 15-phase pipeline)
 *
 * These blocks encode:
 *   - Copy Brain rules (Phase 3)
 *   - Brand/color intelligence (Phase 4)
 *   - Layout intelligence (Phase 5)
 *   - Component variation (Phase 6)
 *   - Motion engine (Phase 7)
 *   - Audience adaptation (Phase 8)
 *
 * They are injected into system prompts to elevate generation quality
 * beyond generic output. Each block is self-contained and composable.
 */

// ─────────────────────────────────────────────────────────────
// Copy Brain Rules (Phase 3)
// ─────────────────────────────────────────────────────────────

export const COPY_BRAIN_RULES = `
══════════════════════════════════════════════════════════════
COPY BRAIN — write like a conversion copywriter (MANDATORY)
══════════════════════════════════════════════════════════════
BANNED PHRASES (never use — instantly marks output as generic AI):
✗ "revolutionary" / "game-changing" / "cutting-edge" / "next-level"
✗ "seamless experience" / "innovative solution" / "robust platform"
✗ "Take your business to the next level"
✗ "All-in-one solution" (without specifics)
✗ "Trusted by thousands" (without a number)
✗ "Get Started" as the ONLY CTA (always be more specific)
✗ "Lorem ipsum" or obviously placeholder content
✗ Generic company name "Acme Corp" or "Company Name Here"

HEADLINE RULES:
• State the specific outcome, not the feature: "Ship 10x faster" not "Fast development"
• Use numbers when possible: "Save 3 hours/week" not "Save time"
• Address a real pain or desire directly
• Max 8-10 words for hero headlines
• H2 section headers should describe the VALUE of the section, not just label it:
  ✓ "Everything your team needs to ship" not "Features"
  ✓ "See what customers are saying" not "Testimonials"
  ✓ "Pricing that grows with you" not "Pricing"

CTA RULES — never use bare "Get Started" or "Learn More":
• Primary CTA should describe the action: "Start Building Free", "Book My Demo", "Generate My App"
• Secondary CTA should reduce friction: "See how it works", "View live demo", "Explore features"
• Button text max 4-5 words

BODY COPY RULES:
• Lead with benefit, support with feature
• Write in second person: "you" not "users" or "customers"
• One idea per sentence
• Testimonials: always include name, job title, and company — make them specific and believable
• Numbers: use real-looking specific numbers ("2,847 teams", "99.97% uptime", "4.9/5 from 830 reviews")

SECTION COPY PATTERNS:
• Trust bar: "Trusted by teams at [Real Company], [Real Company], [Real Company]"
• Stat block: use 3 stats with large numbers + one-line context
• FAQ: write questions as users actually ask them, not formal category labels
• Empty states: helpful and action-oriented — never just "No data found"
• Error messages: tell users what happened AND what to do next
`;

// ─────────────────────────────────────────────────────────────
// Component Variation Rules (Phase 6)
// ─────────────────────────────────────────────────────────────

export const COMPONENT_VARIATION_RULES = `
══════════════════════════════════════════════════════════════
COMPONENT INTELLIGENCE — avoid repetitive patterns (MANDATORY)
══════════════════════════════════════════════════════════════
FEATURE SECTIONS — choose based on count and complexity:
• 3 features → large icon-card row, horizontal layout, each with short headline + body
• 4-6 features → 2-column or 3-column grid, alternating accent colors
• 7+ features → tabbed interface or category grouping, not one giant grid
• Key feature → large split section with visual/screenshot on opposite side

HERO VARIATIONS — choose one, do NOT always use centered:
• "Impact" — massive headline (80px+), minimal text, single bold CTA, full-bleed bg
• "Split" — text left, product visual right, equal columns, professional
• "Centered" — logo pill badge, headline, subheadline, 2 CTA buttons, subtle bg pattern
• "Demo" — headline + live/animated product preview below fold

TESTIMONIALS — choose format based on count:
• 1-2 → large quote card with photo avatar, full-width
• 3 → horizontal card row
• 4-6 → 2-column masonry grid
• 7+ → marquee/carousel

PRICING SECTIONS:
• Always 3 tiers: Basic/Free, Pro (highlighted/recommended), Enterprise/Custom
• Highlight the recommended tier with scale(1.05), colored border, badge
• Include monthly/annual toggle when possible
• List 5-7 features per tier, mark key differences clearly

STATS/NUMBERS SECTION:
• Always use large bold numbers (text-5xl+) with a subtle unit color difference
• Provide real-looking context: "2,847 active users" not "3000+"
• Group in sets of 3 or 4 — not 2, not 6

FAQ SECTION:
• Always use accordion (click to expand) — never static list
• 5-7 questions minimum
• Open the first one by default
`;

// ─────────────────────────────────────────────────────────────
// Layout Intelligence (Phase 5)
// ─────────────────────────────────────────────────────────────

export const LAYOUT_INTELLIGENCE_RULES = `
══════════════════════════════════════════════════════════════
LAYOUT INTELLIGENCE — spacing, rhythm, hierarchy (MANDATORY)
══════════════════════════════════════════════════════════════
SECTION RHYTHM — alternate background to create visual breathing:
• Section 1 (hero): gradient or image bg
• Section 2: --bg (light/dark base)
• Section 3: --surface2 (slight tint)
• Repeat alternation — never same bg for 3+ consecutive sections

SPACING HIERARCHY (NEVER compress or random):
• Between sections: 80-120px (padding: 96px 0)
• Within sections (between heading and content): 48px
• Between cards in grid: 24-28px
• Card internal padding: 28-36px
• Button padding: 13px 28px (horizontal > vertical)

CONTENT WIDTH STRATEGY:
• Hero headline: max-width 720px (centered) or 560px (split layout)
• Body text blocks: max-width 640px — never full width
• Card grids: full container width (up to 1180px)
• Full-bleed images/videos: 100vw

VISUAL HIERARCHY RULES:
• Every section needs ONE clear focal point (not competing CTAs)
• Heading → Subheading → Body copy → CTA in strict descending size
• One primary button per section max; secondary CTAs as text links
• Group related items visually (border, bg, proximity) before using headings

PREVENT THESE COMMON MISTAKES:
✗ All caps for body text (kills readability)
✗ Too many competing button colors in one section
✗ Icon + title + body + button in every single card (pick 3 elements)
✗ Less than 64px padding on sections
✗ Right-aligning text in LTR pages without purpose
✗ Putting 6+ nav links at same weight (use visual hierarchy in nav)
`;

// ─────────────────────────────────────────────────────────────
// Motion Engine (Phase 7)
// ─────────────────────────────────────────────────────────────

export const MOTION_ENGINE_RULES = `
══════════════════════════════════════════════════════════════
MOTION ENGINE — premium interaction patterns
══════════════════════════════════════════════════════════════
ALWAYS include these (regardless of motion level):
• Hover states on ALL interactive elements (0.2s ease transition)
• Button: translateY(-1px) + shadow deepen on hover
• Card: translateY(-4px) + shadow intensify on hover
• Links: color transition (0.15s ease)
• Focus states: 2px outline with --primary color for accessibility

SCROLL ANIMATIONS (medium + expressive only):
Use AOS (Animate On Scroll) for scroll reveals:
  <div data-aos="fade-up" data-aos-duration="600" data-aos-delay="100">
Always initialize: AOS.init({ once: true, offset: 80 });
Stagger cards with data-aos-delay="0", "100", "200", "300"

LOADING STATES:
• Buttons in loading state: spinner inside button (replace text, not add next to)
• Skeleton screens for content that loads asynchronously
• Progress bars for multi-step flows

PREMIUM MICRO-INTERACTIONS:
• Accordion FAQ: max-height transition (0.3s ease-in-out), not display:none
• Modal: scale(0.95) → scale(1) + opacity 0→1 on open
• Toast/notification: slide in from right, auto-dismiss after 3s
• Counter numbers: animate from 0 to final value on scroll into view (CountUp.js)

WHAT TO AVOID:
✗ Bounce or elastic easing on business/professional UIs
✗ Animation that delays content visibility by more than 300ms
✗ Loop animations that distract from content (flashing, pulsing)
✗ Different easing functions for similar elements in same section
`;

// ─────────────────────────────────────────────────────────────
// Audience Adaptation (Phase 8)
// ─────────────────────────────────────────────────────────────

export const AUDIENCE_ADAPTATION_RULES = `
══════════════════════════════════════════════════════════════
AUDIENCE ADAPTATION — design for the actual user
══════════════════════════════════════════════════════════════
ENTERPRISE audience:
• More whitespace, calmer colors, stronger structure
• Lead with security, compliance, and reliability signals
• Social proof: logos of recognizable companies, not just numbers
• Copy: precise, proof-based, avoid hype words
• CTA: "Schedule a Demo", "Talk to Sales", "See Enterprise Features"

STARTUP / PRODUCT audience:
• Move fast, show the product quickly (hero → live preview)
• Feature-benefit balance: show HOW as much as WHAT
• Copy: confident, direct, uses product terminology naturally
• CTA: "Start Free", "Try It Now", "Get Your API Key"

CONSUMER audience:
• Emotional language, benefit-first, visual storytelling
• Social proof: review count + star rating prominently
• Simpler vocabulary, shorter sentences
• CTA: action + immediacy — "Shop Now", "Book Today", "Join Free"

CREATOR / CREATIVE audience:
• Stronger visual identity, more personality
• Show examples of output prominently
• Community signals (followers, works created, likes)
• Copy: aspirational, encouraging, authentic
• CTA: "Start Creating", "Show Your Work", "Join the Community"

DEVELOPER audience:
• Show code samples or API examples early
• Technical accuracy matters — be specific about capabilities
• GitHub stars, npm downloads, API docs as trust signals
• CTA: "View Docs", "Install via npm", "Try the API"

FINANCE audience:
• Trust-first — security badges, compliance mentions, bank-grade language
• Restrained design, no bright colors or playful motion
• Data visualizations prominent
• CTA: "Open an Account", "See Our Rates", "Speak with an Advisor"
`;
