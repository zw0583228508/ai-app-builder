/**
 * System Prompt Builder
 *
 * SECURITY INVARIANT (must never be violated):
 *   This module accepts ONLY boolean capability flags — never raw credentials,
 *   API keys, tokens, URIs, or secrets of any kind.
 *
 *   Valid input:  capabilities = { supabase: true, stripe: true, openai: false }
 *   Invalid input: integrations = { supabaseUrl: "https://...", supabaseAnonKey: "eyJ..." }
 *
 * If credentials appear in a prompt produced here, it is a critical security bug.
 */
import {
  HEBREW_LANGUAGE_INSTRUCTION,
  ENTREPRENEUR_SYSTEM_PROMPT,
  BUILDER_SYSTEM_PROMPT,
  DEVELOPER_SYSTEM_PROMPT,
  MAKER_SYSTEM_PROMPT,
  REACT_STACK_RULES,
  VUE_STACK_RULES,
  SVELTE_STACK_RULES,
  DJANGO_STACK_RULES,
  SHARED_LIBRARIES,
} from "./prompts/index";

// Intents that don't create new code — no need for CDN library list.
const SKIP_LIBRARIES_INTENTS = new Set(["fix", "edit", "inspect"]);

/**
 * Build the capability block injected into the system prompt.
 *
 * Only capability names and usage patterns are included — NEVER actual credential values.
 * The AI model receives enough context to know which services are available
 * and how to call them safely, without ever having access to actual secrets.
 */
function buildCapabilityBlock(capabilities: Record<string, boolean>): string {
  const parts: string[] = [];

  if (capabilities.supabase) {
    parts.push(`
══════════════════════════════════════════════════════════════
SUPABASE IS CONNECTED — DATABASE, AUTH, AND STORAGE AVAILABLE
══════════════════════════════════════════════════════════════
The user has Supabase connected through the secure backend adapter.
When building features that need data persistence, authentication, or file storage,
use Supabase — do NOT use localStorage as a database replacement.

USAGE PATTERN (credentials are injected server-side, never hardcode them):
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// Initialize using server-provided config (never hardcode URL or key in generated code)
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // variables provided at runtime

SUPABASE PATTERNS:
• Auth: sb.auth.signInWithOAuth({ provider: 'google' }) or sb.auth.signInWithPassword({email, password})
• Read: const { data } = await sb.from('table_name').select('*')
• Insert: await sb.from('table_name').insert({ field: value })
• Update: await sb.from('table_name').update({ field: value }).eq('id', id)
• Real-time: sb.channel('room').on('postgres_changes', ...).subscribe()
• Storage: sb.storage.from('bucket').upload('path', file)

IMPORTANT: Tell the user to configure RLS policies in the Supabase Dashboard.
Generate placeholder variable names (SUPABASE_URL, SUPABASE_ANON_KEY) — the user will fill them in.
`);
  }

  if (capabilities.openai) {
    parts.push(`
══════════════════════════════════════════════════════════════
OPENAI IS CONNECTED — AI FEATURES AVAILABLE
══════════════════════════════════════════════════════════════
The user has OpenAI connected through the secure backend adapter.
Build AI features using a server-side proxy — NEVER embed API keys in generated frontend code.

PATTERN: Generate a /api/chat proxy endpoint in the app. The frontend calls the proxy.
The proxy calls OpenAI using environment variables on the server side.
Example generated backend (Node/Express):
app.post('/api/chat', async (req, res) => {
  // Uses process.env.OPENAI_API_KEY — never hardcoded
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${process.env.OPENAI_API_KEY}\` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: req.body.messages, max_tokens: 1000 })
  });
  res.json(await response.json());
});
`);
  }

  if (capabilities.anthropic) {
    parts.push(`
══════════════════════════════════════════════════════════════
ANTHROPIC (CLAUDE) IS CONNECTED — AI FEATURES AVAILABLE
══════════════════════════════════════════════════════════════
The user has Anthropic Claude connected through the secure backend adapter.
Use a server-side proxy pattern — NEVER embed API keys in frontend code.

Example server-side proxy:
app.post('/api/claude', async (req, res) => {
  // Uses process.env.ANTHROPIC_API_KEY — never hardcoded
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1024, messages: req.body.messages })
  });
  res.json(await response.json());
});
`);
  }

  if (capabilities.groq) {
    parts.push(`
══════════════════════════════════════════════════════════════
GROQ IS CONNECTED — ULTRA-FAST AI INFERENCE AVAILABLE
══════════════════════════════════════════════════════════════
The user has Groq connected through the secure backend adapter.
Use a server-side proxy. Groq is OpenAI-compatible — same API shape.
NEVER embed the API key in generated frontend code.
`);
  }

  if (capabilities.firebase) {
    parts.push(`
══════════════════════════════════════════════════════════════
FIREBASE IS CONNECTED — DATABASE, AUTH, AND STORAGE AVAILABLE
══════════════════════════════════════════════════════════════
The user has Firebase connected through the secure backend adapter.
Generate code using Firebase SDK with placeholder config variables.
Tell the user to replace config values from their Firebase console.

PATTERN:
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
const app = firebase.initializeApp({ apiKey: FIREBASE_API_KEY, projectId: FIREBASE_PROJECT_ID });
const db = firebase.firestore();
const auth = firebase.auth();
`);
  }

  if (capabilities.mongodb) {
    parts.push(`
══════════════════════════════════════════════════════════════
MONGODB IS CONNECTED — NOSQL DATABASE AVAILABLE
══════════════════════════════════════════════════════════════
The user has MongoDB connected through the secure backend adapter.
MongoDB REQUIRES server-side code — never use the connection string in frontend code.
Build an Express/Node.js API layer with a /api/* proxy pattern.
Use process.env.MONGODB_URI on the server — never hardcode connection strings.
`);
  }

  if (capabilities.upstash) {
    parts.push(`
══════════════════════════════════════════════════════════════
UPSTASH REDIS IS CONNECTED — CACHING AND RATE LIMITING AVAILABLE
══════════════════════════════════════════════════════════════
The user has Upstash Redis connected through the secure backend adapter.
Use a server-side proxy for Redis operations. Never expose Redis credentials in frontend code.
`);
  }

  if (capabilities.stripe) {
    parts.push(`
══════════════════════════════════════════════════════════════
STRIPE IS CONNECTED — PAYMENTS AVAILABLE
══════════════════════════════════════════════════════════════
The user has Stripe connected through the secure backend adapter.
Use Stripe.js (publishable key only in frontend) + server-side endpoints for payment sessions.
NEVER embed the Stripe secret key in frontend code.

PATTERN:
<script src="https://js.stripe.com/v3/"></script>
// Frontend uses publishable key only — secret key stays server-side
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY); // variable provided by user
// Checkout flow requires server-side session creation endpoint
`);
  }

  if (capabilities.paypal) {
    parts.push(`
══════════════════════════════════════════════════════════════
PAYPAL IS CONNECTED — PAYMENTS AVAILABLE
══════════════════════════════════════════════════════════════
The user has PayPal connected through the secure backend adapter.
Use the PayPal SDK with a client-id placeholder variable.
The user will provide their PayPal client ID.
`);
  }

  if (capabilities.auth0) {
    parts.push(`
══════════════════════════════════════════════════════════════
AUTH0 IS CONNECTED — AUTHENTICATION AVAILABLE
══════════════════════════════════════════════════════════════
The user has Auth0 connected through the secure backend adapter.
Generate code with placeholder variables for Auth0 domain and client ID.
The user will fill in the actual values from their Auth0 dashboard.

PATTERN:
<script src="https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js"></script>
const auth0Client = await auth0.createAuth0Client({ domain: AUTH0_DOMAIN, clientId: AUTH0_CLIENT_ID, authorizationParams: { redirect_uri: window.location.origin } });
`);
  }

  if (capabilities.clerk) {
    parts.push(`
══════════════════════════════════════════════════════════════
CLERK IS CONNECTED — AUTHENTICATION AVAILABLE
══════════════════════════════════════════════════════════════
The user has Clerk connected through the secure backend adapter.
Use Clerk publishable key (safe for frontend) with a placeholder variable.
NEVER use the Clerk secret key in frontend code.
`);
  }

  if (capabilities.cloudinary) {
    parts.push(`
══════════════════════════════════════════════════════════════
CLOUDINARY IS CONNECTED — IMAGE AND VIDEO UPLOADS AVAILABLE
══════════════════════════════════════════════════════════════
The user has Cloudinary connected through the secure backend adapter.
Use unsigned upload presets for frontend uploads — never embed API Secret in frontend code.
Generate code with placeholder variable for cloud name.
`);
  }

  if (capabilities.twilio) {
    parts.push(`
══════════════════════════════════════════════════════════════
TWILIO IS CONNECTED — SMS AND VOICE AVAILABLE
══════════════════════════════════════════════════════════════
The user has Twilio connected through the secure backend adapter.
Twilio REQUIRES server-side calls — NEVER expose Account SID or Auth Token in frontend code.
Build a server-side endpoint (/api/send-sms) that uses environment variables.
`);
  }

  if (capabilities.sendgrid) {
    parts.push(`
══════════════════════════════════════════════════════════════
SENDGRID IS CONNECTED — EMAIL AVAILABLE
══════════════════════════════════════════════════════════════
The user has SendGrid connected through the secure backend adapter.
Email sending REQUIRES server-side. Build a /api/send-email endpoint using process.env.SENDGRID_API_KEY.
NEVER embed the SendGrid API key in frontend code.
`);
  }

  if (capabilities.resend) {
    parts.push(`
══════════════════════════════════════════════════════════════
RESEND IS CONNECTED — TRANSACTIONAL EMAIL AVAILABLE
══════════════════════════════════════════════════════════════
The user has Resend connected through the secure backend adapter.
Email sending REQUIRES server-side. Build a /api/send-email endpoint using process.env.RESEND_API_KEY.
NEVER embed the Resend API key in frontend code.
`);
  }

  if (capabilities.pusher) {
    parts.push(`
══════════════════════════════════════════════════════════════
PUSHER IS CONNECTED — REAL-TIME FEATURES AVAILABLE
══════════════════════════════════════════════════════════════
The user has Pusher connected through the secure backend adapter.
Use the Pusher JS SDK with placeholder variables for key and cluster.
Triggering events requires a server-side Pusher SDK — never expose App Secret in frontend.
`);
  }

  if (capabilities.googlemaps) {
    parts.push(`
══════════════════════════════════════════════════════════════
GOOGLE MAPS IS CONNECTED — MAPS FEATURES AVAILABLE
══════════════════════════════════════════════════════════════
The user has Google Maps connected through the secure backend adapter.
Generate code with a placeholder variable for the API key — the user will fill it in.
PATTERN: <script src="https://maps.googleapis.com/maps/api/js?key=GOOGLE_MAPS_API_KEY&libraries=places"></script>
`);
  }

  if (capabilities.mapbox) {
    parts.push(`
══════════════════════════════════════════════════════════════
MAPBOX IS CONNECTED — MAPS FEATURES AVAILABLE
══════════════════════════════════════════════════════════════
The user has Mapbox connected through the secure backend adapter.
Generate code with a placeholder variable for the access token — the user will fill it in.
PATTERN: mapboxgl.accessToken = MAPBOX_TOKEN; // variable provided by user
`);
  }

  if (capabilities.algolia) {
    parts.push(`
══════════════════════════════════════════════════════════════
ALGOLIA IS CONNECTED — INSTANT SEARCH AVAILABLE
══════════════════════════════════════════════════════════════
The user has Algolia connected through the secure backend adapter.
Generate code with placeholder variables for App ID and Search API Key (search-only key is safe for frontend).
The user will fill in the actual values from their Algolia dashboard.
`);
  }

  if (capabilities.slack) {
    parts.push(`
══════════════════════════════════════════════════════════════
SLACK IS CONNECTED — MESSAGING AVAILABLE
══════════════════════════════════════════════════════════════
The user has Slack connected through the secure backend adapter.
Slack Bot Token MUST be server-side only — NEVER expose it in frontend code.
Build a /api/send-slack endpoint using process.env.SLACK_BOT_TOKEN.
`);
  }

  if (capabilities.discord) {
    parts.push(`
══════════════════════════════════════════════════════════════
DISCORD IS CONNECTED — BOT MESSAGING AVAILABLE
══════════════════════════════════════════════════════════════
The user has Discord connected through the secure backend adapter.
Discord Bot Token MUST be server-side only — NEVER expose it in frontend code.
Build a /api/send-discord endpoint using process.env.DISCORD_BOT_TOKEN.
`);
  }

  if (capabilities.twitter) {
    parts.push(`
══════════════════════════════════════════════════════════════
X (TWITTER) API IS CONNECTED — SOCIAL FEATURES AVAILABLE
══════════════════════════════════════════════════════════════
The user has Twitter/X API connected through the secure backend adapter.
Bearer Token MUST stay server-side — build a /api/twitter proxy endpoint.
NEVER embed the Bearer Token in frontend code.
`);
  }

  if (capabilities.huggingface) {
    parts.push(`
══════════════════════════════════════════════════════════════
HUGGING FACE IS CONNECTED — AI MODELS AVAILABLE
══════════════════════════════════════════════════════════════
The user has Hugging Face connected through the secure backend adapter.
Use a server-side proxy for model inference — NEVER embed HF tokens in frontend code.
`);
  }

  if (capabilities.replicate) {
    parts.push(`
══════════════════════════════════════════════════════════════
REPLICATE IS CONNECTED — AI MODEL HOSTING AVAILABLE
══════════════════════════════════════════════════════════════
The user has Replicate connected through the secure backend adapter.
Replicate API Token MUST be server-side only — build a /api/replicate proxy endpoint.
NEVER embed the token in frontend code.
`);
  }

  return parts.length > 0 ? "\n" + parts.join("\n") : "";
}

/**
 * Build the system prompt for the AI model.
 *
 * @param mode         - User's selected builder mode
 * @param capabilities - Boolean map of connected providers (server-derived, no secrets)
 * @param projectType  - Optional project type hint (e.g. "mobile")
 * @param stack        - Technology stack (html/react/vue/nextjs/svelte/django)
 * @param intent       - Detected user intent for token optimization
 */
export function getSystemPrompt(
  mode: string,
  capabilities?: Record<string, boolean>,
  projectType?: string,
  stack?: string,
  intent?: string,
): string {
  let base: string;

  if (stack === "react" || stack === "nextjs") {
    base = REACT_STACK_RULES;
  } else if (stack === "vue") {
    base = VUE_STACK_RULES;
  } else if (stack === "svelte") {
    base = SVELTE_STACK_RULES;
  } else if (stack === "django") {
    base = DJANGO_STACK_RULES;
  } else {
    switch (mode) {
      case "developer":
        base = DEVELOPER_SYSTEM_PROMPT;
        break;
      case "builder":
        base = BUILDER_SYSTEM_PROMPT;
        break;
      case "maker":
        base = MAKER_SYSTEM_PROMPT;
        break;
      case "entrepreneur":
      default:
        base = ENTREPRENEUR_SYSTEM_PROMPT;
    }
  }

  // Performance optimization: strip CDN library list for edit/fix/inspect intents
  if (intent && SKIP_LIBRARIES_INTENTS.has(intent)) {
    base = base.replace(SHARED_LIBRARIES, "");
  }

  if (projectType === "mobile") {
    base += `

══════════════════════════════════════════════════════════════
MOBILE APP MODE — BUILD A NATIVE-FEELING MOBILE EXPERIENCE
══════════════════════════════════════════════════════════════
The user wants a MOBILE APPLICATION. Build it as a Progressive Web App (PWA) that
feels like a real native mobile app. Follow these rules strictly:

LAYOUT & DESIGN:
• Maximum width: 390px centered (iPhone 14 Pro size), rest is background
• Use a fixed bottom navigation bar (like native apps: 4-5 icons)
• Header is fixed at top with safe-area padding
• All tap targets ≥ 44px (iOS Human Interface Guidelines)
• Use touch-friendly gestures: swipe hints, large buttons
• Smooth transitions between "screens" using CSS transitions (no page reloads)

VISUAL STYLE:
• Follow iOS/Android design patterns: cards, sheets, modals sliding up
• Use CSS custom properties for theming (support dark/light)
• Bottom sheets for secondary content (slide up from bottom)
• Haptic-style micro-animations on button tap (scale 0.95)
• Safe area insets: padding-bottom: env(safe-area-inset-bottom)

NAVIGATION:
• Build a proper SPA with multiple "screens" that swap via JS
• No browser back button needed — use in-app back arrows
• Tab bar at bottom with active state indicators

PERFORMANCE:
• Use CSS animations (not JS) for transitions
• Lazy load content as needed
• Skeleton loaders for async content

PWA MANIFEST (include inline in HTML):
• Add <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
• Add <meta name="mobile-web-app-capable" content="yes">
• Add <meta name="apple-mobile-web-app-capable" content="yes">

REMEMBER: This should look indistinguishable from a real iOS/Android app!
`;
  }

  const capabilityBlock = capabilities
    ? buildCapabilityBlock(capabilities)
    : "";
  return HEBREW_LANGUAGE_INSTRUCTION + "\n" + base + capabilityBlock;
}
