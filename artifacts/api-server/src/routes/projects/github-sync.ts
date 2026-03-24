import { Router } from "express";
import { db, projectsTable, projectFilesTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { getIntegrationSecrets } from "../../services/integrations/vault";

const router = Router({ mergeParams: true });

export interface GitHubSyncResult {
  repoUrl: string;
  repoName: string;
  owner: string;
  filesSync: number;
  isNew: boolean;
}

async function getGitHubUser(token: string): Promise<{ login: string }> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok)
    throw new Error("GitHub Token לא תקין — חבר מחדש בדף Integrations");
  return res.json() as Promise<{ login: string }>;
}

async function ensureRepo(
  token: string,
  owner: string,
  repoName: string,
): Promise<{ htmlUrl: string; isNew: boolean }> {
  const checkRes = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );
  if (checkRes.ok) {
    const r = (await checkRes.json()) as { html_url: string };
    return { htmlUrl: r.html_url, isNew: false };
  }

  const createRes = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: repoName,
      private: false,
      auto_init: true,
      description: "Built with AI App Builder",
    }),
  });

  if (!createRes.ok) {
    const err = (await createRes.json().catch(() => ({}))) as Record<
      string,
      string
    >;
    throw new Error(
      `Failed to create repo: ${err["message"] ?? createRes.status}`,
    );
  }

  const r = (await createRes.json()) as { html_url: string };
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return { htmlUrl: r.html_url, isNew: true };
}

async function upsertFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
): Promise<void> {
  let sha: string | undefined;
  const getRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha: string };
    sha = existing.sha;
  }

  const body: Record<string, unknown> = {
    message: `Update ${path} via AI App Builder`,
    content: Buffer.from(content, "utf-8").toString("base64"),
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!putRes.ok) {
    const err = (await putRes.json().catch(() => ({}))) as Record<
      string,
      string
    >;
    throw new Error(
      `Failed to push ${path}: ${err["message"] ?? putRes.status}`,
    );
  }
}

// Upload files in batches to avoid hammering the GitHub API
async function uploadFilesBatched(
  token: string,
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  batchSize = 4,
): Promise<number> {
  let count = 0;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map((f) => upsertFile(token, owner, repo, f.path, f.content)),
    );
    count += batch.length;
  }
  return count;
}

function buildReadme(projectTitle: string, repoName: string): string {
  return `# ${projectTitle || repoName}

Built with [AI App Builder](https://replit.com).

## Getting started

Open \`index.html\` in a browser, or run a local dev server:

\`\`\`bash
npx serve .
\`\`\`
`;
}

export async function syncProjectToGitHub(
  projectId: number,
  githubToken: string,
  customRepoName?: string,
): Promise<GitHubSyncResult> {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) throw new Error("Project not found");

  const user = await getGitHubUser(githubToken);

  const repoName =
    (customRepoName || project.title || `project-${projectId}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || `project-${projectId}`;

  const { htmlUrl, isNew } = await ensureRepo(
    githubToken,
    user.login,
    repoName,
  );

  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));

  const hasOnlyIndexHtml = files.length === 1 && files[0].path === "index.html";

  const toUpload: { path: string; content: string }[] = [];

  if (files.length > 0 && !hasOnlyIndexHtml) {
    for (const file of files) {
      toUpload.push({ path: file.path, content: file.content });
    }
  } else if (project.previewHtml) {
    toUpload.push({ path: "index.html", content: project.previewHtml });
  } else if (files.length > 0) {
    toUpload.push({ path: files[0].path, content: files[0].content });
  } else {
    throw new Error("אין קוד לסנכרן — בנה את הפרויקט קודם");
  }

  // Add a README for new repos
  if (isNew) {
    toUpload.push({
      path: "README.md",
      content: buildReadme(project.title ?? repoName, repoName),
    });
  }

  const filesSynced = await uploadFilesBatched(
    githubToken,
    user.login,
    repoName,
    toUpload,
  );

  // Persist GitHub repo info to project record
  await db
    .update(projectsTable)
    .set({ githubRepoUrl: htmlUrl, githubRepoName: repoName })
    .where(eq(projectsTable.id, projectId));

  return {
    repoUrl: htmlUrl,
    repoName,
    owner: user.login,
    filesSync: filesSynced,
    isNew,
  };
}

router.post("/sync", async (req, res) => {
  const projectId = parseInt((req.params as { id: string }).id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const { repoName } = req.body as { repoName?: string };

  const userId = (req as Express.Request & { user?: { id: string } }).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Fetch GitHub token from encrypted vault — never accept from client
  const vaultSecrets = await getIntegrationSecrets(userId, "github");
  const githubToken = vaultSecrets?.githubToken ?? vaultSecrets?.token ?? null;

  if (!githubToken) {
    res
      .status(400)
      .json({ error: "חסר GitHub Token — חבר GitHub בדף Integrations" });
    return;
  }

  const [project] = await db
    .select({ id: projectsTable.id, userId: projectsTable.userId })
    .from(projectsTable)
    .where(
      and(eq(projectsTable.id, projectId), isNull(projectsTable.deletedAt)),
    );
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (project.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const result = await syncProjectToGitHub(projectId, githubToken, repoName);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/status", async (req, res) => {
  const projectId = parseInt((req.params as { id: string }).id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [project] = await db
    .select({
      githubRepoUrl: projectsTable.githubRepoUrl,
      githubRepoName: projectsTable.githubRepoName,
    })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({
    connected: !!project.githubRepoUrl,
    repo: project.githubRepoUrl
      ? { url: project.githubRepoUrl, name: project.githubRepoName }
      : null,
  });
});

export { router as githubSyncRouter };
