import { Router } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectFilesTable,
  projectMessagesTable,
  projectSnapshotsTable,
} from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { broadcastProjectUpdate } from "../collab";
import { autoCdnInject } from "../../services/ai/preview";
import { getSystemPrompt } from "../../services/ai/system-prompt";
import { createZip } from "./deploy";
import {
  AGENT_DEFINITIONS,
  classifyIntent,
  type AgentType,
} from "../../agents/definitions";
import { GetProjectParams } from "@workspace/api-zod";
import { isHtmlUsable } from "../../utils/html";
import { getIntegrationSecrets } from "../../services/integrations/vault";

const router = Router({ mergeParams: true });

// ── Autonomous Agent Run ──────────────────────────────────────
router.post("/:id/agent-run", async (req, res) => {
  const params = GetProjectParams.parse(req.params);
  const {
    task,
    autoFix = true,
    autoDeploy = false,
  } = req.body as {
    task: string;
    autoFix?: boolean;
    autoDeploy?: boolean;
  };

  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((r) => r[0]);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  let currentHtml = project.previewHtml || "";

  const agentType: AgentType = classifyIntent(task);
  const agent = AGENT_DEFINITIONS[agentType];
  const baseSystemPrompt = getSystemPrompt(
    project.userMode,
    undefined,
    project.type,
  );
  const systemPrompt = agent.systemPrompt || baseSystemPrompt;

  send({
    type: "agent_selected",
    agentType,
    agentName: agent.nameHe,
    agentEmoji: agent.emoji,
  });

  try {
    // ── Phase 1: Plan ───────────────────────────────────────────
    send({ type: "planning" });

    const planRes = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: `You are a task planner for an AI app builder. Break the given task into 3-5 focused implementation steps.
Return ONLY valid JSON (no markdown, no explanation):
{"steps":[{"id":1,"emoji":"🏗️","title":"Step title in Hebrew","prompt":"Specific English instruction for Claude to implement this step"}]}
Rules: Steps build progressively. First step = foundation. Last step = polish & fixes.`,
      messages: [
        {
          role: "user",
          content: `Task: ${task}\nExisting code: ${currentHtml ? "YES — modify it, keep all existing content" : "NONE — build fresh"}`,
        },
      ],
    });

    let plan: {
      steps: Array<{
        id: number;
        emoji: string;
        title: string;
        prompt: string;
      }>;
    };
    try {
      const planText =
        planRes.content[0].type === "text" ? planRes.content[0].text : "";
      const m = planText.match(/\{[\s\S]*\}/);
      plan = m
        ? JSON.parse(m[0])
        : { steps: [{ id: 1, emoji: "🚀", title: task, prompt: task }] };
    } catch {
      plan = { steps: [{ id: 1, emoji: "🚀", title: task, prompt: task }] };
    }

    send({
      type: "plan",
      steps: plan.steps.map((s) => ({
        id: s.id,
        emoji: s.emoji,
        title: s.title,
      })),
    });

    // ── Phase 2: Execute each step ──────────────────────────────
    for (const step of plan.steps) {
      send({ type: "step_start", stepId: step.id, title: step.title });

      const stepMsg = currentHtml
        ? `[CURRENT APP CODE — START]\n\`\`\`html\n${currentHtml}\n\`\`\`\n[CURRENT APP CODE — END]\n\nIMPORTANT: Use the above as your base. Preserve all existing content.\n\nSTEP ${step.id}: ${step.prompt}`
        : `STEP ${step.id}: ${step.prompt}`;

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: stepMsg }],
      });

      let stepFull = "";
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          stepFull += chunk.delta.text;
          send({
            type: "step_stream",
            stepId: step.id,
            text: chunk.delta.text,
          });
        }
      }

      const htmlMatch = stepFull.match(/```html\s*([\s\S]*?)```/);
      if (htmlMatch) currentHtml = autoCdnInject(htmlMatch[1].trim());
      send({ type: "step_done", stepId: step.id });
    }

    // ── Phase 3: Auto-Fix (up to 2 iterations) ─────────────────
    if (autoFix && currentHtml) {
      for (let i = 0; i < 2; i++) {
        send({ type: "fix_start", iteration: i + 1 });

        const fixRes = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 8000,
          system: `You are a code quality expert. Review the HTML/CSS/JS for bugs, broken features, missing elements, or console errors.
First output JSON with issues found: {"issues":["description1","description2"]}
If NO issues: {"issues":[]}
If issues found, also output the complete fixed HTML in a \`\`\`html block after the JSON.`,
          messages: [
            {
              role: "user",
              content: `Review and fix this code:\n\`\`\`html\n${currentHtml}\n\`\`\``,
            },
          ],
        });

        const fixText =
          fixRes.content[0].type === "text" ? fixRes.content[0].text : "";
        const issM = fixText.match(/\{[\s\S]*?"issues"[\s\S]*?\}/);
        let issues: string[] = [];
        try {
          if (issM) issues = JSON.parse(issM[0]).issues || [];
        } catch {
          /* malformed JSON from LLM — use empty issues list */
        }

        if (issues.length === 0) {
          send({
            type: "fix_done",
            iteration: i + 1,
            fixed: false,
            issues: [],
          });
          break;
        }

        const fixHtml = fixText.match(/```html\s*([\s\S]*?)```/);
        if (fixHtml) {
          currentHtml = autoCdnInject(fixHtml[1].trim());
          send({ type: "fix_done", iteration: i + 1, fixed: true, issues });
        } else {
          send({ type: "fix_done", iteration: i + 1, fixed: false, issues });
          break;
        }
      }
    }

    // ── Save final HTML + keep project_files in sync (atomic) ──
    const htmlValid = isHtmlUsable(currentHtml);

    await db.transaction(async (tx) => {
      if (htmlValid) {
        await tx
          .update(projectsTable)
          .set({ previewHtml: currentHtml, updatedAt: new Date() })
          .where(eq(projectsTable.id, params.id));

        await tx
          .insert(projectFilesTable)
          .values({
            projectId: params.id,
            path: "index.html",
            content: currentHtml,
            language: "html",
            isEntrypoint: true,
          })
          .onConflictDoUpdate({
            target: [projectFilesTable.projectId, projectFilesTable.path],
            set: { content: currentHtml, updatedAt: new Date() },
          });

        // Save snapshot — only if HTML passes quality check
        await tx.insert(projectSnapshotsTable).values({
          projectId: params.id,
          html: currentHtml,
          label: `סוכן: ${task.slice(0, 40)}`,
        });
      } else {
        // Still update timestamp even if HTML is unusable
        await tx
          .update(projectsTable)
          .set({ updatedAt: new Date() })
          .where(eq(projectsTable.id, params.id));
      }

      await tx.insert(projectMessagesTable).values({
        projectId: params.id,
        role: "user" as const,
        content: `[🤖 סוכן אוטונומי] ${task}`,
      });
      await tx.insert(projectMessagesTable).values({
        projectId: params.id,
        role: "assistant" as const,
        content: htmlValid
          ? `הסוכן האוטונומי השלים: "${task}"\n\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nמה תרצה לשפר עכשיו?`
          : `הסוכן ניסה לבצע: "${task}" אך לא הצליח לייצר קוד תקין. נסה שוב עם תיאור מפורט יותר.`,
      });
    });

    send({ type: "save_done" });
    if (htmlValid)
      broadcastProjectUpdate(String(params.id), { previewUpdated: true });

    // ── Phase 4: Optional Deploy ────────────────────────────────
    if (autoDeploy) {
      const ownerUserId = project.userId ?? null;
      const netlifySecrets = ownerUserId
        ? await getIntegrationSecrets(ownerUserId, "netlify")
        : null;
      const netlifyToken = netlifySecrets?.netlifyToken ?? null;

      if (!netlifyToken) {
        send({
          type: "deploy_error",
          message: "Netlify לא מחובר. חבר את Netlify בדף Integrations.",
        });
      } else {
        send({ type: "deploy_start" });
        try {
          const slug = (project.title || "agent-app")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 40);
          const siteRes = await fetch("https://api.netlify.com/api/v1/sites", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${netlifyToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: `${slug}-${Date.now()}` }),
          });
          if (!siteRes.ok) {
            send({
              type: "deploy_error",
              message: "Failed to create Netlify site",
            });
          } else {
            const site = (await siteRes.json()) as {
              id: string;
              ssl_url?: string;
              url?: string;
            };
            const deployZip = await createZip({ "index.html": currentHtml });
            const deployRes = await fetch(
              `https://api.netlify.com/api/v1/sites/${site.id}/deploys`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${netlifyToken}`,
                  "Content-Type": "application/zip",
                },
                body: deployZip,
              },
            );
            if (!deployRes.ok) {
              send({
                type: "deploy_error",
                message: "Netlify deploy rejected",
              });
            } else {
              const deploy = (await deployRes.json()) as {
                deploy_ssl_url?: string;
                ssl_url?: string;
                url?: string;
              };
              send({
                type: "deploy_done",
                url:
                  deploy.deploy_ssl_url ||
                  deploy.ssl_url ||
                  deploy.url ||
                  site.ssl_url ||
                  site.url ||
                  "",
              });
            }
          }
        } catch {
          send({ type: "deploy_error", message: "Deploy failed" });
        }
      } // close else (netlifyToken found)
    } // close if (autoDeploy)

    send({ type: "done", stepsCompleted: plan.steps.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Agent failed";
    send({ type: "error", message: msg });
  }

  res.end();
});

export default router;
