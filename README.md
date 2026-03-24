# AI App Builder

[![CI](https://github.com/zw0583228508/ai-app-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/zw0583228508/ai-app-builder/actions/workflows/ci.yml)

A full-stack AI-powered platform for building websites, web apps, and prototypes through natural language chat — with a Hebrew-language interface.

---

## What Is This?

AI App Builder lets users describe what they want in plain Hebrew (or English) and instantly generates a fully working website or application. It's not just a prompt-to-HTML toy — it's a production-grade platform with memory, versioning, deployments, GitHub sync, collaboration, and an adaptive AI that learns your style.

---

## Key Features

- **Chat-driven generation** — describe what you want, the AI builds it
- **Hebrew interface** — fully RTL, built for Hebrew-speaking users
- **Adaptive modes** — Entrepreneur / Builder / Developer / Maker — each with distinct AI behavior
- **Memory system** — the AI remembers your past projects and preferences
- **Version history** — every AI generation is snapshotted; restore any version
- **Live preview** — instant iframe preview after every generation
- **React + multi-file support** — generate full React projects with multiple components
- **GitHub sync** — one-click sync to any GitHub repo
- **Deploy to Netlify/Vercel** — one-click deployment
- **Project database** — each project gets its own PostgreSQL schema
- **Secrets management** — encrypted at rest, injected only at deploy time
- **Collaboration** — real-time presence, viewer counts, project broadcasting
- **QA & Review** — AI-generated test plans with Playwright, AI code review
- **Planning mode** — guided spec generation before building

---

## Tech Stack

| Layer             | Technology                                      |
| ----------------- | ----------------------------------------------- |
| Frontend          | React 18, Vite, TypeScript, Tailwind CSS        |
| Backend           | Node.js, Express, TypeScript                    |
| Database          | PostgreSQL (Drizzle ORM)                        |
| AI                | Anthropic Claude (claude-sonnet + claude-haiku) |
| Auth              | Replit OIDC (OpenID Connect)                    |
| Streaming         | Server-Sent Events (SSE)                        |
| WebSocket         | Collaboration (ws)                              |
| Bundler (preview) | esbuild (in-process React bundling)             |
| Package manager   | pnpm workspaces                                 |
| Encryption        | AES-256-GCM (for stored secrets/tokens)         |

---

## Repository Structure

```
/
├── artifacts/
│   ├── app-builder/          # React/Vite frontend
│   │   ├── src/
│   │   │   ├── components/   # UI components (ChatPanel, PreviewPanel, etc.)
│   │   │   ├── hooks/        # React hooks
│   │   │   └── pages/        # Route pages
│   │   └── e2e/              # Playwright E2E tests
│   │
│   ├── api-server/           # Express backend
│   │   └── src/
│   │       ├── routes/
│   │       │   └── projects/ # Modular project routes (11 modules)
│   │       ├── services/
│   │       │   ├── ai/       # AI orchestration layer
│   │       │   └── memory/   # Memory system
│   │       └── __tests__/    # Unit tests
│   │
│   └── mockup-sandbox/       # Component preview server (canvas)
│
├── lib/
│   ├── db/                   # Drizzle schema + migrations
│   ├── api-client-react/     # Auto-generated API client (React Query)
│   ├── api-zod/              # Zod validation schemas (auto-generated)
│   └── shared/               # Shared types and utilities
│
└── docs/
    ├── architecture/         # System architecture docs
    ├── security/             # Threat model + hardening checklist
    ├── ai/                   # AI system docs
    ├── product/              # UX + user flow docs
    └── engineering/          # Testing strategy
```

---

## How to Run Locally

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (or Replit DB)

### Setup

```bash
# Install all dependencies
pnpm install

# Set required environment variables (see below)
# Then run both services:

# Terminal 1 — API server
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
pnpm --filter @workspace/app-builder run dev
```

### Required Environment Variables

| Variable            | Required    | Description                                     |
| ------------------- | ----------- | ----------------------------------------------- |
| `DATABASE_URL`      | Yes         | PostgreSQL connection string                    |
| `SESSION_SECRET`    | Yes         | Express session signing secret (min 32 chars)   |
| `ANTHROPIC_API_KEY` | Yes\*       | Claude API key (\*or use Replit AI integration) |
| `ENCRYPTION_KEY`    | Recommended | AES key for encrypting stored tokens            |
| `NETLIFY_TOKEN`     | Optional    | For one-click Netlify deploys                   |
| `VERCEL_TOKEN`      | Optional    | For Vercel deploys                              |
| `GITHUB_APP_ID`     | Optional    | For GitHub sync                                 |
| `ALLOWED_ORIGINS`   | Production  | Comma-separated list of allowed CORS origins    |

---

## How AI Orchestration Works

```
User message
    ↓
detectUserMode()    → classify: entrepreneur / builder / developer / maker
detectChatIntent()  → classify: build / patch / question / plan / debug
getProjectDNA()     → inject project memory into system prompt
getSystemPrompt()   → assemble full prompt with mode + memory + intent hints
Anthropic Claude    → stream response via SSE
extractHtml()       → parse output, apply patches if needed
esbuild bundle      → if React project, bundle components
saveSnapshot()      → version saved
extractMemory()     → update project DNA + memory chunks (async)
changeSummary()     → compute diff stats for TrustCard
SSE "done" event    → send to client with suggestions
```

---

## Project Routes (API)

The API is split into 11 focused route modules under `/api/projects/:id/`:

| Route Module        | Endpoints                             |
| ------------------- | ------------------------------------- |
| `messages.ts`       | POST /messages — core AI chat         |
| `preview-routes.ts` | GET/POST preview, snapshots, versions |
| `deploy.ts`         | POST /deploy, GET /deploy/status      |
| `github.ts`         | POST /github/sync, GET /github/status |
| `database.ts`       | GET/POST db schema, POST db/query     |
| `analytics.ts`      | GET /analytics/summary, /events       |
| `qa.ts`             | POST /qa/run, GET /qa/results         |
| `collab.ts`         | WebSocket /collab, POST /collab/event |
| `planner.ts`        | POST /plan, GET /plan, PATCH /plan    |
| `bundle.ts`         | POST /bundle, GET /bundle/status      |
| `integrations.ts`   | GET/POST /integrations                |

All routes enforce authentication. All project routes verify ownership.

---

## Security Model

- **Auth:** Replit OIDC — sessions stored server-side in DB
- **Authorization:** ownership verified on every project endpoint (GET included)
- **Secrets:** AES-256-GCM encrypted at rest, never exposed in API responses
- **SQL:** project DB queries scoped to project schema only; DDL blocked
- **Rate limiting:** 120 req/min (general), 20/min (AI), 5/5min (deploys)
- **CORS:** explicit allowlist in production; deny-all fallback
- **Webhooks:** HMAC-SHA256 signed (`X-Hub-Signature-256`)

See `docs/security/threat-model.md` for full analysis.

---

## Memory System

The AI remembers:

1. **Project DNA** — what each project is, past decisions, preferences
2. **User DNA** — cross-project skill level and design preferences
3. **Memory chunks** — semantic fragments extracted from conversations

Memory is extracted after every generation (async, non-blocking) and injected into the next AI call's system prompt. See `docs/ai/memory-system.md`.

---

## Contributing Safely

1. Run `pnpm tsc --noEmit` before committing — 0 TypeScript errors required
2. Add unit tests for any new pure logic in `services/ai/` or `services/memory/`
3. Do not add secrets to code or git history
4. Do not change ID column types in the DB schema
5. Do not break the route auth middleware chain
6. Read `docs/security/hardening-checklist.md` before adding new endpoints
7. Bump `PROMPT_VERSION` in `services/ai/prompts/index.ts` when changing AI behavior

---

## Documentation Index

| Doc                 | Path                                   |
| ------------------- | -------------------------------------- |
| Repository map      | `docs/architecture/repo-map.md`        |
| API map             | `docs/architecture/api-map.md`         |
| Data model          | `docs/architecture/data-model.md`      |
| Frontend map        | `docs/architecture/frontend-map.md`    |
| Threat model        | `docs/security/threat-model.md`        |
| Hardening checklist | `docs/security/hardening-checklist.md` |
| AI architecture     | `docs/ai/ai-architecture.md`           |
| Prompt registry     | `docs/ai/prompt-registry.md`           |
| Intent routing      | `docs/ai/intent-routing.md`            |
| Mode system         | `docs/ai/mode-system.md`               |
| Memory system       | `docs/ai/memory-system.md`             |
| Workspace UX        | `docs/product/workspace-ux.md`         |
| Design system       | `docs/product/design-system.md`        |
| User flows          | `docs/product/user-flows.md`           |
| Testing strategy    | `docs/engineering/testing-strategy.md` |
| Changelog           | `CHANGELOG.md`                         |
