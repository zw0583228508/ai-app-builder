# Workspace UX

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 6 — Frontend Product Shell

---

## Overview

The workspace is the primary user interface — a three-panel layout where users interact with the AI (left), see their project preview (center), and access project settings/features (right).

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  TopBar — project name, mode selector, deploy button        │
├────────────┬─────────────────────────────┬──────────────────┤
│            │                             │                  │
│  ChatPanel │   PreviewPanel              │  SidePanel       │
│            │   (iframe preview)          │  (features)      │
│  Messages  │                             │                  │
│  Input     │   Preview controls:         │  Tabs:           │
│  Actions   │   - Reload                  │  - GitHub        │
│            │   - Mobile/Desktop toggle   │  - Deploy        │
│            │   - History viewer          │  - Analytics     │
│            │   - Share button            │  - Database      │
│            │                             │  - Secrets       │
│            │                             │  - Integrations  │
│            │                             │  - QA Tests      │
│            │                             │  - Review        │
│            │                             │  - Collab        │
└────────────┴─────────────────────────────┴──────────────────┘
```

---

## ChatPanel

**File:** `components/ChatPanel.tsx`

### Sections

- **Message list** — scrollable, RTL-aware, Hebrew interface
- **Message input** — text + optional voice input (Web Speech API)
- **Mode selector** — Entrepreneur / Builder / Developer / Maker
- **Action bar** — attach file, voice toggle, submit
- **TrustCard** — rendered after generation to summarize changes
- **Suggestions** — contextual next-action suggestions post-generation

### Message Types

| Type        | Visual                      |
| ----------- | --------------------------- |
| `user`      | Right-aligned, accent color |
| `assistant` | Left-aligned, neutral       |
| `system`    | Center, muted               |
| `error`     | Red border                  |
| `loading`   | Animated skeleton           |

### Streaming

Messages stream via SSE (Server-Sent Events). Events:

- `text` — incremental text content
- `code` — code generation progress
- `done` — final state with suggestions
- `changeSummary` — diff metadata for TrustCard

---

## PreviewPanel

**File:** `components/PreviewPanel.tsx`  
**File:** `components/PreviewPanel/` (sub-panels, lazy-loaded)

### Preview Modes

| Mode    | Description                           |
| ------- | ------------------------------------- |
| Default | Desktop preview of generated HTML/app |
| Mobile  | Simulated mobile viewport             |
| History | Version history with diff badges      |

### Lazy-Loaded Sub-Panels (17 panels)

All secondary sub-panels use `React.lazy()` for code splitting:

- `GitHubPanel`, `DeployPanel`, `AnalyticsPanel`
- `DatabasePanel`, `SecretsPanel`, `IntegrationsPanel`
- `QAPanel`, `ReviewPanel`, `CollabPanel`
- `PlannerPanel`, `TerminalPanel`, `PerformancePanel`
- - 5 more panels

This ensures the initial bundle is small — panels are loaded only when first opened.

---

## TrustCard

**File:** `components/TrustCard.tsx`

Shown after every AI generation. Provides:

- Change summary in plain Hebrew (e.g., "הוספתי 3 כפתורים ועיצבתי את הכותרת")
- `changePercent` — visual indicator of how much changed
- `filesChanged` — list of modified files (React projects)
- `diffStats` — lines added/removed
- Version badge and timestamp

Goal: build user trust by being explicit about what the AI did.

---

## History Viewer

**File:** `components/PreviewPanel/PreviewHistoryMenu.tsx`

- Shows all saved snapshots with timestamps
- Visual diff badge per version
- One-click restore to any previous version
- Shows `diffStats` (added/removed lines) per snapshot

---

## RTL & Hebrew

The workspace is built for Hebrew (right-to-left):

- `dir="rtl"` on root container
- `text-align: right` on all text elements
- RTL-aware flexbox layout (ChatPanel on right, SidePanel on left in visual order)
- All user-visible strings in Hebrew

---

## Mobile Responsiveness

- Below 768px: single-panel mode (Chat shown by default)
- Swipe gestures to switch panels (mobile)
- Preview panel hidden on mobile, accessible via "Preview" tab button
- All touch targets minimum 44x44px

---

## Error States

Every panel has:

- **Loading state** — skeleton loaders, no layout shift
- **Error state** — Hebrew error message, retry button
- **Empty state** — descriptive empty state with suggested action

---

## Performance Budget

- Initial JS bundle: < 300KB gzipped (lazy loading enforced)
- Time-to-interactive: < 3s on 4G
- Preview iframe load: < 2s for typical generated page
- SSE streaming latency: first token < 1s
