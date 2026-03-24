# Final Security Hardening Report — Phase 4

**Date**: 2026-03-22
**Author**: Principal Engineer / Security Lead

---

## Executive Summary

This report documents all security findings identified during the Phase 4 hardening pass and confirms which have been remediated. The platform handles user-authenticated project management, AI orchestration, and external integrations — all of which carry significant security obligations.

---

## Findings and Remediations

### SEC-001 — Terminal WebSocket: Unconstrained Shell Access (CRITICAL) ✅ FIXED

**File**: `artifacts/api-server/src/routes/terminal.ts`

**Finding**: The terminal spawned `bash` with `...process.env`, exposing all server secrets (Anthropic API key, Netlify token, DB credentials) to the child process. No command filtering was applied.

**Fix Applied**:

- Added `TERMINAL_ENABLED` feature flag — disabled by default in production (`NODE_ENV=production`)
- Replaced `...process.env` with `buildSafeEnv()` whitelist of 19 safe env vars only
- Added `BLOCKED_PATTERNS` array blocking: `rm -rf /`, `dd if=`, `mkfs`, `fdisk`, fork bombs, `iptables`, `crontab -e`, `sudo`, `su`, `curl|bash`, `wget|bash`, `chmod 7xx /`
- User-facing Hebrew error message when command blocked
- Structured warning log with userId and command snippet (first 100 chars)

**Residual Risk**: Commands can still be assembled creatively. Future: restrict to specific allowed commands instead of blocking patterns. Not pursued now to preserve developer UX.

---

### SEC-002 — CORS: Wildcard in Production (HIGH) ✅ FIXED

**File**: `artifacts/api-server/src/app.ts`

**Finding**: `cors({ origin: true })` reflected any origin in production.

**Fix Applied**:

- `buildCorsOrigin()` function: in production, read `ALLOWED_ORIGINS` env var or derive from `REPLIT_DEV_DOMAIN`
- Logs error and returns `false` (block all) if no origin config available in production

---

### SEC-003 — Proxy Endpoint: No Rate Limit (HIGH) ✅ FIXED

**File**: `artifacts/api-server/src/app.ts`

**Finding**: `/api/proxy` had only the general API-wide rate limit (120 req/min, GET-skipped). An attacker could use it as an unlimited external request relay.

**Fix Applied**:

- Dedicated rate limit middleware: 30 req/min per authenticated user on `/api/proxy`
- Dedicated rate limit middleware: 15 req/min per authenticated user on `/api/ai-proxy`
- Key by `user.id` to prevent anonymous abuse

---

### SEC-004 — Project Authorization: Central `router.param` ✅ VERIFIED

**File**: `artifacts/api-server/src/routes/projects/index.ts`

**Finding**: Need to ensure all `:id` project routes go through ownership check.

**Status**: Verified. `router.param("id", ...)` intercepts all project-scoped routes and checks `projectsTable.userId === req.user?.id`. Public share route (`/share/:token`) and analytics event posting are explicitly exempted. Team-shared projects also have `teamId` bypass path.

---

### SEC-005 — Messages GET Route: No Auth Check (MEDIUM) ✅ VERIFIED

**Finding**: Messages GET is covered by the central `router.param("id", ...)` ownership check since it's mounted under `/:id/messages`.

---

### SEC-006 — Terminal Safe Environment ✅ FIXED

(See SEC-001 — same fix covers both issues.)

---

### SEC-007 — Project DB Query Route: SQL Injection Risk (MEDIUM) ✅ VERIFIED

**File**: `artifacts/api-server/src/routes/projects/database.ts`

**Finding**: The project DB query route runs user-provided SQL. This is intentional (feature) but must be bounded.

**Status**: Route is protected by ownership auth. The DB connection used is the project's own Supabase/DB credentials, not the server's DB. No server DB injection risk. User is running SQL against their own database. Acceptable.

---

### SEC-008 — Secrets Leaking in Logs (LOW) ✅ VERIFIED

**Finding**: Check that server secret environment variables never appear in logs.

**Status**: Logger uses `pino` structured JSON. The `buildSafeEnv()` function in terminal.ts ensures only safe vars are passed to child processes. The `authMiddleware` only attaches `user.id` (not token) to req. No secrets logged in checked routes.

---

### SEC-009 — Team Authorization ✅ VERIFIED

**File**: `artifacts/api-server/src/routes/`

**Finding**: Team mutation routes must check owner-only access.

**Status**: Team routes check `req.user?.id === team.ownerId` for destructive operations. Membership reads check if user is a member. Verified in `teams.ts`.

---

## Remaining Risks (Accepted / Deferred)

| Risk                                          | Severity | Decision                                                  |
| --------------------------------------------- | -------- | --------------------------------------------------------- |
| Terminal command bypass via creative encoding | LOW      | Acceptable for dev env; prod disabled by flag             |
| Supabase URL SSRF via proxy                   | LOW      | Proxy validates URL scheme; deferred for deeper allowlist |
| Rate limit bypass via distributed IPs         | LOW      | Acceptable given authenticated user key                   |

---

## Security Controls Summary

| Control                   | Status                      |
| ------------------------- | --------------------------- |
| Terminal feature flag     | ✅ Active                   |
| Terminal env whitelist    | ✅ Active                   |
| Terminal command blocking | ✅ Active                   |
| CORS explicit origins     | ✅ Active                   |
| Proxy rate limiting       | ✅ Active                   |
| AI proxy rate limiting    | ✅ Active                   |
| Project ownership auth    | ✅ Central (`router.param`) |
| Session cookie validation | ✅ `authMiddleware`         |
| Team ownership checks     | ✅ Per-route                |
| Secret env isolation      | ✅ `buildSafeEnv()`         |
