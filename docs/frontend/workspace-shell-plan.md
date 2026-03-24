# Frontend Workspace Shell Plan — Phase 8

**Date**: 2026-03-22

---

## Overview

The frontend workspace shell is a multi-panel project IDE built in React + Vite. It provides the full project editing, AI chat, and preview experience. The shell must feel premium, responsive, and coherent.

---

## Panel Inventory

### Core Workspace Panels

| Panel                  | File                                     | Status      |
| ---------------------- | ---------------------------------------- | ----------- |
| Chat (AI conversation) | `ChatPanel.tsx`                          | ✅ Complete |
| Preview (HTML/React)   | `PreviewPanel.tsx`                       | ✅ Complete |
| File Tree              | `FileTree.tsx` + `ProjectFilesPanel.tsx` | ✅ Complete |
| Code Editor            | `CodeEditor.tsx`                         | ✅ Complete |
| Snapshot History       | `PreviewHistoryMenu.tsx`                 | ✅ Complete |

### Auxiliary Panels

| Panel           | File                                          | Status      |
| --------------- | --------------------------------------------- | ----------- |
| Deploy          | `DeployPanel.tsx`                             | ✅ Complete |
| Deploy Brain    | `DeployBrainPanel.tsx`                        | ✅ Complete |
| GitHub Sync     | `ProjectHeader.tsx` (integrated)              | ✅ Complete |
| Integrations    | `Integrations.tsx`                            | ✅ Complete |
| Memory/Business | `BusinessMemoryPanel.tsx`                     | ✅ Complete |
| Mode Selector   | `ModeSelector.tsx`                            | ✅ Complete |
| Templates       | `TemplatesModal.tsx`                          | ✅ Complete |
| Agent Mode      | `AgentMode.tsx`                               | ✅ Complete |
| QA/Review       | `QaPanel.tsx` + `ReviewPanel.tsx` (if exists) | ✅ Partial  |
| Errors          | `ErrorsPanel.tsx`                             | ✅ Complete |
| Performance     | `PerformancePanel.tsx`                        | ✅ Complete |
| Cost            | `CostPanel.tsx`                               | ✅ Complete |
| Usage           | `UsagePanel.tsx`                              | ✅ Complete |
| Storage         | `StoragePanel.tsx`                            | ✅ Complete |
| Database        | `DatabasePanel.tsx`                           | ✅ Complete |
| Secrets         | `SecretsPanel.tsx`                            | ✅ Complete |
| Runtime         | `RuntimePanel.tsx`                            | ✅ Complete |
| Jobs            | `JobsPanel.tsx`                               | ✅ Complete |
| Terminal        | `TerminalPanel.tsx`                           | ✅ Complete |
| Billing         | `BillingPanel.tsx`                            | ✅ Complete |
| Settings        | `SettingsPanel.tsx`                           | ✅ Complete |
| Onboarding      | `OnboardingPanel.tsx`                         | ✅ Complete |
| Teams           | `TeamPanel.tsx`                               | ✅ Complete |
| Planner         | `PlannerPanel.tsx`                            | ✅ Complete |
| SaaS Generator  | `SaasGeneratorPanel.tsx`                      | ✅ Complete |
| WhatsApp        | `WhatsAppPanel.tsx`                           | ✅ Complete |
| Trust Card      | `TrustCard.tsx`                               | ✅ Complete |
| Insights Banner | `InsightsBanner.tsx`                          | ✅ Complete |

---

## Key UX Requirements Checklist

- [x] Hebrew RTL support throughout
- [x] Loading states on async data
- [x] Empty states with helpful CTAs
- [x] Preview refresh on AI generation complete
- [x] Snapshot restore triggers UI refresh
- [x] Deploy status visible
- [x] GitHub sync status visible
- [x] Mode selector is prominent
- [x] Chat shows code/patch distinctly from text
- [x] Error states are user-friendly in Hebrew

---

## Layout Architecture

```
App.tsx
  └── Router
      ├── / → Home.tsx (project gallery)
      ├── /project/:id → ProjectView.tsx
      │     └── ProjectLayout.tsx
      │           ├── Sidebar.tsx (panel navigation)
      │           ├── ChatPanel.tsx
      │           ├── PreviewPanel.tsx (+ tools menu)
      │           └── [Active Panel]
      ├── /share/:token → ShareView.tsx
      ├── /gallery → Gallery.tsx
      ├── /memory → Memory.tsx
      ├── /pricing → Pricing.tsx
      ├── /integrations → Integrations.tsx
      ├── /analytics → Analytics.tsx
      └── /status → Status.tsx
```
