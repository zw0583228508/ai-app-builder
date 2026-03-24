# Frontend Component Map — Phase 8

**Date**: 2026-03-22

---

## Component Hierarchy

### Pages (`src/pages/`)

- `Home.tsx` — Dashboard / project gallery
- `ProjectView.tsx` — Main project editor page
- `ShareView.tsx` — Public project share page
- `Gallery.tsx` — Template/project gallery
- `Memory.tsx` — User memory/DNA view
- `Pricing.tsx` — Subscription pricing
- `Integrations.tsx` — Third-party integrations
- `Analytics.tsx` — Analytics dashboard
- `Login.tsx` — Auth page
- `Status.tsx` — Platform status
- `Terms.tsx` / `Privacy.tsx` — Legal
- `not-found.tsx` — 404 page

### Core Layout Components (`src/components/`)

- `Layout.tsx` — Root layout wrapper (nav, footer)
- `ProjectLayout.tsx` — Project editor layout
- `Sidebar.tsx` — Project panel navigation sidebar
- `ProjectHeader.tsx` — Project name, GitHub sync, share button
- `ErrorBoundary.tsx` — React error boundary

### Chat Components

- `ChatPanel.tsx` — Main AI chat interface
- `MessageBubble.tsx` — Individual message rendering (code, text, patches)

### Preview Components

- `PreviewPanel.tsx` — Iframe preview + refresh logic
- `PreviewToolsMenu.tsx` — Preview toolbar (refresh, open, fullscreen)
- `PreviewExportMenu.tsx` — Export options
- `PreviewHistoryMenu.tsx` — Snapshot history selector
- `PreviewShareDialog.tsx` — Share dialog

### File Management

- `ProjectFilesPanel.tsx` — File explorer panel
- `ProjectFilesPanelHelpers.tsx` — File panel utilities
- `FileTree.tsx` — Tree view component
- `CodeEditor.tsx` — Monaco-based code editor

### AI/Agent Components

- `ModeSelector.tsx` — Entrepreneur/Builder/Developer/Maker selector
- `AgentMode.tsx` — Autonomous agent task runner
- `PlannerPanel.tsx` — Guided spec/planning flow

### Platform Panels

- `DeployPanel.tsx` — Netlify/Vercel deployment
- `DeployBrainPanel.tsx` — AI-powered deploy assistant
- `BusinessMemoryPanel.tsx` — Project memory + DNA view
- `TemplatesModal.tsx` — Template gallery modal
- `QaPanel.tsx` — Automated QA testing
- `ErrorsPanel.tsx` — Runtime error tracking
- `PerformancePanel.tsx` — Performance metrics
- `CostPanel.tsx` — AI cost tracking
- `UsagePanel.tsx` — Usage statistics
- `StoragePanel.tsx` — File storage management
- `DatabasePanel.tsx` — Connected database browser
- `SecretsPanel.tsx` — Environment secrets manager
- `RuntimePanel.tsx` — Runtime environment panel
- `JobsPanel.tsx` — Background job queue
- `TerminalPanel.tsx` — WebSocket terminal
- `BillingPanel.tsx` — Subscription billing
- `SettingsPanel.tsx` — Project/account settings
- `OnboardingPanel.tsx` — New user onboarding
- `TeamPanel.tsx` — Team management
- `SaasGeneratorPanel.tsx` — SaaS app generator
- `WhatsAppPanel.tsx` — WhatsApp integration
- `TrustCard.tsx` — AI change summary trust layer
- `InsightsBanner.tsx` — AI suggestions banner

### Shared UI (`src/components/ui/`)

- shadcn/ui component library
- Custom Hebrew-adapted components

### Hooks (`src/hooks/`)

- `useProject.ts` — Project data fetching
- `useMessages.ts` — Chat messages management
- `useSSE.ts` — Server-sent events handler

### Data Layer (`src/lib/`, `src/data/`)

- API client configuration
- Type definitions
- Utility functions
