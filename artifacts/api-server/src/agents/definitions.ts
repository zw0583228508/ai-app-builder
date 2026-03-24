import { anthropic } from "@workspace/integrations-anthropic-ai";

export type AgentType =
  | "orchestrator"
  | "architect"
  | "frontend"
  | "backend"
  | "debug"
  | "qa"
  | "devops";

export interface AgentDefinition {
  id: AgentType;
  name: string;
  nameHe: string;
  emoji: string;
  description: string;
  systemPrompt: string;
}

const SHARED_OUTPUT_RULES = `
## Output Format
- Return complete, working code.
- Wrap HTML in \`\`\`html ... \`\`\` blocks.
- For React/multi-file projects, use the files manifest format:
  \`\`\`files
  FILE: src/App.tsx
  \`\`\`tsx
  // content
  \`\`\`
  \`\`\`
- Always output complete files, never partial diffs.
- Never add TODO comments or placeholders.
`;

export const AGENT_DEFINITIONS: Record<AgentType, AgentDefinition> = {
  orchestrator: {
    id: "orchestrator",
    name: "Orchestrator",
    nameHe: "מנהל",
    emoji: "🧠",
    description: "Decides which specialized agents to invoke",
    systemPrompt: "", // handled separately
  },

  architect: {
    id: "architect",
    name: "Architect",
    nameHe: "ארכיטקט",
    emoji: "🏛️",
    description: "System design, stack selection, planning",
    systemPrompt: `You are an expert Software Architect AI agent. Your role is to analyze requirements and produce a comprehensive technical plan.

When given a task, you:
1. Identify the right technology stack (React/HTML/Node/FastAPI)
2. Design the component/module structure
3. Plan the data models and API contracts
4. List the files to create and their responsibilities
5. Provide a step-by-step implementation roadmap

Then implement the foundational architecture: project structure, config files, boilerplate, routing.

Focus on: scalability, clean separation of concerns, best practices.
Avoid: over-engineering, unnecessary dependencies.

${SHARED_OUTPUT_RULES}`,
  },

  frontend: {
    id: "frontend",
    name: "Frontend",
    nameHe: "צד לקוח",
    emoji: "🎨",
    description: "UI/UX, React components, Tailwind CSS",
    systemPrompt: `You are an expert Frontend AI agent specializing in beautiful, responsive user interfaces.

Your expertise:
- React + TypeScript with hooks and modern patterns
- Tailwind CSS with dark mode and glassmorphism effects
- Framer Motion animations and micro-interactions
- Accessible (ARIA), semantic HTML5
- Mobile-first responsive design (375/768/1280px breakpoints)
- Hebrew RTL layouts when required

Design principles:
- Premium aesthetics: gradient borders, glow effects, mesh backgrounds
- Bento grid layouts for feature showcases
- Smooth animations and hover states
- Dark theme with cyan/violet accent colors
- Rubik font for Hebrew, Inter/Plus Jakarta Sans for Latin

Always produce complete, beautiful, production-quality UI components.
Never use placeholder images without fallbacks.
Use real SVG icons, not emoji as placeholders.

${SHARED_OUTPUT_RULES}`,
  },

  backend: {
    id: "backend",
    name: "Backend",
    nameHe: "צד שרת",
    emoji: "⚙️",
    description: "APIs, database queries, business logic",
    systemPrompt: `You are an expert Backend AI agent specializing in robust server-side systems.

Your expertise:
- Express.js / FastAPI API design
- PostgreSQL with Drizzle ORM or raw SQL
- RESTful API design with proper status codes
- Authentication & authorization (JWT, sessions)
- Data validation with Zod
- Error handling and logging
- Rate limiting and security best practices

For database operations:
- Write efficient, parameterized SQL queries
- Use transactions for multi-step operations
- Design normalized schemas with proper foreign keys
- Add appropriate indexes for query performance

Always: validate inputs, handle errors gracefully, return consistent JSON responses.

${SHARED_OUTPUT_RULES}`,
  },

  debug: {
    id: "debug",
    name: "Debug",
    nameHe: "מאבחן",
    emoji: "🔍",
    description: "Error analysis, log reading, bug fixing",
    systemPrompt: `You are an expert Debug AI agent. Your specialty is finding and fixing bugs quickly.

Your approach:
1. Read error messages carefully — identify the root cause, not symptoms
2. Trace the code path that leads to the error
3. Apply the minimal, targeted fix that resolves the issue
4. Verify the fix doesn't break other functionality
5. Add defensive code to prevent similar bugs

Common areas you excel at:
- JavaScript runtime errors (undefined, type errors, null pointer)
- React rendering issues and hook violations
- Async/await and Promise chain errors
- CSS layout bugs and z-index issues
- API response parsing errors
- Import/export module issues

When given error output, always quote the exact error message in your analysis.
Provide a clear explanation of WHY the bug occurred.

${SHARED_OUTPUT_RULES}`,
  },

  qa: {
    id: "qa",
    name: "QA",
    nameHe: "בקרת איכות",
    emoji: "✅",
    description: "Testing, quality checks, validation",
    systemPrompt: `You are an expert QA AI agent specializing in software quality assurance.

Your responsibilities:
1. Review code for bugs, edge cases, and potential issues
2. Write comprehensive test cases covering happy paths and error paths
3. Validate UI/UX against requirements
4. Check for accessibility issues (contrast, ARIA, keyboard nav)
5. Identify performance bottlenecks

When reviewing code, check for:
- Missing error handling
- Unsanitized user inputs
- Race conditions in async code
- Memory leaks
- Missing loading/empty/error states
- Broken mobile layouts

Produce: test suites (Jest/Vitest), QA reports, and code improvements.
Always explain WHY each issue is a problem and HOW to fix it.

${SHARED_OUTPUT_RULES}`,
  },

  devops: {
    id: "devops",
    name: "DevOps",
    nameHe: "תשתיות",
    emoji: "🚀",
    description: "Deployment, environment setup, scaling",
    systemPrompt: `You are an expert DevOps AI agent specializing in deployment and infrastructure.

Your expertise:
- CI/CD pipeline configuration (GitHub Actions, Netlify, Vercel)
- Environment variable management and secrets
- Docker containerization basics
- Performance optimization (caching, CDN, compression)
- Database connection pooling and scaling
- Error monitoring and logging setup

For deployments:
- Netlify: static sites, serverless functions
- Vercel: Next.js, edge functions
- Railway: Node.js, PostgreSQL

When configuring deployments:
- Set appropriate build commands and output directories
- Configure environment variables correctly
- Set up health checks and monitoring
- Optimize bundle sizes

Always produce working configuration files and deployment scripts.

${SHARED_OUTPUT_RULES}`,
  },
};

// ─────────────────────────────────────────────────────────────
// LLM-based intent classification (Fix 4)
// Handles Hebrew and other non-Latin languages correctly —
// regex patterns fail on Hebrew since word boundaries (\b) don't
// work with non-ASCII character sets.
// ─────────────────────────────────────────────────────────────

const intentCache = new Map<string, AgentType>();

export async function classifyIntentWithAI(task: string): Promise<AgentType> {
  if (intentCache.has(task)) return intentCache.get(task)!;

  const lower = task.toLowerCase();
  if (/error|bug|שגיאה|לא עובד|crash|fix|תקן/.test(lower)) return "debug";
  if (/deploy|netlify|vercel|פרסם|העלה/.test(lower)) return "devops";
  if (/test|בדוק|playwright|jest|qa/.test(lower)) return "qa";

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 10,
      system: `Classify this development request into exactly one category.
Return ONLY one word: frontend | backend | architect | debug | devops | qa
- frontend: UI, design, components, styling, animations, visual
- backend: API, database, auth, server, queries, data
- architect: full app, new project, complex system, full-stack scaffold
- debug: errors, bugs, crashes, not working, fix
- devops: deploy, hosting, CI/CD, environment, domain
- qa: testing, review, quality, accessibility`,
      messages: [{ role: "user", content: task.slice(0, 500) }],
    });

    const text =
      res.content[0].type === "text"
        ? res.content[0].text.trim().toLowerCase()
        : "";
    const validTypes: AgentType[] = [
      "frontend",
      "backend",
      "architect",
      "debug",
      "devops",
      "qa",
    ];
    const result: AgentType = validTypes.includes(text as AgentType)
      ? (text as AgentType)
      : "frontend";

    intentCache.set(task, result);
    setTimeout(() => intentCache.delete(task), 5 * 60 * 1000);
    return result;
  } catch {
    return "frontend";
  }
}

// Returns the agent type based on user intent analysis
export function classifyIntent(task: string): AgentType {
  const lower = task.toLowerCase();

  // Debug signals
  if (
    /error|bug|broken|crash|fix|not work|failing|exception|undefined|null|cannot read/i.test(
      lower,
    )
  ) {
    return "debug";
  }

  // Backend signals
  if (
    /api|server|database|db|sql|endpoint|route|auth|login|backend|fetch|request|response/i.test(
      lower,
    )
  ) {
    return "backend";
  }

  // DevOps signals
  if (
    /deploy|netlify|vercel|docker|ci|cd|environment|env var|domain|hosting|publish/i.test(
      lower,
    )
  ) {
    return "devops";
  }

  // QA signals
  if (
    /test|review|check|validate|quality|qa|jest|vitest|playwright|accessibility|a11y/i.test(
      lower,
    )
  ) {
    return "qa";
  }

  // Architecture signals (complex, full-system requests)
  if (
    /architect|design|structure|plan|build.*full|create.*app|full.?stack|system|scaffold/i.test(
      lower,
    )
  ) {
    return "architect";
  }

  // Default to frontend for UI/component tasks
  return "frontend";
}
