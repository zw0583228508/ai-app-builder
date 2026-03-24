import type { Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  projectMessagesTable,
  projectFilesTable,
  deploymentsTable,
  projectsTable,
} from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { DetectedIntent } from "../../../services/ai/intent";
import {
  PLANNING_SYSTEM_PROMPT,
  PRODUCT_SPEC_SYSTEM_PROMPT,
} from "../../../services/ai/prompts/index";
import { createZip } from "../deploy";
import { syncProjectToGitHub } from "../github-sync";
import { getIntegrationSecrets } from "../../../services/integrations/vault";

export interface IntentHandlerCtx {
  body: {
    content: string;
    attachments?: { name: string }[];
  };
  userId: string | null;
  project: {
    id: number;
    stack?: string | null;
    previewHtml?: string | null;
    githubRepoUrl?: string | null;
    githubRepoName?: string | null;
    lastDeployUrl?: string | null;
    title?: string | null;
    userId?: string | null;
  };
  params: { id: number };
  existingMessages: { role: string; content: string }[];
  isFirstMessage: boolean;
  isPlanningAnswerMessage: boolean;
  isAfterSpecPhase: boolean;
  isAfterPlanningQA: boolean;
  usePlanningPhase: boolean;
  useSpecGeneration: boolean;
  detectedIntent: DetectedIntent;
  currentMode: string;
  hasExistingCode: boolean;
  sendEvent: (data: object) => void;
  res: Response;
}

/**
 * Handle all intent-specific early-return branches.
 * Returns true if the intent was fully handled (response sent, res.end() called).
 * Returns false if the request should continue to AI generation.
 */
export async function handleIntentRouting(
  ctx: IntentHandlerCtx,
): Promise<boolean> {
  const {
    body,
    project,
    params,
    userId,
    existingMessages,
    isFirstMessage,
    usePlanningPhase,
    useSpecGeneration,
    detectedIntent,
    currentMode,
    hasExistingCode,
    sendEvent,
    res,
  } = ctx;

  // ── Issue 14: Entrepreneur planning phase ─────────────────────────────────
  // Non-returning: emit a brief project plan, then continue to main AI response.
  if (currentMode === "entrepreneur" && isFirstMessage) {
    sendEvent({
      type: "agent_phase",
      phase: "planning",
      message: `מנתח את הרעיון שלך...`,
    });

    const entrepreneurPlanPrompt = `You are a business and product planner for entrepreneurs.
The entrepreneur wants to build: "${body.content}"

Generate a brief structured plan in JSON:
{
  "business_idea": "one sentence summary",
  "target_audience": "who are the customers?",
  "key_features": ["feature 1", "feature 2", "feature 3"],
  "monetization": "how to make money",
  "tech_recommendation": "which stack to use and why"
}
Return ONLY the JSON, no markdown.`;

    try {
      const planMsg = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        messages: [{ role: "user", content: entrepreneurPlanPrompt }],
      });
      const planRaw =
        planMsg.content[0].type === "text" ? planMsg.content[0].text : "{}";
      const planJson = planRaw.match(/\{[\s\S]*\}/)?.[0];
      if (planJson) {
        const plan = JSON.parse(planJson) as Record<string, unknown>;
        sendEvent({ type: "entrepreneur_plan", plan });
      }
    } catch {
      // Non-fatal — proceed without plan
    }
    sendEvent({ type: "agent_phase", phase: null, message: null });
    // NOT an early return — fall through to main generation
  }

  // ── T018: AI Image Generation Command ────────────────────────────────────
  const imgMatch =
    body.content.match(/^\/(?:generate-image|image)\s+(.+)/i) ||
    body.content.match(
      /^(?:צור תמונה|generate image|create image|make image)\s+(.+)/i,
    );
  if (imgMatch) {
    const prompt = (imgMatch[1] ?? "").trim();
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&seed=${Date.now()}`;
    const replyText = `הנה התמונה שיצרתי:\n\n![${prompt}](${imageUrl})\n\n🎨 **תמונה שנוצרה ב-AI** — [פתח בגודל מלא](${imageUrl})`;
    sendEvent({ type: "text", content: replyText });
    await db.insert(projectMessagesTable).values({
      projectId: project.id,
      role: "assistant",
      content: replyText,
    });
    sendEvent({ done: true, previewUpdated: false });
    res.end();
    return true;
  }

  // ── Always notify the frontend of detected intent ─────────────────────────
  sendEvent({
    type: "intent_detected",
    intent: detectedIntent.intent,
    label: detectedIntent.label,
    emoji: detectedIntent.emoji,
  });

  // ── Greeting / test intent — respond conversationally, no code generated ──
  if (detectedIntent.intent === "greeting") {
    const greetingStream = anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system:
        "You are a friendly AI app builder assistant. The user is greeting you or testing the connection. Respond warmly and briefly in the same language as the user. If they write in Hebrew respond in Hebrew. Invite them to describe what app they'd like to build. Do NOT write any code.",
      messages: [{ role: "user", content: body.content }],
    });

    let fullResponse = "";
    for await (const chunk of greetingStream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const text = chunk.delta.text;
        fullResponse += text;
        sendEvent({ type: "text", content: text });
      }
    }
    await db.insert(projectMessagesTable).values({
      projectId: project.id,
      role: "assistant",
      content: fullResponse,
    });
    sendEvent({ done: true, previewUpdated: false });
    res.end();
    return true;
  }

  // ── Deploy intent ─────────────────────────────────────────────────────────
  if (detectedIntent.intent === "deploy") {
    const ownerUserId = userId ?? project.userId ?? null;
    const netlifySecrets = ownerUserId
      ? await getIntegrationSecrets(ownerUserId, "netlify")
      : null;
    const netlifyToken = netlifySecrets?.netlifyToken ?? null;
    if (!netlifyToken) {
      const replyText =
        "כדי לפרסם, חבר את Netlify בדף Integrations עם Personal Access Token. לאחר מכן שלח שוב 'פרסם'.";
      sendEvent({ type: "text", content: replyText });
      await db.insert(projectMessagesTable).values({
        projectId: project.id,
        role: "assistant",
        content: replyText,
      });
      sendEvent({
        done: true,
        previewUpdated: false,
        action: "connect_netlify",
      });
      res.end();
      return true;
    }

    const isReactProject =
      project.stack === "react" || project.stack === "nextjs";
    const projectFiles = isReactProject
      ? await db
          .select()
          .from(projectFilesTable)
          .where(eq(projectFilesTable.projectId, params.id))
      : [];
    const hasContent = project.previewHtml || projectFiles.length > 0;

    if (!hasContent) {
      const replyText =
        "אין עדיין קוד לפרסם — בנה קודם את הפרויקט ואז אפרסם אותו.";
      sendEvent({ type: "text", content: replyText });
      await db.insert(projectMessagesTable).values({
        projectId: project.id,
        role: "assistant",
        content: replyText,
      });
      sendEvent({ done: true, previewUpdated: false });
      res.end();
      return true;
    }

    const [deployRecord] = await db
      .insert(deploymentsTable)
      .values({
        projectId: project.id,
        provider: "netlify",
        status: "building",
      })
      .returning();

    sendEvent({ type: "text", content: "🚀 מפרסם את הפרויקט ב-Netlify..." });

    try {
      const slug = (project.title || "builder-app")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);

      const siteRes = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${slug}-${deployRecord.id}`,
          custom_domain: null,
        }),
      });
      if (!siteRes.ok) {
        const siteErr = (await siteRes.json().catch(() => ({}))) as Record<
          string,
          string
        >;
        throw new Error(siteErr["message"] ?? "Failed to create Netlify site");
      }
      const site = (await siteRes.json()) as {
        id: string;
        ssl_url: string;
        url: string;
      };

      sendEvent({ type: "text", content: "📦 מכין את קבצי הפרויקט..." });

      let zipBuffer: Buffer;
      if (isReactProject && projectFiles.length > 0) {
        const entryFile =
          projectFiles.find((f) => f.isEntrypoint) || projectFiles[0];
        const allContent = projectFiles
          .map((f) => `/* ${f.path} */\n${f.content}`)
          .join("\n\n");
        const htmlShell = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${project.title ?? "App"}</title></head><body><div id="root"></div><script type="module">${allContent}</script></body></html>`;
        zipBuffer = await createZip({ "index.html": htmlShell });
        void entryFile;
      } else {
        zipBuffer = await createZip({ "index.html": project.previewHtml! });
      }

      sendEvent({ type: "text", content: "⬆️ מעלה קבצים ל-Netlify..." });

      const deployRes = await fetch(
        `https://api.netlify.com/api/v1/sites/${site.id}/deploys`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${netlifyToken}`,
            "Content-Type": "application/zip",
          },
          body: zipBuffer,
        },
      );
      if (!deployRes.ok) {
        const depErr = (await deployRes.json().catch(() => ({}))) as Record<
          string,
          string
        >;
        throw new Error(depErr["message"] ?? "Failed to deploy to Netlify");
      }
      const deploy = (await deployRes.json()) as { id: string; state: string };

      sendEvent({
        type: "text",
        content: "✅ הפרויקט עלה! ממתין לאישור DNS...",
      });

      // Poll for deploy ready (max 60 s)
      let liveUrl = site.ssl_url || site.url;
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const checkRes = await fetch(
          `https://api.netlify.com/api/v1/deploys/${deploy.id}`,
          { headers: { Authorization: `Bearer ${netlifyToken}` } },
        );
        if (checkRes.ok) {
          const checkData = (await checkRes.json()) as {
            state: string;
            ssl_url: string;
            url: string;
          };
          if (checkData.state === "ready" || checkData.state === "current") {
            liveUrl = checkData.ssl_url || checkData.url || liveUrl;
            break;
          }
        }
      }

      await db
        .update(deploymentsTable)
        .set({
          status: "live",
          url: liveUrl,
          siteId: site.id,
          deployId: deploy.id,
        })
        .where(eq(deploymentsTable.id, deployRecord.id));
      await db
        .update(projectsTable)
        .set({ lastDeployUrl: liveUrl, updatedAt: new Date() })
        .where(eq(projectsTable.id, project.id));

      const replyText = `✅ **הפרויקט פורסם בהצלחה!**\n\n🌐 כתובת חיה: [${liveUrl}](${liveUrl})\n\nהאתר שלך נמצא עכשיו ברשת ומוכן לשיתוף. תוכל לראות את ההיסטוריה של הפרסומים בלשונית Deploy.`;
      sendEvent({ type: "text", content: replyText });
      await db.insert(projectMessagesTable).values({
        projectId: project.id,
        role: "assistant",
        content: replyText,
      });
      sendEvent({
        done: true,
        previewUpdated: false,
        action: "deployed",
        deployUrl: liveUrl,
      });
    } catch (deployErr) {
      const msg =
        deployErr instanceof Error ? deployErr.message : "שגיאת פרסום";
      await db
        .update(deploymentsTable)
        .set({ status: "failed", error: msg })
        .where(eq(deploymentsTable.id, deployRecord.id))
        .catch(() => {});
      const replyText = `❌ הפרסום נכשל: ${msg}. בדוק את ה-Netlify Token בדף Integrations.`;
      sendEvent({ type: "text", content: replyText });
      await db.insert(projectMessagesTable).values({
        projectId: project.id,
        role: "assistant",
        content: replyText,
      });
      sendEvent({ done: true, previewUpdated: false });
    }
    res.end();
    return true;
  }

  // ── Git push intent ───────────────────────────────────────────────────────
  if (detectedIntent.intent === "git_push") {
    const ownerUserIdGit = userId ?? project.userId ?? null;
    const githubSecrets = ownerUserIdGit
      ? await getIntegrationSecrets(ownerUserIdGit, "github")
      : null;
    const githubToken = githubSecrets?.githubToken ?? null;
    if (!githubToken) {
      const replyText =
        "כדי לסנכרן GitHub, חבר את GitHub בדף Integrations עם Personal Access Token (הרשאות: repo). לאחר מכן שלח שוב 'push to GitHub'.";
      sendEvent({ type: "text", content: replyText });
      await db.insert(projectMessagesTable).values({
        projectId: project.id,
        role: "assistant",
        content: replyText,
      });
      sendEvent({
        done: true,
        previewUpdated: false,
        action: "connect_github",
      });
      res.end();
      return true;
    }
    const existingRepoName = project.githubRepoName ?? undefined;
    sendEvent({
      type: "text",
      content: existingRepoName
        ? `מעדכן רפוזיטורי ${existingRepoName} ב-GitHub...`
        : "יוצר רפוזיטורי חדש ב-GitHub...",
    });
    try {
      const result = await syncProjectToGitHub(
        params.id,
        githubToken,
        existingRepoName,
      );
      await db
        .update(projectsTable)
        .set({
          githubRepoUrl: result.repoUrl,
          githubRepoName: result.repoName,
          updatedAt: new Date(),
        })
        .where(eq(projectsTable.id, project.id));
      const action = result.isNew ? "יצרתי" : "עדכנתי";
      const fileWord = result.filesSync === 1 ? "קובץ" : "קבצים";
      const replyText = `✅ **GitHub מסונכרן!**\n\n📦 ${action} רפוזיטורי: [${result.owner}/${result.repoName}](${result.repoUrl})\n🗂️ ${result.filesSync} ${fileWord} סונכרנו\n\nהקוד שלך ב-GitHub מעודכן. הפעם הבאה שתבקש לסנכרן, אעדכן את אותו ה-repo.`;
      sendEvent({ type: "text", content: replyText });
      await db.insert(projectMessagesTable).values({
        projectId: project.id,
        role: "assistant",
        content: replyText,
      });
      sendEvent({
        done: true,
        previewUpdated: false,
        action: "git_synced",
        repoUrl: result.repoUrl,
      });
    } catch (gitErr) {
      const msg = gitErr instanceof Error ? gitErr.message : "שגיאת GitHub";
      const replyText = `❌ הסנכרון נכשל: ${msg}`;
      sendEvent({ type: "text", content: replyText });
      await db.insert(projectMessagesTable).values({
        projectId: project.id,
        role: "assistant",
        content: replyText,
      });
      sendEvent({ done: true, previewUpdated: false });
    }
    res.end();
    return true;
  }

  // ── Inspect intent ────────────────────────────────────────────────────────
  if (detectedIntent.intent === "inspect" && hasExistingCode) {
    const inspectFiles =
      project.stack === "react" || project.stack === "nextjs"
        ? await db
            .select({
              path: projectFilesTable.path,
              language: projectFilesTable.language,
            })
            .from(projectFilesTable)
            .where(eq(projectFilesTable.projectId, params.id))
        : [];

    const fileList =
      inspectFiles.length > 0
        ? inspectFiles.map((f) => `  - ${f.path} (${f.language})`).join("\n")
        : "";

    const gitStatus = project.githubRepoUrl
      ? `GitHub: מחובר — ${project.githubRepoUrl}`
      : "GitHub: לא מסונכרן";

    const deployStatus = project.lastDeployUrl
      ? `Deploy: פורסם — ${project.lastDeployUrl}`
      : "Deploy: לא פורסם עדיין";

    const projectSummary = [
      `כותרת: ${project.title}`,
      `Stack: ${project.stack ?? "html"}`,
      project.previewHtml
        ? `גודל קוד: ${Math.round(project.previewHtml.length / 1024)}KB`
        : "",
      fileList ? `קבצים:\n${fileList}` : "",
      `הודעות בצ'אט: ${existingMessages.length}`,
      gitStatus,
      deployStatus,
      project.previewHtml
        ? `תחילת הקוד:\n\`\`\`html\n${project.previewHtml.slice(0, 500)}\n\`\`\``
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const inspectStream = anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system:
        "You are helping a user understand their current project state. Be concise, friendly, and use bullet points. Always answer in Hebrew. Include the GitHub and deploy status in your summary.",
      messages: [
        {
          role: "user",
          content: `סכם את המצב הנוכחי של הפרויקט:\n${projectSummary}\n\nשאלת המשתמש: ${body.content}`,
        },
      ],
    });

    let fullResponse = "";
    for await (const chunk of inspectStream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        fullResponse += chunk.delta.text;
        sendEvent({ type: "text", content: chunk.delta.text });
      }
    }
    await db.insert(projectMessagesTable).values({
      projectId: project.id,
      role: "assistant",
      content: fullResponse,
    });
    sendEvent({ done: true, previewUpdated: false });
    res.end();
    return true;
  }

  // ── Planning phase ────────────────────────────────────────────────────────
  if (usePlanningPhase) {
    sendEvent({
      type: "planning_start",
      message: "מגבש שאלות לפני הבנייה...",
    });

    const planningStream = anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system: PLANNING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: body.content }],
    });

    let fullResponse = "";
    for await (const chunk of planningStream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const text = chunk.delta.text;
        fullResponse += text;
        sendEvent({ type: "text", content: text });
      }
    }
    await db.insert(projectMessagesTable).values({
      projectId: project.id,
      role: "assistant",
      content: fullResponse,
    });
    sendEvent({ type: "planning_done" });
    sendEvent({ done: true, previewUpdated: false });
    res.end();
    return true;
  }

  // ── Spec generation phase ─────────────────────────────────────────────────
  if (useSpecGeneration) {
    sendEvent({
      type: "spec_start",
      message: "מנסח מפרט מוצר מפורט בהתבסס על תשובותיך...",
    });

    const specStream = anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 1400,
      system: PRODUCT_SPEC_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: existingMessages[0]?.content ?? body.content,
        },
        { role: "assistant", content: existingMessages[1]?.content ?? "" },
        { role: "user", content: body.content },
      ],
    });

    let fullResponse = "";
    for await (const chunk of specStream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const text = chunk.delta.text;
        fullResponse += text;
        sendEvent({ type: "text", content: text });
      }
    }
    await db.insert(projectMessagesTable).values({
      projectId: project.id,
      role: "assistant",
      content: fullResponse,
    });
    sendEvent({ type: "spec_done" });
    sendEvent({ done: true, previewUpdated: false });
    res.end();
    return true;
  }

  return false;
}
