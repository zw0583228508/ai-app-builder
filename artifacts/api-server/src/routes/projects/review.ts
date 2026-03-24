import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, projectsTable, projectFilesTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { GetProjectParams } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.post("/:id/ai-review", async (req, res) => {
  const params = GetProjectParams.parse(req.params);
  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.id))
    .then((r) => r[0]);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  let codeSnippet: string;
  if (project.previewHtml) {
    codeSnippet = project.previewHtml.slice(0, 12000);
  } else {
    const files = await db
      .select()
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, params.id))
      .orderBy(asc(projectFilesTable.path))
      .limit(10);
    if (files.length === 0) {
      res.status(400).json({ error: "No code to review" });
      return;
    }
    codeSnippet = files
      .map((f) => `// ${f.path}\n${f.content}`)
      .join("\n\n")
      .slice(0, 12000);
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `You are a senior web developer reviewing generated HTML/CSS/JavaScript code. Analyze the following code and return a JSON review object. Be concise and specific. Respond ONLY with valid JSON, no markdown.

JSON structure:
{
  "overall": { "score": 0-100, "grade": "A|B|C|D|F", "summary": "brief 1-2 sentence summary in Hebrew" },
  "performance": [{ "issue": "issue description in Hebrew", "severity": "error|warn|info", "fix": "specific fix suggestion in Hebrew" }],
  "security": [{ "issue": "...", "severity": "error|warn|info", "fix": "..." }],
  "accessibility": [{ "issue": "...", "severity": "error|warn|info", "fix": "..." }],
  "codeQuality": [{ "issue": "...", "severity": "error|warn|info", "fix": "..." }],
  "bestPractices": [{ "issue": "...", "severity": "error|warn|info", "fix": "..." }]
}

Limit each array to 3-5 items max. Focus on the most important issues. Score reflects overall quality.

Code to review:
\`\`\`html
${codeSnippet}
\`\`\``,
        },
      ],
    });

    const text = (
      response.content[0] as { type: string; text: string }
    ).text?.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const review = JSON.parse(jsonMatch[0]);
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: "Review failed", details: String(err) });
  }
});

export default router;
