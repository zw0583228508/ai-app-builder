# Testing Plan — Phase 14

**Date**: 2026-03-22

---

## Overview

This document defines the test coverage strategy for the AI App Builder platform. Tests are organized by layer and priority.

---

## Test Coverage Targets

### Layer 1: Unit Tests (Services)

| Module                               | Test File                                   | Coverage Target |
| ------------------------------------ | ------------------------------------------- | --------------- |
| Intent detection                     | `tests/services/ai/intent.test.ts`          | 100%            |
| Mode detection                       | `tests/services/ai/mode.test.ts`            | 100%            |
| HTML extraction                      | `tests/services/ai/extraction.test.ts`      | 100%            |
| React manifest parsing               | `tests/services/ai/react-manifest.test.ts`  | 95%             |
| Fallback extraction                  | `tests/services/ai/fallback.test.ts`        | 90%             |
| Snapshot validation (`isHtmlUsable`) | `tests/services/ai/html-validation.test.ts` | 100%            |
| Patch mode                           | `tests/services/ai/patch.test.ts`           | 90%             |
| Change summary                       | `tests/services/ai/change-summary.test.ts`  | 90%             |

### Layer 2: Integration Tests (Routes)

| Route                      | Test File                        | Coverage Target |
| -------------------------- | -------------------------------- | --------------- |
| Project CRUD               | `tests/routes/projects.test.ts`  | 85%             |
| Share flow (HTML + React)  | `tests/routes/share.test.ts`     | 90%             |
| Deploy validation          | `tests/routes/deploy.test.ts`    | 85%             |
| GitHub auth                | `tests/routes/github.test.ts`    | 90%             |
| Proxy safety               | `tests/routes/proxy.test.ts`     | 90%             |
| Project authorization      | `tests/routes/auth.test.ts`      | 100%            |
| Runtime/jobs authorization | `tests/routes/runtime.test.ts`   | 90%             |
| Snapshot restore           | `tests/routes/snapshots.test.ts` | 95%             |

### Layer 3: End-to-End Tests

| Scenario                         | Priority |
| -------------------------------- | -------- |
| User creates first HTML project  | HIGH     |
| User creates React project       | HIGH     |
| User restores snapshot           | HIGH     |
| User deploys to Netlify          | MEDIUM   |
| User shares project              | HIGH     |
| User connects GitHub             | MEDIUM   |
| User adds integration (Supabase) | MEDIUM   |
| Team member views shared project | MEDIUM   |
| Rate limit enforcement           | HIGH     |
| Terminal command blocking        | HIGH     |

---

## CI Checks

```yaml
# .github/workflows/ci.yml (or Replit equivalent)
jobs:
  typecheck:
    - pnpm --filter @workspace/api-server exec tsc --noEmit
    - pnpm --filter @workspace/app-builder exec tsc --noEmit

  test:
    - pnpm --filter @workspace/api-server test

  build-validation:
    - pnpm --filter @workspace/app-builder build
```

---

## Test Infrastructure

- **Framework**: Vitest (aligned with the Vite ecosystem)
- **HTTP Testing**: Supertest (for Express route tests)
- **DB**: Test database with fixture seeding
- **Mocking**: Vitest `vi.mock()` for Anthropic API, external services
- **Coverage**: Istanbul/c8 with 80% minimum threshold

---

## Priority Implementation Order

1. `isHtmlUsable` validation tests (guards data integrity)
2. Intent detection tests (guards AI routing)
3. Project authorization tests (guards security)
4. Share flow tests (guards user-facing feature)
5. Snapshot restore tests (guards versioning)
6. Proxy safety tests (guards security)
7. Remaining unit tests
8. E2E tests with Playwright
