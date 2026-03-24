import { Router, type IRouter } from "express";
import { db, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function svgOgImage(title: string, description: string): string {
  const safe = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const titleLines = chunkText(safe(title), 28);
  const descLines = chunkText(safe(description || ""), 40);

  const titleY = 210 + titleLines.length * 0 - (titleLines.length - 1) * 20;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="#111118"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0891b2" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  
  <!-- Glow orb -->
  <circle cx="900" cy="150" r="400" fill="url(#glow)"/>
  
  <!-- Border -->
  <rect x="1" y="1" width="1198" height="628" rx="0" fill="none" stroke="#1f2937" stroke-width="2"/>
  
  <!-- Logo area -->
  <text x="80" y="90" font-family="system-ui, sans-serif" font-size="24" fill="#0891b2" font-weight="bold">
    ⚡ AI App Builder
  </text>
  
  <!-- Title lines -->
  ${titleLines
    .map(
      (line, i) => `
  <text x="80" y="${200 + i * 72}" font-family="system-ui, sans-serif" font-size="64" fill="white" font-weight="900" text-anchor="start">
    ${line}
  </text>`,
    )
    .join("")}
  
  <!-- Description -->
  ${descLines
    .slice(0, 2)
    .map(
      (line, i) => `
  <text x="80" y="${200 + titleLines.length * 72 + 40 + i * 36}" font-family="system-ui, sans-serif" font-size="28" fill="#9ca3af">
    ${line}
  </text>`,
    )
    .join("")}
  
  <!-- Bottom badge -->
  <rect x="80" y="560" width="220" height="42" rx="21" fill="#0891b2" fill-opacity="0.15" stroke="#0891b2" stroke-opacity="0.4" stroke-width="1"/>
  <text x="190" y="587" font-family="system-ui, sans-serif" font-size="20" fill="#0891b2" text-anchor="middle" font-weight="600">
    Built with AI
  </text>
</svg>`;
}

function chunkText(text: string, maxLen: number): string[] {
  if (!text) return [];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxLen) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3); // max 3 lines
}

// GET /api/og-image?projectId=123  or  GET /api/og-image?title=...
router.get("/og-image", async (req, res) => {
  let title = "AI App Builder";
  let description = "Build apps with AI — fast, smart, in Hebrew";

  const projectId = req.query.projectId ? Number(req.query.projectId) : null;
  if (projectId && !isNaN(projectId)) {
    const [project] = await db
      .select({
        title: projectsTable.title,
        description: projectsTable.description,
      })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .catch(() => [null]);
    if (project) {
      title = project.title ?? title;
      description = project.description ?? description;
    }
  } else if (typeof req.query.title === "string" && req.query.title) {
    title = req.query.title;
    description =
      typeof req.query.desc === "string" ? req.query.desc : description;
  }

  const svg = svgOgImage(title, description);

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(svg);
});

export default router;
