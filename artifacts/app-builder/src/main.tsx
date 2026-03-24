import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Dev-mode auth token forwarding ────────────────────────────────────────────
// In the Replit workspace preview the app runs in a sandboxed iframe where
// cross-site cookies (SameSite=None) are blocked by modern browsers (Chrome 120+
// Privacy Sandbox / third-party cookie restrictions).  The `/api/dev-login`
// endpoint stores the session ID in localStorage instead.  We intercept every
// fetch call to /api/* and attach it as an Authorization Bearer header so the
// server can authenticate the request without relying on cookies.
if (import.meta.env.DEV) {
  const _originalFetch = window.fetch.bind(window);
  window.fetch = function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    if (url.startsWith("/api/") || url.includes("/api/")) {
      let devSid: string | null = null;
      try {
        devSid = localStorage.getItem("dev_auth_sid");
      } catch {
        // localStorage may be blocked in some contexts
      }
      if (devSid) {
        const headers = new Headers((init?.headers as HeadersInit) ?? {});
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${devSid}`);
        }
        return _originalFetch(input, { credentials: "include", ...init, headers });
      }
    }
    return _originalFetch(input, init);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
