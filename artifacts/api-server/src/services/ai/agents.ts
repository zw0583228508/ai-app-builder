import { anthropic } from "@workspace/integrations-anthropic-ai";

export interface AgentAnalysis {
  architecture: {
    stack: string;
    sections: string[];
    components: string[];
    apis: string[];
    reasoning: string;
  };
  ui: {
    colorScheme: string;
    layout: string;
    animations: string[];
    fonts: string;
    designNotes: string;
  };
  security: {
    risks: string[];
    mitigations: string[];
  };
  performance: {
    patterns: string[];
    avoidances: string[];
  };
}

export async function runArchitectureAgent(
  userMessage: string,
  stack: string,
  mode: string,
): Promise<AgentAnalysis["architecture"]> {
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    system: `You are an expert architect. Analyze this app-building request and decide what to build.
Return ONLY valid JSON:
{
  "stack": "${stack}",
  "sections": ["list of page sections to build"],
  "components": ["list of UI components needed"],
  "apis": ["real APIs to use, empty array if none"],
  "reasoning": "one line explaining the approach"
}`,
    messages: [
      {
        role: "user",
        content: `Mode: ${mode}\nRequest: ${userMessage.slice(0, 800)}`,
      },
    ],
  });
  const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    return m
      ? JSON.parse(m[0])
      : { stack, sections: [], components: [], apis: [], reasoning: "" };
  } catch {
    return { stack, sections: [], components: [], apis: [], reasoning: "" };
  }
}

export async function runUiAgent(
  userMessage: string,
  mode: string,
): Promise<AgentAnalysis["ui"]> {
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    system: `You are a UI/UX expert. Decide design direction for this app request.
Return ONLY valid JSON:
{
  "colorScheme": "dark|light|colorful — with primary hex",
  "layout": "centered|full-width|sidebar|bento",
  "animations": ["list of 2-3 specific animations to use"],
  "fonts": "Google Fonts suggestion",
  "designNotes": "one line about visual style"
}`,
    messages: [
      {
        role: "user",
        content: `Mode: ${mode}\nRequest: ${userMessage.slice(0, 600)}`,
      },
    ],
  });
  const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    return m
      ? JSON.parse(m[0])
      : { colorScheme: "dark", layout: "centered", animations: [], fonts: "Inter", designNotes: "" };
  } catch {
    return { colorScheme: "dark", layout: "centered", animations: [], fonts: "Inter", designNotes: "" };
  }
}

export async function runSecurityAgent(
  userMessage: string,
): Promise<AgentAnalysis["security"]> {
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    system: `You are a security expert. Identify security risks and mitigations for this web app request.
Return ONLY valid JSON:
{
  "risks": ["list of 1-3 specific risks"],
  "mitigations": ["matching list of mitigations to apply in code"]
}`,
    messages: [{ role: "user", content: userMessage.slice(0, 600) }],
  });
  const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    return m ? JSON.parse(m[0]) : { risks: [], mitigations: [] };
  } catch {
    return { risks: [], mitigations: [] };
  }
}

export async function runPerformanceAgent(
  userMessage: string,
): Promise<AgentAnalysis["performance"]> {
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    system: `You are a performance expert for web apps. Identify performance patterns to use or avoid.
Return ONLY valid JSON:
{
  "patterns": ["list of 1-3 patterns to apply"],
  "avoidances": ["list of 1-3 anti-patterns to avoid"]
}`,
    messages: [{ role: "user", content: userMessage.slice(0, 600) }],
  });
  const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    return m ? JSON.parse(m[0]) : { patterns: [], avoidances: [] };
  } catch {
    return { patterns: [], avoidances: [] };
  }
}

export function buildAgentContext(analysis: AgentAnalysis): string {
  return `\n══════════════════════════════════════════════════════════════
🤖 MULTI-AGENT ANALYSIS — Follow these directives exactly
══════════════════════════════════════════════════════════════
🏗️ ARCHITECTURE (Architect Agent):
- Sections to build: ${analysis.architecture.sections.join(", ") || "standard sections"}
- Components: ${analysis.architecture.components.join(", ") || "as needed"}
- APIs to use: ${analysis.architecture.apis.join(", ") || "none"}
- Approach: ${analysis.architecture.reasoning}

🎨 DESIGN (UI Agent):
- Color scheme: ${analysis.ui.colorScheme}
- Layout: ${analysis.ui.layout}
- Animations: ${analysis.ui.animations.join(", ") || "subtle transitions"}
- Fonts: ${analysis.ui.fonts}
- Style: ${analysis.ui.designNotes}

🔒 SECURITY (Security Agent) — Apply all:
${analysis.security.mitigations.map((m) => `- ${m}`).join("\n") || "- Standard XSS prevention"}

⚡ PERFORMANCE (Performance Agent):
- Apply: ${analysis.performance.patterns.join(", ") || "lazy loading, minification"}
- Avoid: ${analysis.performance.avoidances.join(", ") || "render-blocking scripts"}
`;
}

export function calculateSkillScore(
  messages: Array<{ role: string; content: string }>,
): number {
  const userMessages = messages.filter((m) => m.role === "user");
  let score = Math.min(userMessages.length * 2, 20);

  const techTerms = [
    "api", "database", "component", "function", "array", "object",
    "async", "auth", "deploy", "config",
  ];
  for (const msg of userMessages) {
    const lower = msg.content.toLowerCase();
    const found = techTerms.filter((t) => lower.includes(t)).length;
    score += found * 3;
  }

  return Math.min(score, 100);
}
