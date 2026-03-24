# Repository Architecture Map

**Last updated:** 2026-03-22  
**Audited by:** Phase 1 — Full Repository Audit

---

## Overview

This is a monorepo (pnpm workspaces) hosting an AI-native website and app builder platform. Users describe what they want in Hebrew or English, and the platform generates, iterates, deploys, and version-controls complete web applications.

---

## Workspace Layout

```
/
├── artifacts/
│   ├── api-server/          # Node.js/Express backend (TypeScript, tsx)
│   └── app-builder/         # React + Vite frontend (TypeScript)
├── docs/                    # Architecture and security documentation
├── package.json             # Monorepo root
└── pnpm-workspace.yaml
```

---

## Package Boundaries

| Package                                | Role                                | Key Dependencies                    |
| -------------------------------------- | ----------------------------------- | ----------------------------------- |
| `@workspace/api-server`                | HTTP API + WebSocket server         | express, drizzle-orm, anthropic, ws |
| `@workspace/app-builder`               | React SPA (chat + preview + panels) | react, vite, tailwind, shadcn/ui    |
| `@workspace/db`                        | Shared Drizzle schema + DB pool     | drizzle-orm, postgres               |
| `@workspace/integrations-anthropic-ai` | Anthropic client wrapper            | @anthropic-ai/sdk                   |

---

## Runtime Entrypoints

| Entrypoint           | File                                     | Port               |
| -------------------- | ---------------------------------------- | ------------------ |
| API server           | `artifacts/api-server/src/index.ts`      | `$PORT` (8080 dev) |
| Frontend dev server  | `artifacts/app-builder/vite.config.ts`   | `$PORT` (varies)   |
| WebSocket — terminal | `/api/terminal` path on same HTTP server | same port          |
| WebSocket — collab   | `/api/collab` path on same HTTP server   | same port          |

---

## API Server Internal Structure

```
artifacts/api-server/src/
├── index.ts                    # HTTP server + WebSocket routing
├── app.ts                      # Express app, CORS, middleware, rate limiting
├── agents/
│   └── definitions.ts          # Agent prompt definitions (multi-agent pipeline)
├── lib/
│   ├── auth.ts                 # Session CRUD, OIDC config, cookie helpers
│   ├── cleanup.ts              # Scheduled DB cleanup jobs
│   ├── deploy-queue.ts         # Netlify deploy queue
│   ├── encryption.ts           # Secret encryption/decryption
│   ├── env-check.ts            # Startup env validation
│   ├── logger.ts               # Pino structured logger
│   ├── objectAcl.ts            # Object storage ACL helpers
│   └── objectStorage.ts        # GCS object storage abstraction
├── middlewares/
│   ├── authMiddleware.ts       # Attaches req.user from session cookie
│   ├── planLimits.ts           # Usage/plan quota enforcement
│   └── projectAuth.ts          # requireProjectAccess middleware
├── routes/
│   ├── index.ts                # Top-level router (mounts all sub-routers)
│   ├── auth.ts                 # OIDC login/callback/logout (199 lines)
│   ├── collab.ts               # Collab WebSocket handler (155 lines)
│   ├── terminal.ts             # Terminal WebSocket handler (109 lines) ⚠️ CRITICAL SECURITY RISK
│   ├── health.ts               # Health check endpoint
│   ├── proxy.ts                # CORS proxy + AI proxy endpoints ⚠️ UNAUTHENTICATED
│   ├── jobs.ts                 # Background jobs endpoint
│   ├── og-image.ts             # Open Graph image generation
│   ├── runtime.ts              # Runtime execution endpoint
│   ├── subscriptions.ts        # Subscription management
│   ├── teams.ts                # Team management
│   ├── templates.ts            # Template library
│   ├── user-dna.ts             # User profile DNA (AI memory)
│   ├── user-integrations.ts    # Third-party integration management
│   ├── whatsapp/
│   │   └── index.ts            # WhatsApp channel integration
│   ├── analytics/
│   │   └── insights.ts         # Analytics insights
│   └── projects/               # ⚠️ GOD MODULE — 6,215 lines
│       ├── index.ts            # Core project routes + entire AI pipeline
│       ├── bundle.ts           # React bundling (esbuild)
│       ├── comments.ts         # Project comments
│       ├── cost.ts             # Cost tracking
│       ├── deploy-brain.ts     # AI-assisted deployment decisions
│       ├── deploy.ts           # Netlify deploy management
│       ├── errors.ts           # Runtime error tracking
│       ├── performance.ts      # Performance monitoring
│       ├── planner.ts          # AI planning mode
│       ├── qa.ts               # Quality assurance runs
│       ├── saas-generator.ts   # SaaS app generator
│       ├── storage.ts          # Per-project object storage
│       ├── usage.ts            # Usage/token tracking
│       └── webhooks.ts         # Webhook management
└── __tests__/
    └── utils.test.ts
```

---

## Frontend Structure

```
artifacts/app-builder/src/
├── components/
│   ├── ChatPanel.tsx           # Main conversation UI
│   ├── PreviewPanel.tsx        # Live app preview (iframe)
│   ├── ProjectLayout.tsx       # Project workspace shell
│   ├── ProjectHeader.tsx       # Top bar with project controls
│   ├── Sidebar.tsx             # Left navigation
│   ├── Layout.tsx              # App-level layout
│   ├── CodeEditor.tsx          # File editor (Monaco-based)
│   ├── FileTree.tsx            # File tree navigator
│   ├── DeployPanel.tsx         # Deployment management UI
│   ├── DatabasePanel.tsx       # Per-project DB UI
│   ├── SecretsPanel.tsx        # Secrets management UI
│   ├── TerminalPanel.tsx       # Terminal WebSocket UI
│   ├── SnapshotsPanel.tsx      # (implied by routes)
│   ├── TeamPanel.tsx           # Collaboration UI
│   ├── ModeSelector.tsx        # Entrepreneur/Builder/Developer/Maker
│   ├── AgentMode.tsx           # Agent run UI
│   ├── BusinessMemoryPanel.tsx # AI memory inspection
│   ├── PlannerPanel.tsx        # AI planning mode UI
│   ├── QaPanel.tsx             # QA results UI
│   ├── ErrorsPanel.tsx         # Runtime error display
│   └── ui/                    # shadcn/ui component library
└── pages/ (or routes embedded in components)
```

---

## Database

- **Provider:** PostgreSQL via Drizzle ORM
- **Package:** `@workspace/db` (shared schema)
- **Schema location:** `packages/db/src/schema.ts` (inferred from imports)
- **Tables (inferred from code):**
  - `projects` — project records (id, userId, name, stack, mode, html, deletedAt, ...)
  - `messages` — chat message history per project
  - `snapshots` — project version history
  - `sessions` — auth sessions
  - `userDna` — user profile/preference memory
  - `projectDna` — per-project AI memory
  - `deployments` — deployment history
  - `projectFiles` — multi-file React projects
  - `projectSecrets` — encrypted per-project secrets
  - `analytics` — event tracking
  - `projectErrors` — runtime error log
  - `projectDatabase` — per-project provisioned DBs

---

## Auth Flow

```
User → /api/auth/login → OIDC redirect (Replit Auth)
     → /api/auth/callback → session created (cookie: sid, sameSite: lax)
     → authMiddleware → req.user populated on every request
     → clearSession on logout or expired token
```

Token refresh is handled automatically in `authMiddleware` via `refreshIfExpired()`.

---

## WebSocket Flow

```
HTTP server.on("upgrade") → wss.handleUpgrade → wss.emit("connection")
  → pathname === "/api/terminal" → handleTerminalWs (⚠️ NO AUTH)
  → pathname === "/api/collab"   → handleCollabWs (✅ auth checked)
  → else                         → ws.close(4004)
```

---

## AI Orchestration Flow (current — all inside projects/index.ts)

````
POST /api/projects/:id/messages
  → detectIntent()            — classify: create/edit/fix/add_feature/inspect
  → detectMode()              — classify: entrepreneur/builder/developer/maker
  → isHtmlUsable()            — validate existing HTML
  → cacheKey()                — projectId + content + intent + htmlHash
  → cache hit?                — return cached response
  → isCreateIntent?           — run 4-agent pipeline (Haiku × 3 + Sonnet × 1)
  → getSystemPrompt()         — assemble prompt (SHARED_OUTPUT_RULES + optional LANDING_PAGE_DESIGN_RULES)
  → claude stream             — Sonnet-4.5 streaming response
  → extractHtml()             — parse ```html block from response
  → applyPatch()              — apply <<<REPLACE>>> patches for edits
  → isHtmlUsable()            — validate output
  → saveProject()             — persist to DB + create snapshot
  → broadcastProjectUpdate()  — notify collab clients
  → stream text to client     — SSE stream of chat text
````

---

## Deploy Flow

```
POST /api/projects/:id/netlify-deploy
  → validate ownership
  → build HTML / bundle React
  → deploy-queue.ts → Netlify Sites API
  → poll status
  → update deployment record

/api/projects/:id/deployments (deploy.ts sub-router)
  → CRUD deployment records
  → status polling
```

---

## GitHub Sync Flow

```
projects/index.ts → githubSyncRouter (mounted at /:id/github)
  → connect repo
  → push files on demand
  → pull / sync
```

---

## Critical Issues Summary

| Issue                                                    | Severity | Location                   |
| -------------------------------------------------------- | -------- | -------------------------- |
| Terminal WS — no authentication                          | CRITICAL | `routes/terminal.ts`       |
| CORS — reflects all origins with credentials             | HIGH     | `app.ts` line 32           |
| Proxy/AI-proxy — unauthenticated                         | HIGH     | `routes/proxy.ts`          |
| God file — 6,215 lines, all logic in one file            | HIGH     | `routes/projects/index.ts` |
| Collab WS — ownership check bypassed for non-numeric IDs | MEDIUM   | `routes/collab.ts`         |
| ALLOWED_CMDS regex defined but never enforced            | MEDIUM   | `routes/terminal.ts`       |
| No input validation library (only ad-hoc checks)         | MEDIUM   | multiple routes            |
| No audit logging for risky operations                    | MEDIUM   | multiple routes            |
| Missing tests — only 1 test file                         | MEDIUM   | `__tests__/utils.test.ts`  |
