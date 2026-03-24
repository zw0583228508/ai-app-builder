# Security Hardening Checklist

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 2 — Security Hardening

---

## Authentication & Session

- [x] OIDC-based authentication via Replit Auth
- [x] Server-side session storage (DB-backed, not JWT)
- [x] Session refresh on token expiry (`refreshIfExpired` in authMiddleware)
- [x] Session cleared on refresh failure
- [x] `req.isAuthenticated()` helper available on all routes
- [x] `req.user` populated by `authMiddleware` globally
- [ ] Cookie flags: verify `httpOnly`, `secure`, `sameSite=strict` are set in production
- [ ] CSRF protection for state-changing non-API routes (if any)

---

## Authorization

- [x] `router.param("id")` enforces ownership on **all** HTTP methods (including GET)
- [x] Returns 401 if not authenticated, 403 if not owner
- [x] Analytics summary scoped to authenticated user only
- [x] Database endpoints all require project ownership
- [x] Share endpoints intentionally expose only `previewHtml` + metadata (no user data)
- [x] GitHub sync routes verify project ownership before write operations
- [x] Deploy routes verify project ownership
- [ ] Collab WebSocket: verify project membership on join

---

## Input Validation & Sanitization

- [x] Message content: 8,000-character limit enforced
- [x] Null bytes stripped from user messages
- [x] Control characters (0x01–0x08, 0x0B–0x1F) stripped from messages
- [x] Project titles/descriptions validated (length limits)
- [x] SQL blocklist prevents DROP/ALTER/TRUNCATE/GRANT/REVOKE/COPY/SET search_path
- [x] Zod validation schemas for route bodies
- [ ] File upload type validation (if file upload is added)
- [ ] Image URL validation before embedding in previews

---

## Secrets Management

- [x] GitHub tokens stored encrypted in DB (`encrypt()` / `decrypt()` from `lib/encryption.ts`)
- [x] `ENCRYPTION_KEY` env var required for secrets at rest
- [x] Webhook secrets never returned in API list responses
- [x] Git remote URLs do not embed PATs
- [x] Secrets not included in public share page responses
- [x] Secrets not logged (no `req.body` full-dump logging)
- [ ] Secret rotation strategy documented

---

## Database Security

- [x] `SET LOCAL search_path` scoped to project schema only (no `public` exposure)
- [x] Project ownership verified before all DB read/write operations
- [x] Input SQL blocked from dangerous DDL via pattern matching
- [x] PostgreSQL connection uses pool (not single connection per request)
- [x] Schema isolation: each project gets `project_<id>` schema
- [ ] DB user should have least-privilege grants (verify in production)
- [ ] Consider read-only DB user for SELECT-only query endpoints

---

## Rate Limiting

- [x] General API: 120 requests/min (non-GET only)
- [x] AI chat: 20 requests/min (keyed by user ID)
- [x] Deployments: 5 requests/5min (keyed by user ID)
- [x] `validate: { xForwardedForHeader: false }` to avoid IPv6 key issues
- [ ] Add rate limiting to webhook trigger endpoint
- [ ] Add rate limiting to share token lookup

---

## CORS

- [x] Development: permissive (`origin: true`)
- [x] Production: explicit allowlist via `ALLOWED_ORIGINS` env var
- [x] Falls back to Replit domain if `REPLIT_DEV_DOMAIN` is set
- [x] Falls back to `false` (deny all) if neither env var is set
- [x] `credentials: true` for cookie-based auth

---

## API Security

- [x] Health endpoint returns DB status without exposing connection strings
- [x] Soft delete preserves data for 30 days before hard purge
- [x] GDPR purge endpoint (`DELETE /api/projects/:id/purge`) for hard delete
- [x] Webhooks signed with HMAC-SHA256 (`X-Hub-Signature-256`)
- [x] Error responses do not leak stack traces to clients
- [ ] Add `X-Content-Type-Options: nosniff` header
- [ ] Add `X-Frame-Options: DENY` header

---

## WebSocket Security

- [x] Collab WebSocket validates session at connection time
- [x] Project ownership verified before joining collab room
- [x] Heartbeat/ping-pong detects and cleans up stale connections
- [ ] Terminal WebSocket: currently simulation only; isolate with sandbox if real shell added

---

## Preview & Share

- [x] Preview HTML sandboxed in `<iframe>` with restricted sandbox attributes
- [x] Share endpoints return only intended data (no user info, no secrets)
- [x] Custom slugs validated for safe characters
- [x] Share token is random and unguessable
- [ ] Add share link expiry option

---

## Logging & Audit

- [x] Structured logging via Pino
- [x] Request/response logged (method, URL, status, latency)
- [x] Sensitive fields excluded from request logs
- [x] Cleanup scheduler logs deletions with row counts
- [ ] Add audit log for: project delete, secret CRUD, deploy trigger, GitHub sync
- [ ] Add Sentry integration for error tracking in production

---

## Dependency Security

- [ ] Run `pnpm audit` regularly
- [ ] Pin critical dependency versions
- [ ] Review AI SDK version for prompt injection mitigations

---

## Environment Validation

- [x] `validateEnv()` called at startup — exits if required vars missing
- [x] Required: `DATABASE_URL`, `SESSION_SECRET`
- [x] Optional (with warning): `ANTHROPIC_API_KEY`, `NETLIFY_TOKEN`, `VERCEL_TOKEN`, `GCS_BUCKET`, `RESEND_API_KEY`, `SENTRY_DSN`
