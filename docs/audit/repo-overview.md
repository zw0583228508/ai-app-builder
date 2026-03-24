# Repository Overview

## Architecture

Full-stack monorepo managed by pnpm workspaces.

```
artifacts/
  api-server/       Node.js + Express backend (port 8080)
  app-builder/      React + Vite frontend
  mockup-sandbox/   Vite component preview server
lib/
  db/               Drizzle ORM schema + PostgreSQL client
  api-zod/          Shared Zod validation schemas
  integrations-*/   Third-party SDK wrappers (Anthropic, etc.)
docs/               Engineering documentation
```

## Backend Stack

- Runtime: Node.js + tsx (TypeScript)
- Framework: Express 5
- Database: PostgreSQL via Drizzle ORM
- Auth: Session-based (cookie + OIDC via Replit)
- AI: Anthropic Claude (Sonnet 4.5 for generation, Haiku 4.5 for analysis)
- Observability: Pino structured logging, Sentry error tracking
- Rate limiting: express-rate-limit (120/min general, 20/min for AI chat)
- WebSocket: ws (terminal, collab)

## Frontend Stack

- React 18 + Vite
- State: @tanstack/react-query
- Styling: Tailwind CSS + shadcn/ui
- Language: Hebrew (RTL) primary

## Key Feature Areas

1. AI Chat-to-Code generation (SSE streaming)
2. Multi-file React project support with esbuild bundling
3. Snapshot/versioning system
4. Deploy to Netlify/Vercel
5. GitHub sync
6. Terminal (WebSocket bash shell)
7. Memory system (Project DNA, User DNA, memory chunks)
8. Multi-agent analysis (Architecture, UI, Security, Performance agents)
9. Collaboration (WebSocket broadcast)
10. Templates gallery
11. Teams and subscription management

## Data Flow

```
User message → sanitize → intent detection → mode detection
  → memory context injection → system prompt assembly
  → Claude stream → extract HTML/React files
  → atomic DB transaction (previewHtml + project_files + snapshot)
  → broadcast update → SSE done event
```
