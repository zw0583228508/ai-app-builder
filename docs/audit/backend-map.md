# Backend Architecture Map

## Entry Points

```
src/index.ts          Server bootstrap (env check, cleanup, listen)
src/app.ts            Express app: CORS, rate limiting, middleware, routes
src/routes/index.ts   Route mounting (all top-level routers)
```

## Route Structure

```
/api/
  auth.*              OIDC login/logout/user session
  projects/
    CRUD:
      POST   /         create-project.ts
      GET    /:id      get-project.ts
      PUT    /:id      update-project.ts
      DELETE /:id      delete-project.ts
    AI:
      POST   /:id/messages       AI SSE stream (messages.ts — 2127 lines)
      POST   /:id/agent-run      Multi-step agent orchestration
      POST   /:id/prompt-enhance Prompt improvement
      POST   /:id/review         Code quality review
    Files:
      GET/PUT/DELETE /:id/files   project files (files.ts)
    Preview:
      GET    /:id/preview         HTML preview render
      GET    /:id/bundle          React esbuild bundle
    Snapshots:
      GET    /:id/snapshots       list snapshots
      GET    /:id/snapshots/:sid  render snapshot
      POST   /:id/snapshots/restore/:sid
    Share:
      POST   /:id/share           generate share token
      PATCH  /:id/custom-slug     set custom URL slug
      GET    /share/:token        public share render
    Deploy:
      GET/POST/DELETE /:id/deployments  deployment management (deploy.ts)
      POST   /:id/netlify-deploy        legacy direct deploy
    GitHub:
      GET/POST/DELETE /:id/github  sync routes (github-sync.ts)
    AI Tools:
      POST   /:id/deploy-brain    AI deployment recommendations
      POST   /:id/plan            Guided planning/spec
      POST   /:id/qa              QA test generation
      POST   /:id/cost            Cost estimation
      POST   /:id/saas-generator  SaaS boilerplate generation
    Analytics:
      GET    /:id/analytics       usage stats (analytics.ts)
    Database:
      POST   /:id/db/query        run project DB query (database.ts)
    Secrets:
      GET/POST/DELETE /:id/secrets project secrets (secrets.ts)
    Misc:
      GET/POST /:id/comments      collaboration comments
      GET/POST /:id/webhooks      outbound webhooks
      GET/POST /:id/errors        error reporting
      GET/POST /:id/performance   performance metrics
      GET/POST /:id/storage       object storage
      GET/POST /:id/usage         token usage stats
  teams.*             Team CRUD and membership
  templates.*         Template gallery
  subscriptions.*     Plan management
  runtime.*           Simulated runtime environment
  jobs.*              Background job queue
  terminal (WS)       Interactive bash terminal
  proxy               CORS proxy for generated apps
  ai-proxy            Claude proxy for generated apps
  health              Healthcheck endpoint
  og-image            OG image generation
  user-dna            User DNA profile
  user-integrations   Integration credentials
  collab (WS)         Real-time collaboration broadcast
  analytics/insights  Platform-level analytics
  whatsapp/           WhatsApp integration (experimental)
```

## Middleware Stack

```
pino-http → CORS → cookieParser → express.json → authMiddleware
→ rateLimit(general) → rateLimit(ai messages) → routes
```

## Services

```
services/ai/
  agents.ts           4 specialist agents (architecture/ui/security/performance)
  cache/              Semantic prompt cache
  change-summary.ts   Diff stats computation
  continuation/       Multi-turn context management
  extraction/         HTML + React file extraction
  intent.ts           Intent classification
  mode.ts             User mode detection
  patching/           Patch block application
  preview.ts          CDN injection + visual editor script
  prompts/            System prompts per mode (entrepreneur/builder/developer/maker)
  registry/           Prompt version registry
  routing/            Intent → strategy routing
  structured-output/  TypeScript interfaces for AI output
  system-prompt.ts    Main system prompt assembler
  telemetry/          AI call logging
services/memory/
  project-dna.ts      Project DNA extraction, scoring, injection
services/projects/    Project CRUD service layer
services/security/    Sanitization, HMAC, token generation
services/telemetry.ts Usage logging
services/rate-limit.ts Rate limiter helpers
```
