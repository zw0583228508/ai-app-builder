import { getIntegrationSecrets } from "../../services/integrations/vault";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import bundleRouter from "./bundle";
import storageRouter from "./storage";
import deployRouter, { createZip } from "./deploy";
import usageRouter from "./usage";
import commentsRouter from "./comments";
import webhooksRouter from "./webhooks";
import errorsRouter from "./errors";
import performanceRouter from "./performance";
import plannerRouter from "./planner";
import deployBrainRouter from "./deploy-brain";
import qaRouter from "./qa";
import costRouter from "./cost";
import saasGeneratorRouter from "./saas-generator";
import { githubSyncRouter } from "./github-sync";
import messagesRouter from "./messages";
import previewRouter from "./preview-routes";
import snapshotsRouter from "./snapshots";
import shareRouter from "./share";
import forkRouter from "./fork";
import aiToolsRouter from "./ai-tools";
import analyticsRouter from "./analytics";
import agentRunRouter from "./agent-run";
import filesRouter from "./files";
import databaseRouter from "./database";
import secretsRouter from "./secrets";
import reviewRouter from "./review";
import promptEnhanceRouter from "./prompt-enhance";
import orchestrateRouter from "./orchestrate";
import createProjectRouter from "./create-project";
import getProjectRouter from "./get-project";
import updateProjectRouter from "./update-project";
import deleteProjectRouter from "./delete-project";
import { GetProjectParams } from "@workspace/api-zod";
import { logAudit } from "../../services/audit-log";
export { getProjectSecretKeys, getProjectSecrets } from "./helpers";

const router: IRouter = Router();

// ── Enforce project ownership on all /:id routes ──────────────────────────────
router.param(
  "id",
  async (req: Request, res: Response, next: NextFunction, rawId: string) => {
    if (req.method === "OPTIONS") return next();
    if (req.path.endsWith("/analytics/event")) return next();

    const projectId = parseInt(rawId, 10);
    if (isNaN(projectId)) return next();

    const [row] = await db
      .select({ userId: projectsTable.userId })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .catch(() => [null as null]);

    if (!row) {
      res.status(404).json({ error: "פרויקט לא נמצא" });
      return;
    }

    if (row.userId === null) {
      // Ownerless project — anonymous access is not allowed.
      // Authenticated users may still access them (e.g. admin recovery path).
      if (!req.user) {
        res.status(401).json({ error: "נדרש להתחבר" });
        return;
      }
      return next();
    }

    if (!req.user) {
      res.status(401).json({ error: "נדרש להתחבר" });
      return;
    }
    if (row.userId !== req.user.id) {
      res.status(403).json({ error: "אין הרשאה לפרויקט זה" });
      return;
    }
    next();
  },
);

// ══════════════════════════════════════════════════════════════
// CRUD — each in its own module (Phase 3 modularization)
// ══════════════════════════════════════════════════════════════
router.use("/", createProjectRouter);
router.use("/", getProjectRouter);
router.use("/", updateProjectRouter);
router.use("/", deleteProjectRouter);

// ── Netlify legacy deploy (direct token deploy) ───────────────
router.post("/:id/netlify-deploy", async (req, res) => {
  const params = GetProjectParams.parse(req.params);
  const { zipBase64 } = req.body as { zipBase64?: string };

  const userId = (req as any).user
    ? ((req as any).user as { id: string }).id
    : null;
  if (!userId) {
    res.status(401).json({ error: "נדרש להתחבר" });
    return;
  }

  // Fetch from vault — never accept token from client
  const vaultSecrets = await getIntegrationSecrets(userId, "netlify");
  const netlifyToken =
    vaultSecrets?.netlifyToken ?? vaultSecrets?.token ?? null;

  if (!netlifyToken) {
    res.status(400).json({ error: "Netlify token required" });
    return;
  }

  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((rows) => rows[0]);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (!project.previewHtml && !zipBase64) {
    res.status(400).json({ error: "No code to deploy" });
    return;
  }

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
    body: JSON.stringify({ name: `${slug}-${Date.now()}` }),
  });

  if (!siteRes.ok) {
    const err = (await siteRes.json().catch(() => ({}))) as Record<
      string,
      string
    >;
    res
      .status(502)
      .json({ error: err["message"] || "Failed to create Netlify site" });
    return;
  }

  const site = (await siteRes.json()) as {
    id: string;
    ssl_url: string;
    url: string;
  };

  let zipBuffer: Buffer;
  if (zipBase64) {
    const buf = Buffer.from(zipBase64, "base64");
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
      res.status(400).json({ error: "Invalid ZIP format" });
      return;
    }
    zipBuffer = buf;
  } else {
    zipBuffer = await createZip({
      "index.html": project.previewHtml as string,
    });
  }

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
    const err = (await deployRes.json().catch(() => ({}))) as Record<
      string,
      string
    >;
    res.status(502).json({ error: err["message"] || "Deploy failed" });
    return;
  }

  const deploy = (await deployRes.json()) as {
    deploy_ssl_url?: string;
    ssl_url?: string;
  };
  const liveUrl =
    deploy.deploy_ssl_url || deploy.ssl_url || site.ssl_url || site.url;

  logAudit({
    action: "deploy.success",
    userId: (req as any).user?.id ?? null,
    projectId: params.id,
    meta: { provider: "netlify", siteId: site.id, url: liveUrl },
  });

  res.json({ url: liveUrl, siteId: site.id });
});

// ── GitHub Gist proxy ─────────────────────────────────────────
router.post("/:id/github-gist", async (req, res) => {
  const { description, html } = req.body as {
    description?: string;
    html?: string;
  };

  if (!html?.trim()) {
    res.status(400).json({ error: "html required" });
    return;
  }

  const userId = (req as any).user
    ? ((req as any).user as { id: string }).id
    : null;
  if (!userId) {
    res.status(401).json({ error: "נדרש להתחבר" });
    return;
  }

  const vaultSecrets = await getIntegrationSecrets(userId, "github");
  const githubToken = vaultSecrets?.githubToken ?? vaultSecrets?.token ?? null;
  if (!githubToken) {
    res
      .status(400)
      .json({ error: "חסר GitHub Token — חבר GitHub בדף Integrations" });
    return;
  }

  const r = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      description: description || "Builder AI — Generated App",
      public: true,
      files: { "index.html": { content: html } },
    }),
  });

  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { message?: string };
    res.status(r.status).json({ error: err.message || "GitHub Gist error" });
    return;
  }

  const gist = (await r.json()) as { html_url: string };
  res.json({ html_url: gist.html_url });
});

// ══════════════════════════════════════════════════════════════
// FEATURE ROUTERS — extracted route modules (Phase 3)
// ══════════════════════════════════════════════════════════════
router.use("/", messagesRouter);
router.use("/", previewRouter);
router.use("/", snapshotsRouter);
router.use("/", shareRouter);
router.use("/", forkRouter);
router.use("/", aiToolsRouter);
router.use("/", analyticsRouter);
router.use("/", agentRunRouter);
router.use("/", filesRouter);
router.use("/", databaseRouter);
router.use("/", secretsRouter);
router.use("/", reviewRouter);
router.use("/", promptEnhanceRouter);
router.use("/", orchestrateRouter);

// ── React/Next.js esbuild preview ──────────────────────────────
router.use("/", bundleRouter);

// ── Storage ────────────────────────────────────────────────────
router.use("/:id/storage", storageRouter);

// ── Deployments ────────────────────────────────────────────────
router.use("/:id/deployments", deployRouter);

// ── Usage ──────────────────────────────────────────────────────
router.use("/:id/usage", usageRouter);
router.use("/", commentsRouter);
router.use("/:id/webhooks", webhooksRouter);
router.use("/:id/errors", errorsRouter);
router.use("/:id/performance", performanceRouter);

// ── GitHub Sync ────────────────────────────────────────────────
router.use("/:id/github", githubSyncRouter);

// ── Advanced AI Systems ────────────────────────────────────────
router.use("/:id/plan", plannerRouter);
router.use("/:id/deploy-brain", deployBrainRouter);
router.use("/:id/qa", qaRouter);
router.use("/:id/cost", costRouter);
router.use("/:id/saas-generator", saasGeneratorRouter);

export default router;
