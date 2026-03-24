# Changelog

All notable changes to this project will be documented in this file.
Format: [Semantic Versioning](https://semver.org/).

---

## [0.5.0] - 2026-03-22

### Added

- **Trust Layer**: TrustCard component shows live change summary after every AI generation (lines added/removed, change %, sections affected, generation type)
- **Change Summary Service**: `change-summary.ts` computes diff metrics between HTML snapshots (full, patch, react, plan types)
- **Version History badges**: GenTypeBadge (Full / Patch / React) and DiffBadge (±N lines) on each snapshot entry in the history menu
- **Snapshot diff stats**: `diff_stats` jsonb column on `project_snapshots` stores `ChangeSummary` per version
- **React bundle cache**: SHA-256 hash-keyed in-memory LRU cache (50 entries, 10-min TTL) with `X-Bundle-Cache: HIT/MISS` header; auto-invalidated on file save
- **Deployment WebSocket broadcast**: Live push to all connected clients when Netlify/Vercel deploy succeeds or fails (`deploymentStatus`, `deploymentUrl`)
- **GitHub sync improvements**: Real `/status` endpoint, parallel 4-concurrent uploads, auto-generates README.md for new repos, persists `githubRepoUrl` + `githubRepoName` on project
- **HMAC webhook signing**: `X-Hub-Signature-256: sha256=<HMAC>` header on all webhook deliveries (replaces raw secret header)
- **Collab deployment events**: `use-collab-presence.ts` dispatches `collab-project-event` CustomEvent for deployment status changes
- **Hebrew mode detection**: Developer mode now detects Hebrew tech keywords (ריאקט, קומפוננט, API…); Builder mode detects Hebrew product keywords (דשבורד, חנות, ניהול…)
- **Lazy panel loading**: 17 secondary panels (Terminal, Secrets, Database, Storage, Deploy, Team, Usage, Errors, Performance, WhatsApp, Planner, DeployBrain, QA, Cost, Runtime, Jobs, SaasGenerator) now loaded on demand with `React.lazy` — reduces initial JS bundle size
- **React error page tip**: Hebrew tip shown on bundle error: "שלח הודעה לסוכן: 'תקן את השגיאות'"
- **ProjectWithMessages type**: `githubRepoUrl`, `githubRepoName`, `lastDeployUrl` added to shared TypeScript type (was causing silent runtime-only access)

### Fixed

- TypeScript error: `hasUpdate` forward reference in `messages.ts` — inlined expression
- TypeScript error: `diffStats` cast `as unknown` for Drizzle jsonb compatibility
- TypeScript error: `ProjectWithMessages` missing `githubRepoUrl` / `lastDeployUrl` properties
- GitHub sync `/status` was returning stub `{ connected: false }` — now reads from actual project record

### Security

- Webhook payloads now signed with HMAC-SHA256; receivers can verify authenticity
- Webhook `secret` field excluded from GET /webhooks list response

---

## [Unreleased]

### Added

- Rate limiting on all API routes with stricter limits on AI chat and deployments
- Soft delete for projects (`deleted_at` column) — data is preserved for 30 days before cleanup
- GDPR hard-delete endpoint (`DELETE /api/projects/:id/purge`) for permanent data erasure
- DB indexes on all major foreign keys and lookup columns for improved query performance
- Collab heartbeat (30-second ping) to detect and clean up dead WebSocket connections
- Collab cursor broadcasting — live cursor positions shared between collaborators
- Deploy queue (p-queue based) with concurrency limit of 3 simultaneous deployments
- Input sanitization on chat messages — strips null bytes and control characters, 8k char limit
- Context trimming in AI chat — limits history to last 20 messages, truncates long responses
- DNA extraction retry — up to 3 attempts with exponential back-off on API errors
- Skeleton loaders on the Home page project list while data is loading
- ErrorBoundary wrapping the entire app for graceful error recovery
- Status page (`/status`) with live API and DB health check
- Pricing page (`/pricing`) with Free / Pro / Enterprise tiers
- Terms of Service page (`/terms`)
- Privacy Policy page (`/privacy`)
- Graceful shutdown handlers (SIGTERM/SIGINT) with 30-second force-kill timeout
- Health endpoint (`/api/healthz`) now includes DB connectivity check
- GitHub Actions CI workflow (type-check + build on push/PR to main)

### Fixed

- AI responses truncated at max_tokens limit now continue automatically (auto-continuation)
- `allow-same-origin` removed from iframe sandbox (security hardening)
- Voice input now uses `navigator.language` instead of hard-coded locale

### Security

- Rate limiting: 120 requests/min (general), 20/min (AI chat), 5/5min (deployments)
- Input sanitization prevents null byte injection and control character abuse
- Soft delete prevents accidental irreversible data loss

---

## [0.1.0] - 2026-01-01

### Added

- Initial release of AI App Builder
- Hebrew-first UI with RTL support
- Chat-driven app generation powered by Claude AI
- React / HTML / Next.js project stacks
- Live preview with auto-refresh
- Project snapshots and version history
- GitHub Sync integration
- Netlify deployment support
- Analytics dashboard
- Collab mode (multi-user real-time presence)
- Voice input (Web Speech API)
- Image generation via Pollinations.AI
