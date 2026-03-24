# Frontend Component Map

## Pages / Routes

```
/                 Dashboard (project list)
/project/:id      Project workspace (ProjectLayout)
```

## Component Hierarchy

```
App.tsx
└── ProjectLayout.tsx         3-panel workspace shell
    ├── Sidebar.tsx            Navigation + mode selector
    ├── ChatPanel.tsx          AI conversation + streaming SSE
    │   ├── MessageBubble.tsx  Individual message rendering
    │   └── TrustCard.tsx      "What changed" summary card
    ├── PreviewPanel.tsx       iframe preview (HTML + React bundle)
    │   ├── PreviewToolsMenu.tsx   toolbar actions
    │   ├── PreviewHistoryMenu.tsx snapshot history
    │   ├── PreviewExportMenu.tsx  export actions
    │   └── PreviewShareDialog.tsx share link UI
    └── [right panels - contextual]
        ├── ProjectFilesPanel.tsx  file tree + editor
        ├── DeployPanel.tsx        deployment management
        ├── BusinessMemoryPanel.tsx project DNA viewer
        ├── QaPanel.tsx            QA results
        ├── DatabasePanel.tsx      DB query UI
        ├── SecretsPanel.tsx       secrets management
        ├── TeamPanel.tsx          team collaboration
        ├── TemplatesModal.tsx     template gallery
        ├── StoragePanel.tsx       object storage
        ├── RuntimePanel.tsx       runtime simulation
        ├── JobsPanel.tsx          background jobs
        ├── ErrorsPanel.tsx        error reporting
        ├── PerformancePanel.tsx   performance metrics
        ├── CostPanel.tsx          token cost tracking
        ├── PlannerPanel.tsx       guided build planner
        ├── DeployBrainPanel.tsx   AI deploy advisor
        ├── SaasGeneratorPanel.tsx SaaS boilerplate
        ├── InsightsBanner.tsx     usage/engagement insights
        ├── AgentMode.tsx          multi-agent pipeline UI
        ├── SettingsPanel.tsx      project settings
        ├── BillingPanel.tsx       usage & plan info
        └── OnboardingPanel.tsx    new user onboarding wizard
```

## Key Hooks

```
hooks/
  use-project.ts          Project data + refetch
  use-messages.ts         Message list
  use-integrations.ts     Integration credentials
  use-snapshots.ts        Snapshot list
  use-deployments.ts      Deployment status
  use-mode.ts             User mode state
```

## State Management

- Primary: @tanstack/react-query (server state)
- UI: useState / useRef for local ephemeral state
- No global client state store (intentional - server is source of truth)

## Data Flow (Chat → Preview)

```
User types → ChatPanel POST /messages (SSE)
  → onmessage: previewUpdated=true → invalidate project query
  → PreviewPanel reloads iframe src
  → For React: iframe = /:id/bundle endpoint
  → For HTML: iframe = /:id/preview or data URL
```
