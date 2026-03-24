# Security Findings

## CRITICAL

### SEC-001: Unrestricted Terminal Shell

**File**: `artifacts/api-server/src/routes/terminal.ts`
**Risk**: HIGH — spawns full bash shell with no command restrictions and full process.env exposure
**Status**: FIXED — added ALLOWED_COMMANDS whitelist and blocked dangerous patterns

### SEC-002: Snapshot/Share Auth Coverage

**File**: `artifacts/api-server/src/routes/projects/snapshots.ts`, `share.ts`
**Risk**: LOW — router.param('id') in projects/index.ts covers /:id/\* ownership correctly
**Status**: OK — auth is enforced by the param middleware

### SEC-003: Proxy CORS Wildcard

**File**: `artifacts/api-server/src/routes/proxy.ts`
**Risk**: MEDIUM — `Access-Control-Allow-Origin: *` in responses (intended for generated apps calling proxy)
**Status**: ACCEPTABLE — proxy requires authentication; wildcard CORS is intentional for iframe use

### SEC-004: Messages GET without explicit auth

**File**: `artifacts/api-server/src/routes/projects/messages.ts` line 51
**Risk**: MEDIUM — no explicit auth guard on GET /:id/messages
**Status**: COVERED — router.param('id') in index.ts enforces ownership; fixed by adding explicit check

### SEC-005: CORS in production

**File**: `artifacts/api-server/src/app.ts`
**Risk**: MEDIUM — production CORS relies on ALLOWED_ORIGINS or REPLIT_DEV_DOMAIN env vars
**Status**: OK — buildCorsOrigin() returns `false` if neither is set (rejects all cross-origin)

### SEC-006: Environment variables exposed to terminal

**File**: `artifacts/api-server/src/routes/terminal.ts`
**Risk**: HIGH — `...process.env` passes ALL server secrets to spawned bash process
**Status**: FIXED — whitelist of safe env vars only

### SEC-007: AI proxy max_tokens can be set by caller

**File**: `artifacts/api-server/src/routes/proxy.ts`
**Risk**: LOW — caller can set up to 2048 tokens; capped server-side
**Status**: OK — `Math.min(Number(max_tokens) || 1024, 2048)` enforces cap

## HIGH

### SEC-008: No rate limit on proxy endpoint specifically

**File**: `artifacts/api-server/src/routes/proxy.ts`
**Risk**: HIGH — authenticated users can use server as unlimited proxy
**Status**: FIXED — added specific rate limit for /api/proxy

## MEDIUM

### SEC-009: Zip payload not validated before Netlify deploy

**File**: `artifacts/api-server/src/routes/projects/index.ts` (netlify-deploy route)
**Risk**: MEDIUM — corrupt/malicious zip could be sent to Netlify API
**Status**: FIXED — added base64 validation and size check

## LOW

### SEC-010: SQL project DB endpoint

**File**: `artifacts/api-server/src/routes/projects/database.ts`
**Risk**: LOW — BLOCKED_SQL_PATTERNS prevents DROP/ALTER etc.; bound to project's own DB
**Status**: OK — reviewed, pattern list is comprehensive
