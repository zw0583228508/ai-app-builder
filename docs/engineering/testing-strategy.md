# Testing Strategy

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 17 — Testing, Validation, and CI

---

## Overview

This document defines the testing philosophy, test layers, tooling, and CI requirements for the AI App Builder platform.

---

## Philosophy

1. **Test behavior, not implementation** — tests should survive refactors without needing updates
2. **Pure logic first** — unit-test deterministic functions before integration tests
3. **Don't mock the happy path** — tests that always pass provide false confidence
4. **AI output is non-deterministic** — test parsers and extractors on fixed inputs, not live AI calls
5. **Security tests are non-negotiable** — auth, ownership, SQL injection must be regression-tested

---

## Test Pyramid

```
             /\
            /  \   E2E Tests (Playwright)
           /    \  - Full user flows
          /------\ - Build, Deploy, GitHub sync
         /        \
        /  Integr.  \ Route tests (Supertest)
       /   Tests     \ - API auth enforcement
      /               \ - Rate limiting
     /                 \ - CRUD operations
    /-------------------\
   /                     \
  /     Unit Tests        \ Pure logic
 /    (Vitest / Jest)      \ - AI parsers
/---------------------------\ - Intent detection
                             - Mode detection
                             - Crypto round-trips
                             - Env validation
```

---

## Unit Tests

**Location:** `artifacts/api-server/src/__tests__/`  
**Framework:** Vitest  
**Run:** `pnpm --filter @workspace/api-server test`

### Current Coverage

| File | What's Tested |
|------|--------------|
| `utils.test.ts` | `encrypt/decrypt` round-trip, `validateEnv` exits on missing vars |
| `deploy-queue.test.ts` | `getQueueStatus` returns correct state for queued/running/failed items |

### Required Unit Tests

| Function | File | Priority |
|----------|------|----------|
| `detectChatIntent()` | `services/ai/intent.ts` | High |
| `detectUserMode()` | `services/ai/mode.ts` | High |
| `applyPatch()` | `services/ai/preview.ts` | High |
| `scoreMemoryChunks()` | `services/memory/project-dna.ts` | Medium |
| `shouldExtractMemory()` | `services/memory/project-dna.ts` | Medium |
| `buildDNAContext()` | `services/memory/project-dna.ts` | Medium |
| `injectCDNLibraries()` | `services/ai/preview.ts` | Medium |
| `detectContextualSuggestions()` | `services/ai/intent.ts` | Low |

### Writing a Unit Test

```typescript
// artifacts/api-server/src/__tests__/mode.test.ts
import { describe, it, expect } from "vitest";
import { detectUserMode } from "../services/ai/mode";

describe("detectUserMode", () => {
  it("returns 'developer' for technical keywords", () => {
    expect(detectUserMode("תוסיף TypeScript types", "entrepreneur"))
      .toBe("developer");
  });

  it("does not downgrade mode without strong signal", () => {
    expect(detectUserMode("תודה", "developer")).toBe("developer");
  });

  it("returns 'maker' for animation keywords", () => {
    expect(detectUserMode("הוסף אנימציה עם Three.js", "entrepreneur"))
      .toBe("maker");
  });
});
```

---

## Route / Integration Tests

**Framework:** Supertest + Vitest  
**Location:** `artifacts/api-server/src/__tests__/routes/`

### Auth Enforcement Tests

```typescript
// Every project route must be tested for:
it("returns 401 for unauthenticated GET /api/projects/:id", async () => {
  const res = await request(app).get("/api/projects/nonexistent-id");
  expect(res.status).toBe(401);
});

it("returns 403 for authenticated user accessing other's project", async () => {
  // Create project as user A, try to access as user B
  ...
  expect(res.status).toBe(403);
});
```

### SQL Security Tests

```typescript
it("blocks DROP TABLE in database query endpoint", async () => {
  const res = await request(app)
    .post(`/api/projects/${projectId}/db/query`)
    .set("Cookie", authCookie)
    .send({ sql: "DROP TABLE users" });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/not allowed/i);
});
```

### Rate Limiting Tests

```typescript
it("returns 429 after AI rate limit exceeded", async () => {
  // Send 21 requests in under a minute
  for (let i = 0; i < 20; i++) {
    await request(app).post("/api/projects/:id/messages").set(...);
  }
  const final = await request(app).post("/api/projects/:id/messages").set(...);
  expect(final.status).toBe(429);
});
```

---

## E2E Tests

**Framework:** Playwright  
**Location:** `artifacts/app-builder/e2e/`  
**Run:** `pnpm --filter @workspace/app-builder test:e2e`

### Current E2E Tests

| Test | What's Tested |
|------|--------------|
| `workspace.spec.ts` | Project creation, chat message, preview update |

### Required E2E Tests

| Flow | Priority |
|------|----------|
| Full build → preview → version history | High |
| GitHub sync | Medium |
| Deploy to Netlify | Medium |
| QA test generation + results display | Medium |
| Collaboration presence | Low |
| GDPR purge flow | Low |

### Writing an E2E Test

```typescript
// artifacts/app-builder/e2e/build-flow.spec.ts
import { test, expect } from "@playwright/test";

test("user can generate a project and see the preview", async ({ page }) => {
  await page.goto("/projects/test-id/workspace");

  // Type a message
  await page.fill("[data-testid='chat-input']", "בנה לי דף נחיתה פשוט");
  await page.click("[data-testid='send-button']");

  // Wait for generation to complete
  await expect(page.locator("[data-testid='trust-card']")).toBeVisible({
    timeout: 30000,
  });

  // Verify preview updated
  const iframe = page.frameLocator("[data-testid='preview-iframe']");
  await expect(iframe.locator("body")).not.toBeEmpty();
});
```

---

## AI Output Parser Tests

AI output parsers must be tested on **fixed input strings** (not live AI calls):

```typescript
// artifacts/api-server/src/__tests__/preview-parser.test.ts
import { extractHtmlFromResponse } from "../services/ai/preview";

describe("extractHtmlFromResponse", () => {
  it("extracts HTML from markdown code block", () => {
    const input = "here's the code:\n```html\n<h1>Hello</h1>\n```";
    expect(extractHtmlFromResponse(input)).toBe("<h1>Hello</h1>");
  });

  it("returns raw input if no code block found", () => {
    const input = "<h1>Hello</h1>";
    expect(extractHtmlFromResponse(input)).toBe(input);
  });
});
```

---

## CI Requirements

When a CI pipeline is configured, it must run:

```yaml
# .github/workflows/ci.yml
- name: Typecheck API server
  run: pnpm --filter @workspace/api-server exec tsc --noEmit

- name: Typecheck app-builder
  run: pnpm --filter @workspace/app-builder exec tsc --noEmit

- name: Run unit tests
  run: pnpm --filter @workspace/api-server test

- name: Run E2E tests
  run: pnpm --filter @workspace/app-builder test:e2e
```

**TypeScript errors are treated as CI failures** — 0 type errors is the standard (as of Phase 17).

---

## Security Regression Tests

These tests must never be removed:

1. IDOR: unauthenticated access to any `/api/projects/:id` route → 401
2. Cross-tenant: authenticated user accessing another user's project → 403
3. SQL injection: DROP/ALTER in query endpoint → 400
4. Rate limit: >20 AI messages/min → 429
5. CORS: cross-origin request from non-allowlisted domain → rejected in production

---

## Snapshot / Version Tests

```typescript
it("snapshot is saved after generation", async () => {
  // Trigger generation...
  const snapshots = await db.select().from(snapshotsTable)
    .where(eq(snapshotsTable.projectId, projectId));
  expect(snapshots.length).toBeGreaterThan(0);
});

it("restore creates a new snapshot, not overwrites", async () => {
  const before = await countSnapshots(projectId);
  await restoreSnapshot(snapshotId);
  const after = await countSnapshots(projectId);
  expect(after).toBe(before + 1);
});
```
