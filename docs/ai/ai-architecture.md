# AI System Architecture

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 4 — AI Orchestration

---

## Overview

The AI system is a modular orchestration layer that routes user messages through intent detection, mode classification, prompt construction, model invocation, response extraction, and memory persistence.

All AI logic lives in `artifacts/api-server/src/services/ai/`.

---

## Architecture Diagram

```
User Message
     │
     ▼
┌─────────────────────────────────┐
│  Route Handler (messages.ts)    │
│  - auth check                   │
│  - rate limit                   │
│  - project ownership check      │
└──────────────┬──────────────────┘
               │
     ┌─────────▼──────────┐
     │  Mode Detection    │  services/ai/mode.ts
     │  detectUserMode()  │  (per-message, can upgrade)
     └─────────┬──────────┘
               │
     ┌─────────▼──────────┐
     │  Intent Detection  │  services/ai/intent.ts
     │  detectChatIntent  │  (what does the user want?)
     └─────────┬──────────┘
               │
     ┌─────────▼──────────┐
     │  Prompt Assembly   │  services/ai/system-prompt.ts
     │  getSystemPrompt() │  + services/ai/prompts/
     │  + Memory Inject   │  services/memory/project-dna.ts
     └─────────┬──────────┘
               │
     ┌─────────▼──────────┐
     │  Model Invocation  │  Anthropic Claude API
     │  claude-sonnet     │  (generation)
     │  claude-haiku      │  (fast tasks)
     └─────────┬──────────┘
               │
     ┌─────────▼──────────┐
     │  Response Extract  │  services/ai/preview.ts
     │  + Patch Apply     │  <<<REPLACE>>> patch engine
     │  + React Build     │  routes/projects/bundle.ts
     └─────────┬──────────┘
               │
     ┌─────────▼──────────┐
     │  Post-Processing   │
     │  - save snapshot   │  routes/projects/preview-routes.ts
     │  - compute diff    │  services/ai/change-summary.ts
     │  - inject CDN      │  services/ai/preview.ts
     │  - DNA extract     │  services/memory/project-dna.ts
     │  - bundle cache    │  routes/projects/bundle.ts
     └─────────┬──────────┘
               │
     ┌─────────▼──────────┐
     │  SSE Stream Done   │  changeSummary, suggestions,
     │  Event to Client   │  growWithMeSuggestion
     └────────────────────┘
```

---

## Core Files

| File                            | Purpose                                           |
| ------------------------------- | ------------------------------------------------- |
| `services/ai/mode.ts`           | Detect user mode from message content             |
| `services/ai/intent.ts`         | Detect intent (build, patch, question, plan)      |
| `services/ai/system-prompt.ts`  | Assemble the full system prompt                   |
| `services/ai/prompts/index.ts`  | Prompt versioning and registry constants          |
| `services/ai/preview.ts`        | HTML extraction, CDN injection, patch application |
| `services/ai/change-summary.ts` | Compute diff metadata between versions            |
| `services/ai/agents.ts`         | Agent orchestration helpers                       |

---

## Models

| Task                    | Model                        | Rationale                       |
| ----------------------- | ---------------------------- | ------------------------------- |
| Primary code generation | `claude-sonnet-4-5-20251001` | Full quality, complex reasoning |
| DNA extraction          | `claude-haiku-4-5-20251001`  | Speed + cost efficiency         |
| Planner Agent           | `claude-haiku-4-5-20251001`  | Structured JSON output          |
| QA test generation      | `claude-haiku-4-5-20251001`  | Structured test output          |
| Deployment Brain        | `claude-haiku-4-5-20251001`  | Recommendation output           |
| Cost optimization       | `claude-haiku-4-5-20251001`  | Analysis output                 |
| SaaS Generator          | `claude-sonnet-4-5-20251001` | Full app generation             |

**Prompt version:** `4.0.0` (defined in `services/ai/prompts/index.ts`)

---

## Generation Strategies

### 1. Full Generation

Used for: new projects, major rebuilds, first message  
Output: complete HTML/React file set  
Trigger: no existing `previewHtml`, or explicit full-rebuild intent

### 2. Patch Mode (HTML)

Used for: targeted edits to existing HTML projects  
Format: `<<<REPLACE>>>...<<<WITH>>>...<<<END>>>` blocks  
Applied by: `applyPatch()` in `services/ai/preview.ts`

### 3. React Multi-File Output

Used for: React/Next.js/multi-file projects  
Output: ONLY changed files, each prefixed with `// FILE: path/to/file.tsx`  
Bundled by: `esbuild` pipeline in `routes/projects/bundle.ts`

### 4. Auto-Continuation

Used when: AI response hits `max_tokens` limit  
Strategy: re-invoke with previous partial response as context  
Max attempts: 3

---

## Telemetry

Every AI invocation logs:

- prompt version (`PROMPT_VERSION`)
- model used
- mode (`userMode`)
- intent type
- input tokens, output tokens
- latency (ms)
- cache hit/miss (`X-Bundle-Cache` header for React)
- whether DNA was extracted

Telemetry stored in `usage_logs` table via `services/telemetry.ts`.

---

## Context Window Management

- Last **20 messages** included in context (configurable)
- Each historical message truncated to **6,000 characters**
- System prompt injected first
- Project DNA injected after system prompt
- User DNA injected after project DNA
- Memory chunks injected if relevant

Total target context: stays under Claude's 200k token limit with these limits.
