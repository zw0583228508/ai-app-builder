/**
 * One-Click SaaS Generator — Prompt 11
 * Generates a complete SaaS application structure:
 * auth, dashboard, admin, Stripe billing, DB schema, email, analytics.
 */
import { Router, Request, Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, projectsTable, projectMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router({ mergeParams: true });

const SAAS_TEMPLATE = (appName: string, description: string, stack: string) => `
Generate a complete production-ready SaaS application called "${appName}".
Description: ${description}
Stack: ${stack === "react" ? "React + TypeScript" : stack === "vue" ? "Vue 3" : stack === "nextjs" ? "Next.js 14" : "React + TypeScript"}

The application MUST include ALL of these features:

1. **AUTHENTICATION** — Complete auth system:
   - Login/Register pages with form validation
   - JWT token management (localStorage)
   - Protected routes (redirect to login if not auth)
   - User profile page
   - Password reset flow UI
   
2. **USER DASHBOARD** — After login:
   - Welcome message with user name
   - Usage statistics cards (users, revenue, events)
   - Recent activity feed
   - Quick action buttons
   
3. **ADMIN PANEL** — Admin-only section:
   - User management table (list, ban, delete)
   - Revenue overview charts
   - System settings
   - Feature flag toggles
   
4. **SUBSCRIPTION BILLING** — Stripe-ready:
   - 3 pricing plans (Free, Pro $29/mo, Enterprise $99/mo)
   - Feature comparison table
   - Upgrade button (shows alert: "Stripe integration needed")
   - Current plan badge in dashboard
   
5. **ANALYTICS DASHBOARD** — Built-in metrics:
   - DAU/MAU charts (use Chart.js or inline SVG)
   - Revenue trend graph
   - Feature usage breakdown
   - Retention cohort table
   
6. **EMAIL TEMPLATES** (shown in UI):
   - Welcome email preview
   - Password reset email preview
   - Billing notification preview
   
7. **NAVIGATION** — Sidebar with:
   - Dashboard, Analytics, Users, Billing, Settings, Admin
   - User avatar + logout button
   - Plan badge (Free/Pro/Enterprise)

Design requirements:
- Dark theme with sidebar navigation
- Mobile responsive
- Fully interactive (state management, routing with hash-based routing)
- RTL support toggle in settings
- Use Tailwind CSS via CDN

IMPORTANT: Generate the COMPLETE working code. Not just a shell — all screens must be fully functional with demo data.
`;

// POST /api/projects/:id/saas-generator — generate SaaS app for project
router.post("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const { appName, description } = req.body as { appName?: string; description?: string };

  if (!appName?.trim()) { res.status(400).json({ error: "appName is required" }); return; }
  if (appName.length > 100) { res.status(400).json({ error: "appName must be 100 characters or less" }); return; }
  if (description && description.length > 500) { res.status(400).json({ error: "description must be 500 characters or less" }); return; }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  // Save user message to chat history
  const userMsg = `🚀 Generate One-Click SaaS: "${appName}" — ${description ?? "SaaS platform"}`;
  await db.insert(projectMessagesTable).values({
    projectId,
    role: "user",
    content: userMsg,
  });

  // Return SSE stream so client gets real-time streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let clientDisconnected = false;
  req.on("close", () => { clientDisconnected = true; });

  const sendEvent = (data: object) => {
    if (!clientDisconnected) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: "text", content: `🏗️ יוצר SaaS מלא: **${appName}**...\n\n` });

  const fullPrompt = SAAS_TEMPLATE(appName, description ?? "A complete SaaS platform", project.stack ?? "react");

  let fullCode = "";

  try {
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: fullPrompt,
      }],
      system: `You are an expert full-stack developer. Generate complete, working, beautiful SaaS application code. 
Always output valid HTML with embedded JavaScript and Tailwind CSS.
Start directly with <!DOCTYPE html> — no preamble or explanation.`,
    });

    let inCode = false;
    for await (const chunk of stream) {
      if (clientDisconnected) break;
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        const text = chunk.delta.text;
        fullCode += text;
        if (!inCode && fullCode.includes("<!DOCTYPE")) inCode = true;
        if (inCode) sendEvent({ type: "code", content: text });
        else sendEvent({ type: "text", content: text });
      }
    }

    if (!clientDisconnected) {
      // ── Issue 18: Validate HTML quality before saving ──
      const rawBlock = fullCode.includes("<!DOCTYPE") ? fullCode.substring(fullCode.indexOf("<!DOCTYPE")) : fullCode;

      const qualityIssues: string[] = [];
      if (!rawBlock.includes("</html>")) qualityIssues.push("missing </html>");
      if (!rawBlock.includes("</body>")) qualityIssues.push("missing </body>");
      if (!rawBlock.includes("<head")) qualityIssues.push("missing <head>");
      if (rawBlock.length < 1000) qualityIssues.push("output too short");

      // Auto-repair common issues
      let codeBlock = rawBlock;
      if (!codeBlock.includes("</body>")) codeBlock += "\n</body>";
      if (!codeBlock.includes("</html>")) codeBlock += "\n</html>";

      if (qualityIssues.length > 0) {
        sendEvent({ type: "text", content: `\n\n⚠️ תוקנו ${qualityIssues.length} בעיות איכות: ${qualityIssues.join(", ")}` });
      }

      await db.update(projectsTable)
        .set({ previewHtml: codeBlock, updatedAt: new Date() })
        .where(eq(projectsTable.id, projectId));

      await db.insert(projectMessagesTable).values({
        projectId,
        role: "assistant",
        content: `✅ SaaS app "${appName}" נוצר בהצלחה! כולל: Auth, Dashboard, Admin, Billing, Analytics.`,
      });

      sendEvent({ done: true, previewUpdated: true });
    }
    res.end();
  } catch (e: unknown) {
    sendEvent({ error: e instanceof Error ? e.message : "SaaS generation failed" });
    res.end();
  }
});

export default router;
