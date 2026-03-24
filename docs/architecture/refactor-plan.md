# Refactor Plan

**Date:** 2026-03-22  
**Priority:** Phased, non-breaking

---

## Phase 3 — Break Up the God File

### Problem
`artifacts/api-server/src/routes/projects/index.ts` is **6,215 lines**. It contains:
- Route handlers (list, CRUD, messages, preview, share, snapshots, files, DB, secrets)
- Entire AI orchestration pipeline (intent detection, mode detection, prompt assembly, multi-agent pipeline, streaming, extraction, patching)
- All prompt constants (SHARED_OUTPUT_RULES, LANDING_PAGE_DESIGN_RULES, SHARED_LIBRARIES, etc.)
- Cache implementation
- HTML validation utilities
- Memory injection utilities

### Target Structure

```
artifacts/api-server/src/
├── routes/
│   └── projects/
│       ├── index.ts          # ← only mounts sub-routers, thin shell
│       ├── list.ts           # GET /
│       ├── create.ts         # POST /
│       ├── get.ts            # GET /:id
│       ├── update.ts         # PUT /:id / DELETE /:id
│       ├── messages.ts       # GET+POST /:id/messages (calls AI service)
│       ├── preview.ts        # GET /:id/preview
│       ├── snapshots.ts      # GET+POST /:id/snapshots
│       ├── share.ts          # POST /:id/share, GET /share/:token
│       ├── fork.ts           # POST /:id/fork
│       ├── files.ts          # Files CRUD
│       ├── database.ts       # DB provision + query
│       ├── secrets.ts        # Secrets CRUD
│       ├── analytics.ts      # Analytics events
│       ├── agent-run.ts      # POST /:id/agent-run
│       ├── review.ts         # POST /:id/ai-review
│       └── prompt-enhance.ts # POST /:id/enhance-prompt
└── services/
    ├── ai/
    │   ├── orchestrator.ts   # Main message → generation pipeline
    │   ├── intent.ts         # detectIntent() — isolated and testable
    │   ├── mode.ts           # detectMode() — isolated and testable
    │   ├── prompts/
    │   │   ├── shared-rules.ts         # SHARED_OUTPUT_RULES
    │   │   ├── landing-page.ts         # LANDING_PAGE_DESIGN_RULES
    │   │   ├── shared-libraries.ts     # SHARED_LIBRARIES
    │   │   ├── system-prompt.ts        # getSystemPrompt() assembler
    │   │   └── edit-prompt.ts          # Lightweight edit/fix prompt
    │   ├── extraction.ts     # extractHtml(), isHtmlUsable()
    │   ├── patching.ts       # applyPatch(), patch format parser
    │   ├── cache.ts          # AI response cache (key, get, set)
    │   ├── agents.ts         # Multi-agent pipeline runner
    │   └── streaming.ts      # SSE stream helpers
    ├── memory/
    │   ├── project-dna.ts    # Project DNA read/write/inject
    │   └── user-dna.ts       # User DNA read/write/inject
    └── projects/
        ├── snapshots.ts      # Snapshot create/restore logic
        └── files.ts          # File sync logic
```

### Migration Strategy
1. Extract prompt constants → `services/ai/prompts/`
2. Extract `detectIntent` + `detectMode` → `services/ai/intent.ts`, `services/ai/mode.ts`
3. Extract `extractHtml`, `isHtmlUsable`, `applyPatch` → extraction/patching services
4. Extract AI orchestrator (the ~3000-line message handler body) → `services/ai/orchestrator.ts`
5. Extract cache → `services/ai/cache.ts`
6. Split route handlers into individual files, each importing from services
7. Each step: ensure app still builds and runs before proceeding

---

## Phase 4 — Prompt System

- Move all prompts out of route files into `services/ai/prompts/`
- Add version field to each prompt constant
- Make intent detection and mode detection unit-testable in isolation
- Add telemetry (model used, prompt path, latency, tokens) to every AI call

---

## Phase 5 — Memory System

- Separate DNA extraction from storage from prompt injection
- Add clear schemas for projectDna and userDna
- Add memory ranking / relevance scoring
- Add admin debug endpoint to inspect memory state for a project

---

## Phase 6 — Frontend Product Shell

Priority missing pieces:
1. Onboarding flow (first-time user experience)
2. Workspace dashboard (project list, quick actions)
3. Version history panel (snapshots UI)
4. Diff viewer (before/after changes)
5. Deploy status panel (real states: idle/building/live/failed)
6. GitHub panel (connect/sync/status)
7. Memory/context panel (what the AI knows about this project)
8. Settings panel
9. Mode selection as a real first-class product concept

---

## Coupling Hotspots

| Hotspot | Impact | Plan |
|---|---|---|
| `projects/index.ts` — 6215 lines | Very high | Phase 3 split |
| AI orchestration in route handler | High | Phase 3 service extraction |
| Prompts as inline constants | High | Phase 4 prompt registry |
| Memory injection inline in message handler | Medium | Phase 5 memory service |
| No tests for intent/mode detection | Medium | Phase 17 |

---

## Dead Code / Disabled Features

- `ALLOWED_CMDS` regex in `terminal.ts` — defined but never enforced → removed in Phase 2
- Planning mode exists in backend (`planner.ts`) but is described as "effectively disabled" in UX — Phase 16
- SaaS generator panel — unclear usage → evaluate in Phase 3

---

## Estimated File Sizes After Phase 3

| File | Before | After |
|---|---|---|
| `routes/projects/index.ts` | 6,215 lines | ~200 lines (mounts only) |
| `services/ai/orchestrator.ts` | (new) | ~400 lines |
| `services/ai/prompts/` | (new) | ~300 lines total |
| `services/ai/intent.ts` | (new) | ~150 lines |
| `services/ai/extraction.ts` | (new) | ~100 lines |
| Route files (×15) | (new) | 30-80 lines each |
