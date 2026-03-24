# Prompt Registry

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 4 — AI Orchestration

---

## Overview

All prompts are centrally managed in `artifacts/api-server/src/services/ai/`. The prompt registry ensures versioning, traceability, and clean separation from route logic.

**Current prompt version:** `4.0.0`  
**Defined in:** `services/ai/prompts/index.ts`

---

## Prompt Version Policy

- Bump **patch** (4.0.x) for wording tweaks that don't change behavior
- Bump **minor** (4.x.0) for new strategy additions or mode changes
- Bump **major** (x.0.0) for architectural prompt restructuring

The version is logged with every AI invocation in `usage_logs`.

---

## System Prompt

**File:** `services/ai/system-prompt.ts`  
**Function:** `getSystemPrompt(mode, integrations, projectType, stack)`

### Prompt Sections (in order)

1. **Platform identity** — what the AI is, what its job is
2. **Mode-specific behavior** — injected based on `userMode`
3. **Project context** — project type (website/webapp/landing/portfolio/mobile)
4. **Stack rules** — HTML vs React vs Next.js generation rules
5. **Patch mode instructions** — when to use `<<<REPLACE>>>` format
6. **Integration hints** — CDN libraries to use when specific integrations are active
7. **Output format rules** — Hebrew explanation before code, structured file output for React
8. **Quality rules** — responsive, accessible, production-grade output

### Mode Injections

| Mode | Prompt Emphasis |
|------|----------------|
| `entrepreneur` | Business value, quick wins, landing pages, conversions |
| `builder` | Product features, dashboards, admin panels, CRUD |
| `developer` | Clean architecture, components, APIs, TypeScript patterns |
| `maker` | Creative experiments, interactive prototypes, visual effects |

---

## Intent System

**File:** `services/ai/intent.ts`

### `detectChatIntent(message, hasExistingCode)`

Returns one of:

| Intent | Trigger | Strategy |
|--------|---------|----------|
| `build` | New project request | Full generation |
| `patch` | "Change X to Y" with existing code | Patch mode |
| `question` | "What is...", "How does..." | Text response only |
| `plan` | "Plan a..." | Planner agent |
| `debug` | "Fix the error", "It's broken" | Full re-generation or targeted patch |

### `getIntentSystemAddition(intent)`

Returns additional system prompt text specific to the detected intent.

### `detectContextualSuggestions(html, integrations)`

After generation, analyzes the output HTML to suggest relevant CDN libraries the user might want (Stripe.js, Chart.js, etc.).

---

## Per-Mode Prompts

**Directory:** `services/ai/prompts/`

Each mode gets prompt additions injected into the system prompt:

```
prompts/
  index.ts      — PROMPT_VERSION + shared constants
```

### CDN Library Registry

The system prompt includes rules for injecting CDN libraries based on detected usage patterns:

| Pattern Detected | CDN Injected |
|-----------------|--------------|
| `new Chart(` | Chart.js 4.x |
| `new ApexCharts(` | ApexCharts |
| `d3.` | D3.js |
| `L.map(` | Leaflet.js |
| `gsap.` | GSAP |
| `THREE.` | Three.js |
| `Stripe(` | Stripe.js |
| Bootstrap classes | Bootstrap 5 |
| Tailwind classes | Tailwind CDN |
| DaisyUI components | DaisyUI + Tailwind |
| Alpine.js directives | Alpine.js |
| AOS animations | AOS |

---

## Memory-Injected Prompts

### Project DNA Context

**Built by:** `buildDNAContext(dna)` in `services/memory/project-dna.ts`

Injected text includes:
- Project's purpose and audience
- Previous AI decisions ("last time we used X because Y")
- Tech preferences discovered from conversation
- Things the user explicitly liked/disliked

### User DNA Context

**Built by:** `buildUserDNAContext(userDna)` in `services/memory/project-dna.ts`

Injected text includes:
- User's skill level
- Cross-project preferences
- Design aesthetic preferences
- Framework preferences

### Memory Chunk Context

**Built by:** `buildMemoryChunkContext(chunks)` in `services/memory/project-dna.ts`

Top-scored relevant memory chunks from previous conversations injected as context.

---

## Prompt Anti-Patterns

The following are explicitly avoided in the prompt system:

1. **System prompt in user turn** — all instructions are in the system role
2. **Unconstrained code execution** — AI cannot trigger server-side actions
3. **Secrets in prompts** — project secrets never injected into AI context
4. **Unbounded context** — history trimmed to 20 messages, 6k chars each
5. **Mode confusion** — mode is set by the server, not user-instructable
