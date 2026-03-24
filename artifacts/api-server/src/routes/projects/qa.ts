/**
 * AI QA System — Prompt 12
 * Auto-generates unit tests, API tests, UI tests for generated code.
 * Provides auto-fix suggestions.
 */
import { Router, Request, Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, projectsTable, qaTestResultsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

// POST /api/projects/:id/qa — generate tests for project code
router.post("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const code = (project.previewHtml ?? "").slice(0, 8000);
  const stack = project.stack ?? "html";

  const qaPrompt = `You are a senior QA engineer and test automation expert.

Analyze this ${stack} application code and generate comprehensive tests.

CODE:
\`\`\`
${code}
\`\`\`

Generate a test suite in JSON format:
{
  "test_suite": [
    {
      "id": "T1",
      "name": string,
      "type": "unit|integration|ui|e2e|accessibility",
      "description": string,
      "code": string,
      "expected_result": string,
      "priority": "critical|high|medium|low",
      "status": "generated"
    }
  ],
  "coverage_analysis": {
    "estimated_coverage_percent": number,
    "covered_paths": string[],
    "uncovered_paths": string[],
    "risk_areas": string[]
  },
  "auto_fix_suggestions": [
    {
      "issue": string,
      "severity": "critical|high|medium|low",
      "fix": string,
      "code_change": string
    }
  ],
  "qa_summary": {
    "total_tests": number,
    "critical_tests": number,
    "estimated_pass_rate": number,
    "quality_score": number,
    "recommendations": string[]
  }
}

Generate 8-15 meaningful tests. Focus on:
- User interactions (clicks, form submissions)
- Data validation
- Error states
- Accessibility (ARIA, keyboard nav)
- Performance (no memory leaks, fast render)

Return ONLY valid JSON.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: qaPrompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const qa = JSON.parse(
      raw.replace(/```json\n?|\n?```/g, "").trim(),
    ) as Record<string, unknown>;
    const testSuite = (qa.test_suite ?? []) as Record<string, unknown>[];
    const fixes = (qa.auto_fix_suggestions ?? []) as Record<string, unknown>[];
    const summary = (qa.qa_summary as Record<string, unknown>) ?? {};

    const [saved] = await db
      .insert(qaTestResultsTable)
      .values({
        projectId,
        testSuite: testSuite as unknown as Record<string, unknown>[],
        passed: 0,
        failed: 0,
        skipped: testSuite.length,
        coveragePercent: Number(
          (qa.coverage_analysis as Record<string, unknown>)
            ?.estimated_coverage_percent ?? 0,
        ),
        autoFixSuggestions: fixes as unknown as Record<string, unknown>[],
      })
      .returning();

    res.json({ qa: { ...qa, id: saved.id, summary } });
  } catch (e: unknown) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "QA generation failed" });
  }
});

// GET /api/projects/:id/qa — get latest QA results
router.get("/", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const [latest] = await db
    .select()
    .from(qaTestResultsTable)
    .where(eq(qaTestResultsTable.projectId, projectId))
    .orderBy(desc(qaTestResultsTable.generatedAt))
    .limit(1);
  res.json({ result: latest ?? null });
});

// GET /api/projects/:id/qa/history
router.get("/history", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const results = await db
    .select()
    .from(qaTestResultsTable)
    .where(eq(qaTestResultsTable.projectId, projectId))
    .orderBy(desc(qaTestResultsTable.generatedAt))
    .limit(10);
  res.json({ results });
});

export default router;
