# Security Audit Report

**Date:** 2026-03-22  
**Scope:** Full API server security review — Phase 2 audit

---

## CRITICAL FINDINGS

### SEC-001 — Terminal WebSocket: No Authentication
**Severity:** CRITICAL  
**File:** `artifacts/api-server/src/routes/terminal.ts`  
**Status:** ✅ FIXED (2026-03-22)

**Issue:** The `/api/terminal` WebSocket endpoint spawned a full interactive `bash` shell with no authentication check whatsoever. Any client that could open a WebSocket connection to the server received a shell with full server permissions.

**Additional issue:** `ALLOWED_CMDS` regex was defined at the top of the file but was **never called** in the message handler. The handler did `shell.stdin.write(data)` directly, bypassing all command filtering.

**Fix applied:** Added session authentication at the WebSocket upgrade stage. Connection is rejected with `4001 Unauthorized` if no valid session exists.

---

### SEC-002 — CORS: Reflects All Origins With Credentials
**Severity:** HIGH  
**File:** `artifacts/api-server/src/app.ts`  
**Status:** ✅ FIXED (2026-03-22)

**Issue:** `cors({ credentials: true, origin: true })` — `origin: true` tells the cors package to echo back whatever `Origin` header the browser sends. This means any website on the internet can make authenticated cross-origin requests using the user's cookies.

**Fix applied:** CORS origin is now controlled by the `ALLOWED_ORIGINS` environment variable. In production mode, it falls back to `REPLIT_DEV_DOMAIN`. Development keeps `origin: true` for convenience.

---

### SEC-003 — Proxy Routes: Unauthenticated
**Severity:** HIGH  
**File:** `artifacts/api-server/src/routes/proxy.ts`  
**Status:** ✅ FIXED (2026-03-22)

**Issues:**
1. `/api/proxy` — Anyone on the internet could use this server as a free CORS proxy for any external HTTPS URL, with no rate limit specific to this path.
2. `/api/ai-proxy` — Anyone could send Claude API requests at the platform's cost with no authentication. `max_tokens` was capped at 2048 but `model` was user-controllable (could target expensive models).

**Fix applied:** Both endpoints now require authentication (`req.user` must be present). Unauthenticated requests receive `401 Unauthorized`. Model in `ai-proxy` is pinned to Haiku (cannot be overridden).

---

### SEC-004 — Collab WebSocket: Ownership Check Bypassed for Non-Numeric IDs
**Severity:** MEDIUM  
**File:** `artifacts/api-server/src/routes/collab.ts`  
**Status:** ✅ FIXED (2026-03-22)

**Issue:** The project ownership check was conditional:
```typescript
if (!isNaN(numericId)) {  // ← only runs for numeric IDs
  // ownership check
}
```
Any client that passed a non-numeric `projectId` (e.g. `?projectId=abc`) would pass the ownership check entirely and join the collab room.

**Fix applied:** Numeric ID validation is now required. Non-numeric IDs result in immediate `4003 Forbidden`.

---

## LOWER PRIORITY FINDINGS

### SEC-005 — No Audit Logging for Risky Operations
**Severity:** MEDIUM  
**Status:** Documented, not yet implemented

High-risk operations (project delete, secret creation, SQL query execution, snapshot restore) have no dedicated audit log beyond standard request logs. Future improvement: add structured audit entries to a dedicated table.

### SEC-006 — SQL Query Endpoint: No Query Complexity Limit
**Severity:** MEDIUM  
**File:** `routes/projects/index.ts` — `POST /:id/db/query`  
**Status:** Partially mitigated (user must own project)

The per-project DB query endpoint executes arbitrary SQL as the project DB owner. Ownership is verified, but there's no query complexity limit, timeout enforcement, or read-only mode option.

### SEC-007 — Secret Values Visible in Logs
**Severity:** LOW  
**Status:** Documented, not yet audited

Encrypted secrets are stored safely, but care must be taken that decrypted values never appear in structured log output. Not confirmed — needs audit of all secret-handling paths.

### SEC-008 — Terminal ALLOWED_CMDS Regex: Unenforced
**Severity:** LOW (mitigated by SEC-001 fix)  
**File:** `routes/terminal.ts`  
**Status:** Removed in SEC-001 fix

The regex was unreliable anyway (interactive shell receives keystrokes one at a time, not complete command lines) and has been removed. Authentication is the correct enforcement layer.

---

## HARDENING CHECKLIST

| Item | Status |
|---|---|
| Terminal WebSocket authentication | ✅ Fixed |
| CORS locked to known origins | ✅ Fixed |
| Proxy endpoints require auth | ✅ Fixed |
| AI-proxy model pinned | ✅ Fixed |
| Collab WS ownership check hardened | ✅ Fixed |
| Project routes require ownership | ✅ Already correct via requireProjectAccess middleware |
| Session cookies: httpOnly, sameSite:lax | ✅ Already correct |
| Secret encryption at rest | ✅ Already implemented via encryption.ts |
| Rate limiting on AI endpoints | ✅ Already implemented |
| Rate limiting on deploy endpoints | ✅ Already implemented |
| Input validation library | ⬜ Not yet — ad-hoc validation only |
| Audit log table for risky ops | ⬜ Not yet |
| SQL query timeout enforcement | ⬜ Not yet |
| Read-only DB query mode | ⬜ Not yet |
