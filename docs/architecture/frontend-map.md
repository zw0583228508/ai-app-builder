# Frontend Architecture Map

**Last updated:** 2026-03-22  
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui  
**Package:** `@workspace/app-builder`

---

## Entry Point

```
index.html → src/main.tsx → <App /> → routing → workspace panels
```

---

## Component Hierarchy

```
App
└── Layout                        # App shell (nav, sidebar, content area)
    ├── [Dashboard / project list]
    │   └── CreateProjectModal    # New project creation flow
    └── ProjectLayout             # Workspace for a single project
        ├── ProjectHeader         # Top bar: project name, mode badge, actions
        ├── Sidebar               # Left panel navigation
        └── [active panel]
            ├── ChatPanel         # ← PRIMARY: conversation + AI generation
            ├── PreviewPanel      # Live iframe preview of generated app
            ├── CodeEditor        # Monaco editor for direct file editing
            ├── FileTree          # File tree for React/multi-file projects
            ├── ProjectFilesPanel # File management UI
            ├── DeployPanel       # Netlify deployment controls
            ├── DatabasePanel     # Per-project DB management
            ├── SecretsPanel      # Environment secrets UI
            ├── TerminalPanel     # Embedded terminal (WebSocket)
            ├── TeamPanel         # Collaboration / viewers
            ├── SnapshotsPanel    # (implied by routes) Version history
            ├── BusinessMemoryPanel  # AI memory inspection
            ├── PlannerPanel      # AI planning mode
            ├── DeployBrainPanel  # AI deploy advisor
            ├── QaPanel           # QA run results
            ├── ErrorsPanel       # Runtime error display
            ├── PerformancePanel  # Performance monitoring
            ├── JobsPanel         # Background jobs
            ├── RuntimePanel      # Runtime execution
            ├── CostPanel         # Token/cost tracking
            ├── StoragePanel      # Object storage
            ├── SaasGeneratorPanel # SaaS app generator
            ├── WhatsAppPanel     # WhatsApp channel
            ├── AgentMode         # Agent run UI
            ├── ModeSelector      # Entrepreneur/Builder/Developer/Maker
            ├── LanguageSelector  # UI language (Hebrew/English)
            ├── InsightsBanner    # Analytics insights banner
            └── TemplatesModal    # Template library
```

---

## Key Components (Detailed)

### `ChatPanel.tsx`
- Primary UI. Renders chat history and message input.
- Streams AI responses via SSE (`/api/projects/:id/messages`).
- Displays text response + code block toggle button.
- Handles: typing indicator, error states, file attachments.
- Missing: diff view, snapshot trigger visibility, generation metadata.

### `PreviewPanel.tsx`
- Renders generated HTML inside a sandboxed iframe.
- Refreshes on project update (via collab WebSocket broadcast).
- Handles: device size simulator (mobile/tablet/desktop), refresh button.
- Missing: error overlay for broken HTML, console log capture.

### `ProjectLayout.tsx`
- Workspace shell. Manages panel switching, collab WebSocket connection.
- Receives `project` data from API and distributes to child components.

### `ProjectHeader.tsx`
- Shows: project name, mode badge, share button, deploy button, snapshot count.
- Missing: deploy status indicator, last deployed time, GitHub sync status.

### `Sidebar.tsx`
- Navigation between panels.
- Missing: clear visual hierarchy, keyboard shortcuts, contextual hints.

### `CodeEditor.tsx`
- Monaco-based file editor.
- Supports: syntax highlighting, basic editing.
- Missing: diff view between versions, linting integration.

### `DeployPanel.tsx`
- Shows deployment history and triggers new deploys.
- Missing: real status machine (idle/building/live/failed), retry button, richer logs.

### `TerminalPanel.tsx`
- WebSocket terminal via `/api/terminal`.
- Now requires authentication (fixed in Phase 2).

### `ModeSelector.tsx`
- Lets user switch between Entrepreneur/Builder/Developer/Maker modes.
- Missing: mode explanation, visual distinction, per-mode defaults.

---

## Design System

| Layer | Tool |
|---|---|
| CSS framework | Tailwind CSS |
| Component library | shadcn/ui (Radix UI primitives) |
| Icons | Lucide React |
| Fonts | Rubik (RTL/Hebrew), system fallback |
| Color system | CSS custom properties via Tailwind config |
| Dark mode | Not fully implemented |
| RTL | `dir="rtl"` on Hebrew content, Rubik font |

**Primary color:** `#6366f1` (indigo)  
**Accent:** `#8b5cf6` (violet)

---

## State Management

- **React Query** (inferred from shadcn patterns) — for server state
- **React local state** — for UI-only state
- **No global state library** (no Redux/Zustand observed)

---

## API Integration

All API calls go to `/api/*` — proxied by Vite dev server to the API server in development.

Key patterns:
- Chat streaming: `EventSource` or `fetch` with `ReadableStream`
- Collab: native `WebSocket` to `/api/collab?projectId=&name=`
- Terminal: native `WebSocket` to `/api/terminal`
- Data fetching: `fetch` with JSON

---

## Missing Frontend Shell Pieces (Phase 6 targets)

| Missing Piece | Priority |
|---|---|
| Onboarding flow (first-time user) | HIGH |
| Real project dashboard (list + quick actions) | HIGH |
| Snapshot/version history panel with diff | HIGH |
| Deploy status machine (idle/building/live/failed) | HIGH |
| GitHub sync panel (connect/status/push) | HIGH |
| Memory/AI context panel (what AI knows) | MEDIUM |
| Mode selection as real UX concept | MEDIUM |
| Empty states for all panels | MEDIUM |
| Loading skeletons for all panels | MEDIUM |
| Settings panel | MEDIUM |
| Keyboard shortcuts | LOW |
| Diff viewer in ChatPanel | HIGH |
| Generation metadata in ChatPanel | MEDIUM |

---

## Frontend Files Overview

```
src/
├── components/           # All UI components (33 component files + ui/ library)
├── pages/                # Route pages (or embedded in components)
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── types/                # TypeScript type definitions
└── main.tsx              # App entry point
```
