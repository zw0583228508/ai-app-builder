import { Router, type Request, type Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const PINNED_AI_MODEL = "claude-haiku-4-5";

const PROXY_TIMEOUT_MS = 10_000;
const PROXY_MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "broadcasthost",
]);

const BLOCKED_HOST_PATTERNS = [
  /^127\./, // loopback
  /^10\./, // RFC 1918 class A
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918 class B
  /^192\.168\./, // RFC 1918 class C
  /^0\./, // this network
  /^169\.254\./, // link-local / AWS metadata
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./, // RFC 6598 shared address
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^fc00:/i, // IPv6 unique local
  /^fd[0-9a-f]{2}:/i, // IPv6 unique local
];

const BLOCKED_SUBSTRINGS = [
  "metadata.google",
  "metadata.internal",
  "169.254.169.254",
  "instance-data",
];

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();

    if (BLOCKED_HOSTNAMES.has(host)) return false;
    if (BLOCKED_SUBSTRINGS.some((s) => host.includes(s))) return false;
    if (BLOCKED_HOST_PATTERNS.some((p) => p.test(host))) return false;

    // Block any raw IP address (IPv4 dotted decimal or raw IPv6)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return false;
    if (/^\[.+\]$/.test(host)) return false; // [::1] style bracket IPv6

    return true;
  } catch {
    return false;
  }
}

function requireAuth(req: Request, res: Response): boolean {
  if (!req.user?.id) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

// ── CORS Proxy ─────────────────────────────────────────────────
// Generated apps call /api/proxy?url=<encoded-url> to bypass browser CORS restrictions.
// Requires authentication — prevents unauthenticated public use of the server as a free proxy.
router.all("/proxy", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const targetUrl = (req.query.url as string) || (req.body?.url as string);

  if (!targetUrl) {
    res.status(400).json({ error: "url query parameter is required" });
    return;
  }

  if (!isSafeUrl(targetUrl)) {
    res.status(403).json({
      error: "URL not allowed — only HTTPS external URLs are supported",
    });
    return;
  }

  try {
    const method = ((req.query.method as string) || req.method).toUpperCase();
    const isGet = method === "GET" || method === "HEAD";

    const forwardHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; BuilderAI/1.0)",
      Accept:
        (req.headers.accept as string) || "application/json, text/plain, */*",
    };

    if (req.body?.headers && typeof req.body.headers === "object") {
      Object.assign(forwardHeaders, req.body.headers);
    }

    let forwardBody: string | undefined;
    if (!isGet) {
      const bodyPayload = req.body?.body ?? req.body;
      if (bodyPayload && Object.keys(bodyPayload).length > 0) {
        forwardBody =
          typeof bodyPayload === "string"
            ? bodyPayload
            : JSON.stringify(bodyPayload);
        if (!forwardHeaders["Content-Type"]) {
          forwardHeaders["Content-Type"] = "application/json";
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    let fetchRes: Awaited<ReturnType<typeof fetch>>;
    try {
      fetchRes = await fetch(targetUrl, {
        method,
        headers: forwardHeaders,
        body: isGet ? undefined : forwardBody,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const contentLength = Number(fetchRes.headers.get("content-length") ?? 0);
    if (contentLength > PROXY_MAX_RESPONSE_BYTES) {
      res.status(413).json({ error: "Response too large" });
      return;
    }

    const contentType =
      fetchRes.headers.get("content-type") || "application/json";
    const buf = await fetchRes.arrayBuffer();
    if (buf.byteLength > PROXY_MAX_RESPONSE_BYTES) {
      res.status(413).json({ error: "Response too large" });
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Content-Type", contentType);
    res.status(fetchRes.status).send(Buffer.from(buf));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    const isTimeout = err instanceof Error && err.name === "AbortError";
    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? "Proxy timeout" : "Proxy error",
      message: msg,
    });
  }
});

router.options("/proxy", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

// ── AI Chat Proxy ──────────────────────────────────────────────
// Generated apps call POST /api/ai-proxy to use Claude without any API key.
// Requires authentication. Model is pinned to Haiku — cannot be overridden by caller.
// Body: { messages: [{role, content}], system?: string, max_tokens?: number }
router.post("/ai-proxy", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const { messages, system, max_tokens = 1024 } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res
      .status(400)
      .json({ error: "messages array is required and must not be empty" });
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: PINNED_AI_MODEL,
      max_tokens: Math.min(Number(max_tokens) || 1024, 2048),
      system: system || "You are a helpful assistant. Be concise and helpful.",
      messages,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({
      content: (response.content[0] as any).text,
      usage: response.usage,
      model: response.model,
    });
  } catch (err: any) {
    res.status(500).json({ error: "AI proxy error", message: err.message });
  }
});

router.options("/ai-proxy", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

export default router;
