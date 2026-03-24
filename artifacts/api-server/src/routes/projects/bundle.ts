import { Router } from "express";
import { db, projectsTable, projectFilesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import * as esbuild from "esbuild";
import { tmpdir } from "os";
import { join } from "path";
import { mkdir, writeFile, rm } from "fs/promises";
import { createHash } from "crypto";
import { getProjectSecrets } from "./helpers";

// ── CODE-03: Safe env build — only expose frontend-safe secret keys ───────────
// Allowed prefixes for frontend injection. Server-side secrets (DATABASE_URL,
// ANTHROPIC_API_KEY, etc.) are never included in the browser bundle.
const FRONTEND_SAFE_PREFIXES = [
  "VITE_",
  "REACT_APP_",
  "NEXT_PUBLIC_",
  "PUBLIC_",
];

async function buildSafeEnv(
  projectId: number,
): Promise<Record<string, string>> {
  const secrets = await getProjectSecrets(projectId, "dev");
  const safeEntries = Object.entries(secrets).filter(([key]) =>
    FRONTEND_SAFE_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
  return Object.fromEntries(safeEntries);
}

/** Build the esbuild `define` object — injects project secrets safely. */
function buildDefine(safeEnv: Record<string, string>): Record<string, string> {
  const envObj: Record<string, string> = { NODE_ENV: "development" };
  for (const [key, val] of Object.entries(safeEnv)) {
    envObj[key] = val;
  }
  const envJson = JSON.stringify(envObj);
  const define: Record<string, string> = {
    "process.env.NODE_ENV": '"development"',
    "process.env": envJson,
    process: `{"env":${envJson}}`,
  };
  // Also inject each key individually so import.meta.env.VITE_XXX works
  for (const [key, val] of Object.entries(safeEnv)) {
    define[`import.meta.env.${key}`] = JSON.stringify(val);
  }
  return define;
}

const router = Router();

// ── Build cache ────────────────────────────────────────────────
// Keyed by projectId → { hash, html, builtAt }
// Cleared whenever files change (via invalidateBundleCache exported below)
interface CacheEntry {
  hash: string;
  html: string;
  builtAt: number;
}
const bundleCache = new Map<number, CacheEntry>();
const MAX_CACHE_ENTRIES = 50;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function invalidateBundleCache(projectId: number) {
  bundleCache.delete(projectId);
}

function hashFiles(files: { path: string; content: string }[]): string {
  const h = createHash("sha256");
  for (const f of files) {
    h.update(f.path + "\0" + f.content + "\n");
  }
  return h.digest("hex").slice(0, 16);
}

function evictCache() {
  if (bundleCache.size <= MAX_CACHE_ENTRIES) return;
  // Remove oldest entries
  const sorted = [...bundleCache.entries()].sort(
    (a, b) => a[1].builtAt - b[1].builtAt,
  );
  for (const [id] of sorted.slice(0, 10)) bundleCache.delete(id);
}

// ── esbuild plugins ──────────────────────────────────────────
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
    build.onLoad({ filter: /\.css$/ }, () => ({
      contents: "",
      loader: "js",
    }));
  },
};

router.get("/:id/bundle", async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
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

  if (project.stack !== "react" && project.stack !== "nextjs") {
    res
      .status(400)
      .json({ error: "Bundle endpoint is only for React/Next.js projects" });
    return;
  }

  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId))
    .orderBy(asc(projectFilesTable.path));

  if (!files.length) {
    res.setHeader("Content-Type", "text/html");
    res.send(generateEmptyPage());
    return;
  }

  const entryFile =
    files.find((f) => f.isEntrypoint) ||
    files.find((f) => /index\.(jsx?|tsx?)$/.test(f.path)) ||
    files.find((f) => /main\.(jsx?|tsx?)$/.test(f.path)) ||
    files.find((f) => /app\.(jsx?|tsx?)$/i.test(f.path));

  if (!entryFile) {
    res.setHeader("Content-Type", "text/html");
    res.send(
      generateErrorPage(
        "לא נמצא קובץ כניסה (main.tsx / index.tsx). נסה לשלוח הודעה נוספת לסוכן.",
      ),
    );
    return;
  }

  // ── Cache hit check ──
  const fileHash = hashFiles(
    files.map((f) => ({ path: f.path, content: f.content })),
  );
  const cached = bundleCache.get(projectId);
  if (
    cached &&
    cached.hash === fileHash &&
    Date.now() - cached.builtAt < CACHE_TTL_MS
  ) {
    res.setHeader("Content-Type", "text/html");
    res.setHeader("X-Bundle-Cache", "HIT");
    res.send(cached.html);
    return;
  }

  // Load only frontend-safe secrets (VITE_*, REACT_APP_*, etc.)
  const safeEnv = await buildSafeEnv(projectId).catch(() => ({}));

  const tmpDir = join(tmpdir(), `proj-${projectId}-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });

  try {
    for (const file of files) {
      const rel = file.path.startsWith("/") ? file.path.slice(1) : file.path;
      const filePath = join(tmpDir, rel);
      const dir = filePath.substring(0, filePath.lastIndexOf("/"));
      if (dir && dir !== tmpDir) await mkdir(dir, { recursive: true });
      await writeFile(filePath, file.content, "utf-8");
    }

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
        ".gif": "dataurl",
        ".webp": "dataurl",
      },
      plugins: [CSS_EMPTY_PLUGIN, CDN_REDIRECT_PLUGIN],
      define: buildDefine(safeEnv),
    });

    const bundledJs = result.outputFiles[0]?.text ?? "";

    const cssFiles = files.filter(
      (f) => f.path.endsWith(".css") && !f.path.includes("tailwind"),
    );
    const cssContent = cssFiles.map((f) => f.content).join("\n");

    const html = generateHtmlShell(
      bundledJs,
      cssContent,
      project.title ?? "App",
    );

    // ── Store in cache ──
    evictCache();
    bundleCache.set(projectId, { hash: fileHash, html, builtAt: Date.now() });

    res.setHeader("Content-Type", "text/html");
    res.setHeader("X-Bundle-Cache", "MISS");
    res.send(html);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.setHeader("Content-Type", "text/html");
    res.send(generateErrorPage(msg));
  } finally {
    rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

function generateHtmlShell(
  bundledJs: string,
  cssContent: string,
  title: string,
): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<script src="https://cdn.tailwindcss.com"></script>
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

function generateEmptyPage(): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"><style>
body{margin:0;background:#0d0d0d;color:#666;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;flex-direction:column;gap:12px}
.icon{font-size:48px;opacity:.5}
p{font-size:14px;margin:0}
</style></head>
<body>
<div class="icon">🧩</div>
<p>שוחח עם ה-AI כדי ליצור את הפרויקט</p>
</body></html>`;
}

function generateErrorPage(error: string): string {
  const escaped = error
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"><style>
body{margin:0;background:#0a0a0a;color:#ff6b6b;font-family:monospace;padding:24px}
pre{background:#1a0a0a;padding:16px;border-radius:8px;border:1px solid #ff3b3b44;overflow:auto;font-size:12px;line-height:1.7;white-space:pre-wrap;color:#ffaaaa}
h2{color:#ff8888;margin:0 0 12px;font-size:16px}
.icon{font-size:28px;margin-bottom:8px}
.tip{color:#888;font-size:11px;margin-top:16px;font-family:system-ui;background:#111;padding:12px;border-radius:6px;border:1px solid #333}
</style></head>
<body>
<div class="icon">⚠️</div>
<h2>שגיאת בנייה</h2>
<pre>${escaped}</pre>
<div class="tip">💡 נסה לשלוח הודעה לסוכן: "תקן את השגיאות בקוד" — הסוכן יתקן אוטומטית.</div>
</body></html>`;
}

export default router;
