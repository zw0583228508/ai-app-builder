# Threat Model

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 2 — Security Hardening

---

## System Overview

The platform is a multi-tenant AI-powered website and app builder. Users interact via a Hebrew-language chat interface that drives code generation. The backend is a Node.js/Express API server backed by PostgreSQL. The frontend is a React/Vite SPA.

**Trust boundary:** All user-supplied data crosses the network boundary. The AI model (Anthropic Claude) is an external service. Netlify/Vercel and GitHub are third-party integrations with separate trust relationships.

---

## Assets to Protect

| Asset | Classification | Risk Level |
|-------|---------------|------------|
| User session cookies (`sid`) | Confidential | Critical |
| GitHub personal access tokens | Secret | Critical |
| Netlify/Vercel deploy tokens | Secret | Critical |
| Encryption key (`ENCRYPTION_KEY`) | Secret | Critical |
| User project source code | Confidential | High |
| Generated preview HTML | Semi-public (share feature) | Medium |
| User DNA / memory | Personal | High |
| Project database schemas | User data | High |
| Analytics events | Aggregate | Low |

---

## Threat Actors

### 1. Unauthenticated External Attacker
- **Goal:** Access other users' project data, execute arbitrary code, exfiltrate secrets
- **Capability:** Can send HTTP requests without a valid session

### 2. Authenticated Malicious User
- **Goal:** Access other users' projects, escalate privileges, abuse AI endpoints
- **Capability:** Has a valid session for their own account

### 3. Compromised Third-Party Token
- **Goal:** Unauthorized deployments, code exfiltration via GitHub
- **Capability:** Has a leaked GitHub/Netlify/Vercel token

### 4. Malicious Prompt Injection
- **Goal:** Cause AI to generate harmful code, leak internal prompts, or bypass restrictions
- **Capability:** Crafts user messages to manipulate AI behavior

---

## Threat Scenarios and Mitigations

### T1 — Unauthorized Project Access (IDOR)
**Attack:** Attacker guesses project IDs and accesses another user's project data.  
**Mitigation:** `router.param("id")` middleware in `routes/projects/index.ts` enforces ownership on ALL methods (GET included). Returns 401/403 on mismatch.  
**Status:** ✅ Mitigated

### T2 — Session Hijacking
**Attack:** Attacker steals session cookie and impersonates a user.  
**Mitigation:** OIDC-based session with refresh token rotation. Session stored in DB (not JWT). `sid` cookie should be `httpOnly`, `secure`, `sameSite=strict`.  
**Status:** ✅ Mitigated (OIDC + server-side session)

### T3 — Cross-Tenant Database Access
**Attack:** User crafts SQL query to access another user's project DB schema or application tables.  
**Mitigation:** `POST /:id/db/query` enforces ownership, uses `SET LOCAL search_path` scoped to project schema only, blocks dangerous SQL patterns (DROP, ALTER, GRANT, COPY, SET search_path).  
**Status:** ✅ Mitigated

### T4 — Secret Leakage via Preview/Share
**Attack:** User embeds secret retrieval in generated code; when shared via public URL, secrets are exposed.  
**Mitigation:** Secrets injected only at build/deploy time via Netlify/Vercel environment variables, never in preview HTML. Share endpoint returns only `previewHtml` and metadata — no secrets columns.  
**Status:** ✅ Mitigated (by design)

### T5 — Prompt Injection via User Messages
**Attack:** User crafts a message that hijacks the AI system prompt, causing it to reveal internals or generate malicious code.  
**Mitigation:** System prompt is injected server-side and not user-controllable. User messages are treated as untrusted user-turn content only.  
**Status:** ⚠️ Partial — no strict prompt injection detection. Relies on Claude's own guardrails.

### T6 — Rate Limit Bypass / AI Cost Abuse
**Attack:** Attacker sends many requests to AI endpoints to incur costs or degrade service.  
**Mitigation:** Three-tier rate limiting: 120/min general, 20/min AI chat, 5/5min deployments. Keyed by user ID.  
**Status:** ✅ Mitigated

### T7 — Webhook Replay / Forgery
**Attack:** Attacker forges or replays webhook deliveries to trigger unintended actions.  
**Mitigation:** Webhooks signed with HMAC-SHA256 (`X-Hub-Signature-256`). Secret never returned in API responses.  
**Status:** ✅ Mitigated

### T8 — CORS Abuse in Production
**Attack:** Malicious website makes cross-origin requests to the API using a victim's session cookies.  
**Mitigation:** CORS configured via `ALLOWED_ORIGINS` env var in production. Falls back to `false` (deny all) if not set. Development allows all origins.  
**Status:** ✅ Mitigated

### T9 — GitHub Token Leakage
**Attack:** GitHub PAT embedded in code, logs, or environment is exfiltrated.  
**Mitigation:** Tokens stored encrypted in DB. Git remote URLs must not embed tokens. Secrets excluded from API responses.  
**Status:** ✅ Mitigated (PAT removed from git remote URL)

### T10 — Denial of Service via Large Payloads
**Attack:** Attacker sends extremely large messages to exhaust memory or processing time.  
**Mitigation:** 8,000-character message limit. Null bytes and control characters stripped. Express body parser limit applied.  
**Status:** ✅ Mitigated

---

## Residual Risks

| Risk | Likelihood | Impact | Mitigation Path |
|------|------------|--------|-----------------|
| Prompt injection sophistication | Medium | Medium | Add server-side injection detection layer |
| Terminal WebSocket unrestricted shell | High | Critical | Terminal is currently in-process simulation only; isolate if real shell is added |
| Multi-tenant analytics aggregate leakage | Low | Low | Analytics summary now scoped per user |
| Collab WebSocket MITM | Low | Medium | Sessions validated at connection time |

---

## Assumptions

1. The platform runs on Replit infrastructure with managed TLS — transport encryption assumed.
2. The database is not directly internet-accessible — network-level isolation assumed.
3. Anthropic API key is managed by Replit AI integrations — not a direct env secret.
4. Users are authenticated via Replit OIDC — we trust Replit's identity layer.
