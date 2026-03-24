# Refactor Roadmap

## Completed

### Phase 3 — Route Modularization
- messages.ts extracted from giant index.ts
- All project routes in dedicated files
- router.param('id') handles auth centrally

### Phase 4 — AI Subfolder Structure
- extraction/, patching/, telemetry/, structured-output/ created
- Per-mode prompt packs in prompts/entrepreneur|builder|developer|maker/

### Domain + Services Layers
- domain/project, user, ai, deploy, integrations
- services/projects, security

## Active / Completed in This Pass

### SEC-001: Terminal security hardening
- Whitelist env vars, add FEATURE_TERMINAL flag, block dangerous commands

### DEF-001: Agent flow snapshot validation
- Add isHtmlUsable check before snapshot in agent-run path

### DEF-004: SHARED_LIBRARIES conditional injection
- Only inject for html/landing stacks, not react/nextjs

### DEF-005: Multi-agent threshold
- Raise to 300 chars + 20 words

### DEF-006: Memory fire-and-forget observability
- Add logger.warn for memory errors

## Pending / Future

### Large File Decomposition
- messages.ts (2127 lines) — should be split into:
  - routes/projects/messages/list.ts
  - routes/projects/messages/send.ts (with sub-handlers per intent)
  - routes/projects/messages/agent.ts
  - routes/projects/messages/streaming.ts

### React Multi-File Maturity
- Improved manifest parsing with stricter regex
- Better esbuild error reporting
- React snapshot support (save file manifest as snapshot)

### Deploy System
- Deployment queue with proper retry and status machine
- Better Vercel integration
- Custom domain safety

### GitHub Sync
- Incremental sync (only changed files)
- Branch selection
- PR creation workflow

### Testing
- Unit tests for intent detection, mode detection, extraction
- Integration tests for auth, project CRUD
- E2E tests for chat → preview flow

### Performance
- Bundle cache eviction improvements
- DB query optimization (add indexes)
- Reduce redundant DB queries in messages.ts hot path
