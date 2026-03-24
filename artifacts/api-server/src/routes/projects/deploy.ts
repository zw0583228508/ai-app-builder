import { Router, Request, Response } from "express";
import { getIntegrationSecrets } from "../../services/integrations/vault";
import {
  db,
  projectsTable,
  projectFilesTable,
  deploymentsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import * as esbuild from "esbuild";
import { tmpdir } from "os";
import { join } from "path";
import { mkdir, writeFile, rm } from "fs/promises";
import { createHash } from "crypto";
import { broadcastProjectUpdate } from "../collab";

const router = Router({ mergeParams: true });

// Shared esbuild plugins (duplicated from bundle.ts to avoid circular deps)
const CDN_REDIRECT_PLUGIN: esbuild.Plugin = {
  name: "cdn-redirect",
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith("http://") || args.path.startsWith("https://")) {
        return { path: args.path, external: true };
      }
      return { path: `https://esm.sh/${args.path}`, external: true };
    });
  },
};

const CSS_EMPTY_PLUGIN: esbuild.Plugin = {
  name: "css-empty",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "js" }));
  },
};

function buildAnalyticsScript(projectId: number, apiBase: string): string {
  return `<script>
(function(){
  var pid=${projectId};
  var sid=Math.random().toString(36).slice(2);
  var base="${apiBase}";
  function send(ev,data){fetch(base+"/api/projects/"+pid+"/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:ev,data:data,sessionId:sid,url:location.href,ts:Date.now()})}).catch(function(){});}
  window.addEventListener("error",function(e){fetch(base+"/api/projects/"+pid+"/errors",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:e.message,stack:e.error&&e.error.stack,url:e.filename,sessionId:sid,userAgent:navigator.userAgent})}).catch(function(){});});
  window.addEventListener("load",function(){send("pageview",{referrer:document.referrer});});
  document.addEventListener("click",function(e){var t=e.target;if(t.tagName==="A"||t.tagName==="BUTTON")send("click",{tag:t.tagName,text:(t.innerText||"").slice(0,60)});});
})();
</script>`;
}

function buildOgTags(
  title: string,
  projectId?: number,
  apiBase?: string,
): string {
  const safeTitle = title.replace(/"/g, "&quot;");
  const description = "אפליקציה שנבנתה עם AI App Builder";
  const imageUrl =
    projectId && apiBase
      ? `${apiBase}/api/og-image?projectId=${projectId}`
      : "";
  return [
    `<meta property="og:title" content="${safeTitle}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:type" content="website">`,
    imageUrl ? `<meta property="og:image" content="${imageUrl}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${safeTitle}">`,
    imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHtmlShell(
  bundledJs: string,
  cssContent: string,
  title: string,
  projectId?: number,
  apiBase?: string,
): string {
  const analytics =
    projectId && apiBase ? buildAnalyticsScript(projectId, apiBase) : "";
  const ogTags = buildOgTags(title, projectId, apiBase);
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
${ogTags}
<script src="https://cdn.tailwindcss.com"></script>
${analytics}
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,sans-serif}
${cssContent}
</style>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18",
    "react/": "https://esm.sh/react@18/",
    "react-dom": "https://esm.sh/react-dom@18",
    "react-dom/": "https://esm.sh/react-dom@18/",
    "react-dom/client": "https://esm.sh/react-dom@18/client",
    "react/jsx-runtime": "https://esm.sh/react@18/jsx-runtime",
    "react/jsx-dev-runtime": "https://esm.sh/react@18/jsx-dev-runtime"
  }
}
</script>
</head>
<body>
<div id="root"></div>
<script type="module">
${bundledJs}
</script>
</body>
</html>`;
}

// Zip helper — creates a minimal ZIP buffer from a map of filename→content
export async function createZip(
  files: Record<string, string | Buffer>,
): Promise<Buffer> {
  // Use simple ZIP format without compression (stored mode)
  const parts: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, "utf-8");
    const nameBuffer = Buffer.from(name, "utf-8");
    const now = new Date();
    const dosTime =
      (now.getHours() << 11) |
      (now.getMinutes() << 5) |
      Math.floor(now.getSeconds() / 2);
    const dosDate =
      ((now.getFullYear() - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate();
    const crc = crc32(data);

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // compression: stored
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18); // compressed
    localHeader.writeUInt32LE(data.length, 22); // uncompressed
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
    nameBuffer.copy(localHeader, 30);

    // Central directory entry
    const centralEntry = Buffer.alloc(46 + nameBuffer.length);
    centralEntry.writeUInt32LE(0x02014b50, 0); // signature
    centralEntry.writeUInt16LE(20, 4); // version made by
    centralEntry.writeUInt16LE(20, 6); // version needed
    centralEntry.writeUInt16LE(0, 8); // flags
    centralEntry.writeUInt16LE(0, 10); // compression
    centralEntry.writeUInt16LE(dosTime, 12);
    centralEntry.writeUInt16LE(dosDate, 14);
    centralEntry.writeUInt32LE(crc, 16);
    centralEntry.writeUInt32LE(data.length, 20);
    centralEntry.writeUInt32LE(data.length, 24);
    centralEntry.writeUInt16LE(nameBuffer.length, 28);
    centralEntry.writeUInt16LE(0, 30); // extra
    centralEntry.writeUInt16LE(0, 32); // comment
    centralEntry.writeUInt16LE(0, 34); // disk start
    centralEntry.writeUInt16LE(0, 36); // internal attr
    centralEntry.writeUInt32LE(0, 38); // external attr
    centralEntry.writeUInt32LE(offset, 42); // local header offset
    nameBuffer.copy(centralEntry, 46);

    parts.push(localHeader, data);
    centralDirectory.push(centralEntry);
    offset += localHeader.length + data.length;
  }

  const centralDirBuffer = Buffer.concat(centralDirectory);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with start
  eocd.writeUInt16LE(centralDirectory.length, 8); // entries on disk
  eocd.writeUInt16LE(centralDirectory.length, 10); // total entries
  eocd.writeUInt32LE(centralDirBuffer.length, 12); // central dir size
  eocd.writeUInt32LE(offset, 16); // central dir offset
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...parts, centralDirBuffer, eocd]);
}

// CRC-32 implementation
function crc32(buf: Buffer): number {
  const table = makeCrc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crc32Table: Uint32Array | null = null;
function makeCrc32Table(): Uint32Array {
  if (_crc32Table) return _crc32Table;
  _crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crc32Table[i] = c;
  }
  return _crc32Table;
}

// GET /api/projects/:id/deployments — list deployment history
router.get("/", async (req: Request, res: Response) => {
  const projectId = Number((req.params as Record<string, string>).id);
  if (!projectId) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const deployments = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId))
    .orderBy(desc(deploymentsTable.createdAt))
    .limit(20);

  res.json({ deployments });
});

// POST /api/projects/:id/deploy — trigger a new deployment
router.post("/", async (req: Request, res: Response) => {
  const projectId = Number((req.params as Record<string, string>).id);
  if (!projectId) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const { provider = "netlify" } = req.body as { provider?: string };
  const userId = (req as any).user
    ? ((req as any).user as { id: string }).id
    : null;

  if (!userId) {
    res.status(401).json({ error: "נדרש להתחבר" });
    return;
  }

  // Fetch token from encrypted vault — never accept from client
  const secrets = await getIntegrationSecrets(
    userId,
    provider === "vercel" ? "vercel" : "netlify",
  );
  const netlifyToken = secrets?.netlifyToken ?? secrets?.token ?? null;
  const vercelToken = secrets?.vercelToken ?? secrets?.token ?? null;

  if (provider === "netlify" && !netlifyToken) {
    res
      .status(400)
      .json({ error: "Netlify token is required. Add it in Integrations." });
    return;
  }
  if (provider === "vercel" && !vercelToken) {
    res
      .status(400)
      .json({ error: "Vercel token is required. Add it in Integrations." });
    return;
  }

  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .then((r) => r[0]);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Create a pending deployment record
  const [deployment] = await db
    .insert(deploymentsTable)
    .values({
      projectId,
      provider,
      status: "building",
    })
    .returning();

  // Build and deploy async — respond immediately with the pending record
  const deployFn =
    provider === "vercel"
      ? deployVercelInBackground(deployment.id, project, vercelToken || "")
      : deployInBackground(deployment.id, project, netlifyToken || "");

  deployFn.catch(async (err) => {
    await db
      .update(deploymentsTable)
      .set({ status: "failed", error: String(err), updatedAt: new Date() })
      .where(eq(deploymentsTable.id, deployment.id));
    broadcastProjectUpdate(String(projectId), { deploymentStatus: "failed" });
  });

  res.status(202).json({ deployment });
});

// POST /api/projects/:id/deployments/:deployId/domain — add custom domain
router.post("/:deployId/domain", async (req: Request, res: Response) => {
  const deployId = Number((req.params as Record<string, string>).deployId);
  const { domain, provider } = req.body as {
    domain?: string;
    provider?: string;
  };
  if (!domain?.trim()) {
    res.status(400).json({ error: "domain required" });
    return;
  }

  const userId = (req as any).user
    ? ((req as any).user as { id: string }).id
    : null;
  if (!userId) {
    res.status(401).json({ error: "נדרש להתחבר" });
    return;
  }

  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.id, deployId));
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  const prov = provider || deployment.provider;

  // Fetch token from vault — never accept from client
  const secrets = await getIntegrationSecrets(userId, prov);
  const netlifyToken = secrets?.netlifyToken ?? secrets?.token ?? null;
  const vercelToken = secrets?.vercelToken ?? secrets?.token ?? null;

  if (prov === "netlify" && netlifyToken && deployment.siteId) {
    const r = await fetch(
      `https://api.netlify.com/api/v1/sites/${deployment.siteId}/domain_aliases`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain }),
      },
    );
    if (!r.ok) {
      const e = (await r.json().catch(() => ({}))) as Record<string, string>;
      res.status(400).json({ error: e["message"] || "Netlify domain error" });
      return;
    }
    res.json({ ok: true, domain });
  } else if (prov === "vercel" && vercelToken && deployment.deployId) {
    const r = await fetch(
      `https://api.vercel.com/v9/projects/${deployment.siteId}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      },
    );
    if (!r.ok) {
      const e = (await r.json().catch(() => ({}))) as {
        error?: { message: string };
      };
      res
        .status(400)
        .json({ error: e.error?.message || "Vercel domain error" });
      return;
    }
    res.json({ ok: true, domain });
  } else {
    res
      .status(400)
      .json({ error: "Cannot add domain — missing token or site ID" });
  }
});

// GET /api/projects/:id/deployments/:deployId — poll status
router.get("/:deployId", async (req: Request, res: Response) => {
  const params = req.params as Record<string, string>;
  const deployId = Number(params.deployId);
  if (!deployId) {
    res.status(400).json({ error: "Invalid deploy id" });
    return;
  }

  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.id, deployId));
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  res.json({ deployment });
});

const API_BASE = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "";

async function deployInBackground(
  deploymentId: number,
  project: {
    id: number;
    title: string | null;
    previewHtml: string | null;
    stack: string | null;
  },
  netlifyToken: string,
): Promise<void> {
  const isReact = ["react", "nextjs", "vue", "svelte"].includes(
    project.stack ?? "",
  );
  let zipBuffer: Buffer;

  if (isReact) {
    // Build React project with esbuild
    const files = await db
      .select()
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, project.id));

    if (!files.length) throw new Error("No files to deploy");

    const tmpDir = join(tmpdir(), `deploy-${project.id}-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });

    try {
      for (const file of files) {
        const rel = file.path.startsWith("/") ? file.path.slice(1) : file.path;
        const filePath = join(tmpDir, rel);
        const dir = filePath.substring(0, filePath.lastIndexOf("/"));
        if (dir && dir !== tmpDir) await mkdir(dir, { recursive: true });
        await writeFile(filePath, file.content, "utf-8");
      }

      const entryFile =
        files.find((f) => f.isEntrypoint) ||
        files.find((f) => /index\.(jsx?|tsx?)$/.test(f.path)) ||
        files.find((f) => /main\.(jsx?|tsx?)$/.test(f.path)) ||
        files[0];

      const rel = entryFile.path.startsWith("/")
        ? entryFile.path.slice(1)
        : entryFile.path;
      const entryPath = join(tmpDir, rel);

      const result = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        write: false,
        format: "esm",
        jsx: "automatic",
        loader: {
          ".js": "jsx",
          ".ts": "tsx",
          ".jsx": "jsx",
          ".tsx": "tsx",
          ".svg": "text",
          ".png": "dataurl",
          ".jpg": "dataurl",
        },
        plugins: [CSS_EMPTY_PLUGIN, CDN_REDIRECT_PLUGIN],
        define: {
          "process.env.NODE_ENV": '"production"',
          "process.env": "{}",
          process: '{"env":{"NODE_ENV":"production"}}',
        },
        minify: true,
      });

      const bundledJs = result.outputFiles[0]?.text ?? "";
      const cssContent = files
        .filter((f) => f.path.endsWith(".css"))
        .map((f) => f.content)
        .join("\n");
      const html = buildHtmlShell(
        bundledJs,
        cssContent,
        project.title ?? "App",
        project.id,
        API_BASE,
      );

      zipBuffer = await createZip({ "index.html": html });
    } finally {
      rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  } else {
    // HTML project — zip the previewHtml, injecting OG meta tags
    let html =
      project.previewHtml || "<html><body><h1>Empty project</h1></body></html>";
    const ogTags = buildOgTags(project.title ?? "App", project.id, API_BASE);
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${ogTags}\n</head>`);
    } else if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>\n${ogTags}`);
    }
    zipBuffer = await createZip({ "index.html": html });
  }

  // Deploy to Netlify
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
    body: JSON.stringify({ name: `${slug}-${deploymentId}` }),
  });

  if (!siteRes.ok) {
    const err = (await siteRes.json().catch(() => ({}))) as Record<
      string,
      string
    >;
    throw new Error(err["message"] || "Failed to create Netlify site");
  }

  const site = (await siteRes.json()) as {
    id: string;
    ssl_url: string;
    url: string;
  };

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
    throw new Error(err["message"] || "Netlify deploy failed");
  }

  const deploy = (await deployRes.json()) as {
    id: string;
    deploy_ssl_url?: string;
    ssl_url?: string;
  };
  const liveUrl =
    deploy.deploy_ssl_url || deploy.ssl_url || site.ssl_url || site.url;

  await db
    .update(deploymentsTable)
    .set({
      status: "live",
      url: liveUrl,
      siteId: site.id,
      deployId: deploy.id,
      updatedAt: new Date(),
    })
    .where(eq(deploymentsTable.id, deploymentId));

  broadcastProjectUpdate(String(project.id), {
    deploymentStatus: "live",
    deploymentUrl: liveUrl,
  });
}

async function deployVercelInBackground(
  deploymentId: number,
  project: {
    id: number;
    title: string | null;
    previewHtml: string | null;
    stack: string | null;
  },
  vercelToken: string,
): Promise<void> {
  const isReact = ["react", "nextjs", "vue", "svelte"].includes(
    project.stack ?? "",
  );
  let htmlContent = "";

  if (isReact) {
    const files = await db
      .select()
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, project.id));
    if (!files.length) throw new Error("No files to deploy");
    const tmpDir = join(tmpdir(), `vdeploy-${project.id}-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    try {
      for (const file of files) {
        const rel = file.path.startsWith("/") ? file.path.slice(1) : file.path;
        const filePath = join(tmpDir, rel);
        const dir = filePath.substring(0, filePath.lastIndexOf("/"));
        if (dir && dir !== tmpDir) await mkdir(dir, { recursive: true });
        await writeFile(filePath, file.content, "utf-8");
      }
      const entryFile =
        files.find((f) => f.isEntrypoint) ||
        files.find((f) => /index\.(jsx?|tsx?)$/.test(f.path)) ||
        files[0];
      const rel = entryFile.path.startsWith("/")
        ? entryFile.path.slice(1)
        : entryFile.path;
      const result = await esbuild.build({
        entryPoints: [join(tmpDir, rel)],
        bundle: true,
        write: false,
        format: "esm",
        jsx: "automatic",
        loader: {
          ".js": "jsx",
          ".ts": "tsx",
          ".jsx": "jsx",
          ".tsx": "tsx",
          ".svg": "text",
          ".png": "dataurl",
          ".jpg": "dataurl",
        },
        plugins: [CSS_EMPTY_PLUGIN, CDN_REDIRECT_PLUGIN],
        define: {
          "process.env.NODE_ENV": '"production"',
          "process.env": "{}",
          process: '{"env":{"NODE_ENV":"production"}}',
        },
        minify: true,
      });
      const bundledJs = result.outputFiles[0]?.text ?? "";
      const cssContent = files
        .filter((f) => f.path.endsWith(".css"))
        .map((f) => f.content)
        .join("\n");
      htmlContent = buildHtmlShell(
        bundledJs,
        cssContent,
        project.title ?? "App",
        project.id,
        API_BASE,
      );
    } finally {
      rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  } else {
    htmlContent =
      project.previewHtml || "<html><body><h1>Empty project</h1></body></html>";
  }

  const slug = (project.title || "builder-app")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const projectName = `${slug}-${deploymentId}`;

  // Create Vercel project
  const projRes = await fetch("https://api.vercel.com/v9/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: projectName, framework: null }),
  });
  if (!projRes.ok) {
    const e = (await projRes.json().catch(() => ({}))) as {
      error?: { message: string };
    };
    throw new Error(e.error?.message || "Failed to create Vercel project");
  }
  const vProject = (await projRes.json()) as { id: string; name: string };

  // Deploy files to Vercel
  const fileHash = createHash("sha1").update(htmlContent).digest("hex");
  const uploadRes = await fetch(`https://api.vercel.com/v2/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": fileHash,
    },
    body: Buffer.from(htmlContent),
  });
  if (!uploadRes.ok && uploadRes.status !== 409) {
    throw new Error("Vercel file upload failed");
  }

  const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      files: [
        {
          file: "index.html",
          sha: fileHash,
          size: Buffer.byteLength(htmlContent),
        },
      ],
      projectSettings: { framework: null },
      target: "production",
    }),
  });
  if (!deployRes.ok) {
    const e = (await deployRes.json().catch(() => ({}))) as {
      error?: { message: string };
    };
    throw new Error(e.error?.message || "Vercel deploy failed");
  }
  const vDeploy = (await deployRes.json()) as {
    id: string;
    url: string;
    readyState?: string;
  };
  const liveUrl = `https://${vDeploy.url}`;

  await db
    .update(deploymentsTable)
    .set({
      status: "live",
      url: liveUrl,
      siteId: vProject.id,
      deployId: vDeploy.id,
      updatedAt: new Date(),
    })
    .where(eq(deploymentsTable.id, deploymentId));

  broadcastProjectUpdate(String(project.id), {
    deploymentStatus: "live",
    deploymentUrl: liveUrl,
  });
}

export default router;
