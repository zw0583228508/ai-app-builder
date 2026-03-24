# AI Prompt System — Phase 6 Documentation

**Date**: 2026-03-22

---

## Overview

The prompt system is organized into a registry of typed prompt strings and factory functions. All prompts live under:

```
artifacts/api-server/src/services/ai/prompts/index.ts
```

---

## Prompt Registry

| Name                         | Purpose                                                       | Tokens (approx) |
| ---------------------------- | ------------------------------------------------------------- | --------------- |
| `ENTREPRENEUR_SYSTEM_PROMPT` | For non-technical founders — product language, no code jargon | ~2,800          |
| `BUILDER_SYSTEM_PROMPT`      | For product managers and startup builders                     | ~2,600          |
| `DEVELOPER_SYSTEM_PROMPT`    | For technical developers — explains architectural choices     | ~2,400          |
| `MAKER_SYSTEM_PROMPT`        | For indie hackers and makers                                  | ~2,200          |
| `REACT_STACK_RULES`          | Overrides base prompt for React/Next.js projects              | ~1,800          |
| `VUE_STACK_RULES`            | Vue.js-specific rules                                         | ~1,600          |
| `SVELTE_STACK_RULES`         | Svelte-specific rules                                         | ~1,600          |
| `DJANGO_STACK_RULES`         | Django/Python backend rules                                   | ~1,400          |
| `SHARED_LIBRARIES`           | CDN library list (only for HTML projects)                     | ~500            |
| `SHARED_OUTPUT_RULES`        | Output format rules shared across modes                       | ~400            |
| `PLANNING_SYSTEM_PROMPT`     | Used for spec/planning phase                                  | ~1,200          |
| `PRODUCT_SPEC_SYSTEM_PROMPT` | Product spec generation                                       | ~1,000          |

---

## Stack-Based Prompt Selection

The `getSystemPrompt()` function in `system-prompt.ts` selects the base prompt based on stack first:

```
stack=react/nextjs → REACT_STACK_RULES (no SHARED_LIBRARIES)
stack=vue          → VUE_STACK_RULES
stack=svelte       → SVELTE_STACK_RULES
stack=django       → DJANGO_STACK_RULES
stack=null/html    → Mode-specific prompt (includes SHARED_LIBRARIES)
```

`SHARED_LIBRARIES` is only injected for HTML/CSS projects. React/Vue/Svelte/Django stacks have their own CDN strategy.

---

## Token Optimization (Phase 6)

Changes made during Phase 6:

1. **SHARED_LIBRARIES conditional injection**: Not injected for React/Vue/Svelte/Django — saves ~500 tokens per request
2. **Multi-agent threshold raised**: From `200 chars & 15 words` to `350 chars & 25 words` — reduces unnecessary multi-agent invocations on small edits
3. **Mode detection**: Intent is classified before prompt assembly — only complex CREATE requests trigger multi-agent analysis

---

## Prompt Versioning

All prompts carry `PROMPT_VERSION = "4.0.0"` which is stamped on every AI response log entry. This allows correlating response quality with prompt version changes.

---

## Future Improvements

- Move prompt strings to separate `.md` or `.txt` files for easier non-engineer editing
- Add per-prompt unit tests that verify expected output shape
- Add token count estimation at startup to alert on prompt bloat
