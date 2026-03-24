# API Route Map

**Last updated:** 2026-03-22

---

## Top-Level Routes (`routes/index.ts`)

| Method | Path | Auth | File |
|---|---|---|---|
| GET | `/api/csrf-token` | No | `routes/index.ts` |
| * | `/api/health` | No | `routes/health.ts` |
| * | `/api/auth/*` | No | `routes/auth.ts` |
| * | `/api/projects/*` | Yes (middleware) | `routes/projects/index.ts` |
| * | `/api/teams/*` | Yes | `routes/teams.ts` |
| * | `/api/templates/*` | Yes | `routes/templates.ts` |
| * | `/api/analytics/insights` | Yes | `routes/analytics/insights.ts` |
| * | `/api/whatsapp/*` | Yes | `routes/whatsapp/index.ts` |
| * | `/api/user-dna/*` | Yes | `routes/user-dna.ts` |
| * | `/api/runtime/*` | Yes | `routes/runtime.ts` |
| * | `/api/jobs/*` | Yes | `routes/jobs.ts` |
| * | `/api/subscriptions/*` | Yes | `routes/subscriptions.ts` |
| * | `/api/user-integrations/*` | Yes | `routes/user-integrations.ts` |
| GET | `/api/og-image` | No | `routes/og-image.ts` |
| * | `/api/proxy` | ⚠️ NO | `routes/proxy.ts` |
| POST | `/api/ai-proxy` | ⚠️ NO | `routes/proxy.ts` |

---

## WebSocket Routes (`index.ts`)

| Path | Auth | Handler |
|---|---|---|
| `WS /api/terminal` | ⚠️ NONE | `routes/terminal.ts` |
| `WS /api/collab` | ✅ Session cookie or Bearer | `routes/collab.ts` |

---

## Auth Routes (`routes/auth.ts`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/login` | Initiates OIDC flow |
| GET | `/api/auth/callback` | OIDC callback, sets session cookie |
| POST | `/api/auth/logout` | Clears session |
| GET | `/api/auth/session` | Returns current user |

---

## Project Routes (`routes/projects/index.ts` — 6,215 lines)

### Project CRUD

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects` | ✅ | List user's projects |
| POST | `/api/projects` | ✅ | Create project |
| GET | `/api/projects/:id` | ✅ ownership | Get project |
| PUT | `/api/projects/:id` | ✅ ownership | Update project metadata |
| DELETE | `/api/projects/:id` | ✅ ownership | Soft-delete project |
| DELETE | `/api/projects/:id/purge` | ✅ ownership | Hard-delete project |
| PUT | `/api/projects/:id/mode` | ✅ ownership | Change AI mode |
| POST | `/api/projects/:id/fork` | ✅ | Fork project |

### Messaging / AI

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/:id/messages` | ✅ | Get message history |
| POST | `/api/projects/:id/messages` | ✅ | Send message → AI generation (main handler, ~3000 lines) |
| POST | `/api/projects/:id/enhance-prompt` | ✅ | AI prompt enhancement |
| POST | `/api/projects/:id/ai-review` | ✅ | AI code review |
| POST | `/api/projects/:id/agent-run` | ✅ | Manual agent run |

### Preview / Share

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/:id/preview` | ✅ | Get live preview HTML |
| POST | `/api/projects/:id/share` | ✅ | Generate share token |
| PATCH | `/api/projects/:id/custom-slug` | ✅ | Set custom share slug |
| GET | `/api/projects/share/:token` | ❌ Public | Get shared project |

### Snapshots / Versioning

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/:id/snapshots` | ✅ | List snapshots |
| GET | `/api/projects/:id/snapshots/:snapshotId` | ✅ | Get snapshot |
| POST | `/api/projects/:id/snapshots/restore/:snapshotId` | ✅ | Restore snapshot |

### Files (multi-file React projects)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/:id/files` | ✅ | List project files |
| GET | `/api/projects/:id/files/:fileId` | ✅ | Get file content |
| POST | `/api/projects/:id/files` | ✅ | Create file |
| PUT | `/api/projects/:id/files/:fileId` | ✅ | Update file |
| DELETE | `/api/projects/:id/files/:fileId` | ✅ | Delete file |

### Database

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/:id/db/status` | ✅ | DB provision status |
| POST | `/api/projects/:id/db/provision` | ✅ | Provision project DB |
| GET | `/api/projects/:id/db/tables` | ✅ | List DB tables |
| POST | `/api/projects/:id/db/query` | ✅ | Run SQL query |

### Secrets

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/:id/secrets` | ✅ | List secrets (masked) |
| POST | `/api/projects/:id/secrets` | ✅ | Create/update secret |
| DELETE | `/api/projects/:id/secrets/:secretId` | ✅ | Delete secret |

### Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/analytics/summary` | ✅ | Analytics summary |
| POST | `/api/projects/:id/analytics/event` | ✅ | Track event |

### Sub-routers (mounted from `index.ts`)

| Mount path | File | Description |
|---|---|---|
| `/api/projects/` | `bundle.ts` | React bundling (esbuild) |
| `/api/projects/:id/storage` | `storage.ts` | Object storage |
| `/api/projects/:id/deployments` | `deploy.ts` | Netlify deployments |
| `/api/projects/:id/usage` | `usage.ts` | Token/usage tracking |
| `/api/projects/` | `comments.ts` | Project comments |
| `/api/projects/:id/webhooks` | `webhooks.ts` | Webhook management |
| `/api/projects/:id/errors` | `errors.ts` | Runtime errors |
| `/api/projects/:id/performance` | `performance.ts` | Perf monitoring |
| `/api/projects/:id/github` | `(inferred)` | GitHub sync |
| `/api/projects/:id/plan` | `planner.ts` | AI planning |
| `/api/projects/:id/deploy-brain` | `deploy-brain.ts` | AI deploy assist |
| `/api/projects/:id/qa` | `qa.ts` | QA runs |
| `/api/projects/:id/cost` | `cost.ts` | Cost tracking |
| `/api/projects/:id/saas-generator` | `saas-generator.ts` | SaaS generator |

---

## Rate Limits

| Path | Limit | Window | Key |
|---|---|---|---|
| `/api/*` (writes) | 120 req | 60s | IP |
| `/api/projects/:id/messages` | 20 req | 60s | user ID |
| `/api/projects/:id/deployments` (writes) | 5 req | 5min | user ID |
