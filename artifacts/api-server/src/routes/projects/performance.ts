import { Router, Request, Response } from "express";
import { assertSafeUrl, SsrfError } from "../../lib/ssrf-guard";

const router = Router({ mergeParams: true });

interface PageSpeedResult {
  lighthouseResult: {
    categories: { performance: { score: number } };
    audits: {
      "first-contentful-paint": { numericValue: number };
      "largest-contentful-paint": { numericValue: number };
      "cumulative-layout-shift": { numericValue: number };
      "total-blocking-time": { numericValue: number };
      "speed-index": { numericValue: number };
    };
  };
}

// GET /api/projects/:id/performance?url=...
router.get("/", async (req: Request, res: Response) => {
  const { url } = req.query as { url?: string };
  if (!url?.trim()) {
    res.status(400).json({ error: "url query param required" });
    return;
  }

  // SSRF prevention — the URL is user-controlled and passed to Google PageSpeed,
  // which in turn fetches the URL. Reject private/internal targets.
  try {
    await assertSafeUrl(url.trim());
  } catch (err) {
    if (err instanceof SsrfError) {
      res
        .status(400)
        .json({ error: "Invalid URL: must be a publicly accessible address" });
      return;
    }
    throw err;
  }

  const apiKey = process.env.PAGESPEED_API_KEY ?? "";
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance${apiKey ? `&key=${apiKey}` : ""}`;

  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
    if (!resp.ok) {
      const e = (await resp.json().catch(() => ({}))) as {
        error?: { message: string };
      };
      res
        .status(resp.status)
        .json({ error: e.error?.message || "PageSpeed error" });
      return;
    }
    const psData = (await resp.json()) as PageSpeedResult;
    const lr = psData.lighthouseResult;
    const audits = lr.audits;

    res.json({
      data: {
        url,
        score: Math.round((lr.categories.performance.score ?? 0) * 100),
        fcp: parseFloat(
          (
            (audits["first-contentful-paint"]?.numericValue ?? 0) / 1000
          ).toFixed(2),
        ),
        lcp: parseFloat(
          (
            (audits["largest-contentful-paint"]?.numericValue ?? 0) / 1000
          ).toFixed(2),
        ),
        cls: parseFloat(
          (audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3),
        ),
        tbt: Math.round(audits["total-blocking-time"]?.numericValue ?? 0),
        si: parseFloat(
          ((audits["speed-index"]?.numericValue ?? 0) / 1000).toFixed(2),
        ),
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "unknown" });
  }
});

export default router;
