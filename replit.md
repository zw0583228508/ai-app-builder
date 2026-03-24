# Adaptive AI Platform — AI App Builder (בונה AI)

## Overview

The Adaptive AI Platform is an AI-powered web and app builder that allows users to generate complete web projects by chatting with Claude. It features an Adaptive AI System with four distinct user modes (Entrepreneur, Builder, Developer, Maker) that dynamically adjust communication style, system prompts, UI, and suggested ideas. The platform includes a Business Memory Layer that persists project DNA across sessions, supporting multi-file projects, a Monaco editor, per-project database/storage, and deployment to services like Netlify/Vercel. Key capabilities include team collaboration, analytics, error and performance monitoring, live cursors, webhooks, and a public gallery for templates. The vision is to provide a versatile and intuitive tool for users of varying technical backgrounds to bring their web projects to life efficiently.

## User Preferences

- **Entrepreneur Mode**: Expects business-oriented language, no technical jargon. Focuses on business advice and discovery questions related to market, audience, and goals.
- **Builder Mode**: Expects tech and product-oriented language, explanations of technical decisions, and alternative suggestions.
- **Developer Mode**: Prefers a peer-to-peer interaction style, focusing on production-grade code, security, and performance notes.
- **Maker Mode**: Prefers a playful interaction style, encouraging experimentation with creative technologies like Three.js, Canvas, WebGL, and WebAudio, and actively discourages monetization or scaling discussions.
- Users can switch modes automatically based on the first message or receive "Grow-With-Me" suggestions for mode upgrades mid-session.
- The AI should extract and save project DNA (business model, target audience, brand colors, creative vibe) after every AI response, and inject this DNA into future system prompts to maintain context.
- The AI should use `claude-haiku-4-5-20251001` for prompt enhancement and DNA extraction due to its speed and cost-efficiency.
- For heavy generation tasks, especially for the SaaS Generator, `claude-sonnet-4-5-20251001` should be used.
- All system prompts should adhere to shared output rules, including HTML output format, preservation rules, and premium design requirements.
- Planning and specification phases are disabled by default (`usePlanningPhase=false`, `useSpecGeneration=false`).

## System Architecture

### Monorepo Structure

The project is organized as a monorepo:

- `artifacts/api-server`: Express 5 + WebSocket API server.
- `artifacts/app-builder`: React + Vite frontend application.
- `lib/db`: Drizzle ORM with PostgreSQL schemas.
- `lib/api-zod`: Zod validators generated from OpenAPI spec.
- `lib/integrations-anthropic-ai`: Anthropic SDK wrapper.

### Core Technical Decisions

- **Authentication**: Cookie-based OIDC via Replit Auth.
- **Encryption**: AES-256-GCM for project secrets.
- **AI Models**: `claude-sonnet-4-5-20251001` for core generation, `claude-haiku-4-5-20251001` for prompt enhancement, DNA extraction, intent detection, and advanced AI tasks (Planner, Deploy Brain, QA, Cost Optimization). Prompt caching (cache_control: ephemeral) applied to system prompt.
- **Streaming**: Server-Sent Events (SSE) with typed events (text, code, done, error).
- **Real-time**: WebSocket for collaborative presence (cursors, viewers).
- **Database**: PostgreSQL managed by Drizzle ORM, with isolated schemas per project for databases.
- **AI System Prompts**: Dynamically selected based on user mode, integrations, project type, and stack, incorporating both `user_dna` and `project_dna` for contextual relevance.
- **UI/UX**: Dark theme with cyan accents, Rubik font for Hebrew (RTL), Plus Jakarta Sans/Inter for generated content. Maker mode features a distinct purple theme.
- **Multi-file Support**: Projects can be built with React/Next.js, Vue 3, Svelte, or Django stacks, using a specific multi-file manifest extraction format.
- **Live Preview**: esbuild for live bundling of React/JSX projects.
- **Monitoring**: Integrated error monitoring (`app_errors` table, `ErrorsPanel.tsx`) and performance monitoring via Google PageSpeed Insights (`PerformancePanel.tsx`).
- **Collaboration**: Live cursors via WebSocket, team management with roles, and inline code comments.
- **Security**: Rate limiting (express-rate-limit), input sanitization, AES-256-GCM encrypted vault for all integration secrets, HMAC-SHA256 signed webhooks, httpOnly/secure/sameSite=strict cookies, WebSocket collab membership check, X-Content-Type-Options + X-Frame-Options headers, `prompt-guard.ts` injection pattern detector (integrated in send.ts), `prompt-sanity-check.ts` hard fail-safe before every model call, `github-gist` server-side proxy (no tokens sent from client).
- **Advanced AI Systems**:
  - **Planner Agent**: Generates comprehensive project plans (features, screens, APIs, DB schema).
  - **Deployment Brain**: AI-powered recommendation for deployment strategies.
  - **AI QA System**: Auto-generates tests and suggests fixes.
  - **Cost Engine**: Tracks and optimizes resource costs (CPU, RAM, GPU, storage, bandwidth, AI tokens).
  - **SaaS Generator**: One-click generation of SaaS applications.
  - **Runtime Control Plane**: Manages project runtime environments.

## External Dependencies

- **Anthropic**: `claude-sonnet-4-5` and `claude-haiku-4-5-20251001` for AI capabilities.
- **PostgreSQL**: Primary database, accessed via Drizzle ORM.
- **Replit App Storage (GCS)**: Object storage for project assets.
- **Netlify API**: For project deployment and custom domains.
- **Vercel API**: For project deployment.
- **Google PageSpeed Insights**: For performance monitoring and reporting.
- **GitHub**: For Gist export and project syncing.
- **Unsplash**: For generating images within content.
- **CDN Libraries**: A curated selection of over 50 popular frontend libraries (e.g., Tailwind, Bootstrap, Three.js, Chart.js) are available for injection into generated projects.

## Security Architecture

### Prompt Injection Guard (`src/lib/prompt-guard.ts`)

- 13 pattern matchers detect prompt injection attempts before AI generation
- Returns HTTP 400 with `{ error: "invalid_input" }` on detection — never silently drops the request
- Covers: role override, system bypass, jailbreak phrases, Hebrew injection variants

### Audit Log (`src/services/audit-log.ts`)

- `logAudit(event)` covers 12 action types: `project.delete`, `deploy.trigger`, `deploy.success`, `github.sync`, `share.create`, `secret.create`, etc.
- Integrated in: project soft-delete, project purge, Netlify deploy success
- Structured JSON via `pino` logger with `audit: true` field for easy filtering

### Terminal WebSocket (`routes/terminal.ts`)

- Disabled by default in production (`ENABLE_TERMINAL=true` env required)
- `buildSafeEnv()` whitelist — only 19 safe env vars pass to child process (no server secrets)
- `BLOCKED_PATTERNS` array blocks: `rm -rf /`, `dd if=`, fork bombs, `sudo`, `curl|bash`, `mkfs`, etc.
- Hebrew user-facing blocked message + structured `logger.warn` with userId and command snippet

### esbuild Secret Injection (`routes/projects/bundle.ts`)

- `buildSafeEnv()` loads only `VITE_*`, `REACT_APP_*`, `NEXT_PUBLIC_*`, `PUBLIC_*` prefixed project secrets
- `buildDefine()` constructs esbuild `define` block — server secrets (DATABASE_URL, API keys) never reach the browser bundle
- Also injects `import.meta.env.VITE_XXX` defines for Vite compatibility

### Image URL Sanitization (`services/ai/preview.ts`)

- `isImageUrlSafe(url)` validates URLs against a trusted CDN allowlist (Unsplash, picsum, jsDelivr, etc.)
- `sanitizeImageUrls(html)` replaces untrusted `<img src>` and CSS `background-image` URLs with a placeholder
- Prevents SSRF and data exfiltration via AI-generated `<img>` tags

### Rate Limiting (`app.ts`)

- General API: 120 req/min (GET exempt)
- AI chat: 20 req/min per user
- Deployments: 5 req/5min per user
- Share endpoints: 20 req/min per user
- Webhook trigger: 10 req/5min per user
- Proxy (`/api/proxy`): 30 req/min per user
- AI proxy (`/api/ai-proxy`): 15 req/min per user

### Project Authorization

- Central `router.param("id", ...)` in `routes/projects/index.ts` enforces ownership on all project-scoped routes
- Runtime (`routes/runtime.ts`): added `checkProjectOwnership()` helper to GET, stop, restart handlers
- Jobs (`routes/jobs.ts`): added user ownership checks to GET/:id and POST/:id/cancel

### Templates Authorization (`routes/templates.ts`)

- `POST /api/templates` verifies the caller owns the source project before snapshotting it as a template
- `POST /api/templates/:id/use` blocks using private templates belonging to other users (403 Forbidden)

### CORS Policy

- In production: explicit allowlist via `ALLOWED_ORIGINS` env or derived from `REPLIT_DEV_DOMAIN`
- Development: permissive (all origins)

## AI System

### Prompt Caching (PERF-02)

- `cache_control: { type: "ephemeral" }` added to the system prompt block in the main Claude stream call
- Enables Claude's server-side caching — reduces latency ~85% and cost ~90% on cache hits
- System prompt is the largest repeating block (~3000-8000 tokens) — ideal for caching

### Code Extraction (`services/ai/code-extractor.ts`)

- `applyHtmlPatches(response, baseHtml)` — applies `<<<REPLACE>>>...<<<WITH>>>` patch format
- `extractHtml(response, opts)` — extracts HTML from fenced blocks, handles truncated responses
- `extractReactFiles(response)` — parses `FILE: path\n\`\`\`` format with 3-level fallback regex
- Removed 128 lines of inline logic from `ai-generation.ts` (1143 → 1015 lines)

### Token Optimization

- `SHARED_LIBRARIES` (~500 tokens) only injected for HTML/CSS stacks — not for React/Vue/Svelte/Django
- Additionally, `SHARED_LIBRARIES` is stripped for `fix`, `edit`, and `inspect` intents — saves ~500 tokens on all code-edit requests
- `getSystemPrompt()` accepts optional `intent` param to conditionally exclude library list
- Multi-agent analysis threshold: `350 chars & 25 words` (raised from 200/15)
- Haiku used for intent detection, planning agents, DNA extraction; Sonnet for final generation

### Memory System

- Fire-and-forget errors now logged with `logger.warn` (DNA extraction, chunk extraction)
- `logger` added to `messages.ts` imports for observability
- Unit tested: `scoreMemoryChunks`, `buildMemoryChunkContext`, `buildDNAContext` (12 test cases)

## Data Integrity

### Agent Run (`routes/projects/agent-run.ts`)

- `isHtmlUsable()` validation before persisting AI output
- Atomic DB transaction: project + project_files + snapshot saved together
- Snapshot only created if HTML passes quality check (min 200 chars, proper HTML structure)
- `broadcastProjectUpdate` only fires if HTML is valid

## Documentation

- `docs/security/final-hardening-report.md` — Phase 4 security hardening report
- `docs/ai/prompt-system.md` — AI prompt registry and selection logic
- `docs/ai/orchestration.md` — Full AI orchestration pipeline documentation
- `docs/ai/memory-cleanup.md` — Memory system cleanup and observability notes
- `docs/ai/token-optimization.md` — Token optimization strategy and savings estimates
- `docs/frontend/workspace-shell-plan.md` — Frontend workspace shell panel inventory
- `docs/frontend/component-map.md` — Full frontend component hierarchy
- `docs/engineering/testing-plan.md` — Testing plan with coverage targets and CI checks

## Testing Architecture

### Unit Test Suite (10 files, 133 tests)

- `prompt-guard.test.ts` — 27 cases: English + Hebrew injection detection, allowlist edge cases
- `project-ownership.test.ts` — 7 cases: IDOR 403/401/404/200 logic
- `auth-middleware.test.ts` — 4 cases: session attach, null user, no session
- `memory-functions.test.ts` — 12 cases: scoreMemoryChunks, buildDNAContext, buildMemoryChunkContext
- `intent-detection.test.ts`, `mode-detection.test.ts`, `html-utils.test.ts`, `preview-cdn.test.ts`, `terminal-safety.test.ts`, `utils.test.ts`

### E2E Tests (Playwright)

- `artifacts/app-builder/e2e/basic-flow.spec.ts` — home page, chat→stream, preview iframe
- Requires `E2E_BASE_URL` + `E2E_SESSION_COOKIE` env vars — skipped gracefully in CI

### Snapshot Writer (`routes/projects/messages/snapshot-writer.ts`)

- `isHtmlUsable()` — quality gate (min 800 chars, valid HTML structure, `</html>` at >40% position)
- `writeSnapshot()` — atomic DB transaction: HTML files → React files → snapshot → project update
- Extracted from ai-generation.ts: 1015 → 951 lines

## Execution Engine (v22)

### AI Tool Action System (`src/domain/ai-tools/`)

- **schemas.ts** — Zod schemas for 10 validated tool actions (create_file, update_file, read_file, delete_file, list_files, ensure_directory, install_dependencies, run_command, start_runtime, stop_runtime, get_project_state)
- **executor.ts** — Safe action dispatcher: validates schema → sandbox checks → executes → typed result
- **logger.ts** — Every tool call persisted to `tool_audit_log` DB table + pino structured log

### Workspace Manager (`src/domain/workspace/`)

- **workspace-manager.ts** — Per-project filesystem at `WORKSPACES_BASE_DIR/{projectId}/` with create/read/write/delete, snapshot before destructive ops, restore from snapshot
- **file-tree.ts** — Recursive file tree (excludes node_modules, .git) with AI-friendly text summary
- **metadata.ts** — `metadata.json` per workspace tracking file count and timestamps

### Execution Orchestrator (`src/agents/execution-orchestrator.ts`)

- Plan → Act → Observe → Repair feedback loop
- Uses Haiku for action choice and repair decisions
- 30-step max, 2 retries/step, 10 total, 3 repair attempts
- SSE events: `state_update`, `action_start`, `action_result`, `file_changed`, `log`, `repair_start`, `completed`, `failed`

### Real Runtime Manager (`src/domain/runtime/`)

- **runtime-manager.ts** — Real `child_process` start/stop (NOT simulated). Actual `running/stopped/failed` states. SIGTERM → 5s → SIGKILL on stop. stdout/stderr ring buffers (500/200 lines).
- **runtime-registry.ts** — In-memory projectId → ChildProcess map
- **resource-policy.ts** — Port allocation (14000–14999), concurrent runtime cap

### Sandbox Policy (`src/domain/sandbox/sandbox-policy.ts`)

- Path traversal prevention on all file ops
- Command allowlist (50+ safe binaries)
- Blocked shell metacharacters: ; & | ` $ ( ) { } [ ] < >
- Package name validation + blocked list (shelljs, sudo-prompt, etc.)
- Env var allowlist: VITE*\*, REACT_APP*\*, PORT, NODE_ENV only

### New API Endpoints (8 routes on `/api/projects/:id/`)

- `POST tools/execute` — execute one action
- `POST tools/execute-batch` — up to 20 actions in sequence
- `GET  workspace` — file tree + runtime status
- `POST workspace/init` — create project workspace
- `POST execute-goal` — SSE execution orchestrator stream
- `GET  runtime/logs` — stdout/stderr ring buffer
- `GET  runtime/stream` — live SSE log streaming

### DB Additions (T009)

- `tool_audit_log` table — full audit trail for every tool call
- New columns on `runtime_environments`: port, pid, workspace_path
- 12 new DB indexes across 5 tables (runtime, job_queue, cost_records, qa_test_results, deployment_plans)
