# Token Optimization — Phase 6 Documentation

**Date**: 2026-03-22

---

## Problem Statement

AI generation costs are driven by input token count. Every request to Claude includes:
- System prompt (~1,800–3,000 tokens depending on mode)
- `SHARED_LIBRARIES` CDN list (~500 tokens, only for HTML)
- Project context (history, files, DNA, memory)
- User message

Unnecessary token bloat in the system prompt wastes money on every request.

---

## Optimizations Applied

### 1. SHARED_LIBRARIES Conditional Injection

**Before**: `SHARED_LIBRARIES` was always appended to all 4 mode prompts.

**After**: It is only included for HTML/CSS projects. React, Vue, Svelte, and Django stacks have their own dependency management and don't need the CDN library list.

```
stack=react/nextjs → REACT_STACK_RULES (no SHARED_LIBRARIES) → saves ~500 tokens
stack=vue          → VUE_STACK_RULES (no SHARED_LIBRARIES) → saves ~500 tokens
stack=svelte       → SVELTE_STACK_RULES (no SHARED_LIBRARIES) → saves ~500 tokens
stack=django       → DJANGO_STACK_RULES (no SHARED_LIBRARIES) → saves ~500 tokens
stack=null/html    → Mode prompt + SHARED_LIBRARIES → correct
```

**Estimated savings**: 500 tokens × ~40% of requests (React projects) = ~200 tokens/request average.

### 2. Multi-Agent Analysis Threshold Raised

**Before**: Multi-agent architecture + UI agents ran when:
- First message, OR
- `content.length > 200 && words > 15` — very aggressive

**After**: Threshold raised to:
- First message, OR
- Planning answer message, OR
- `content.length > 350 && words > 25` — only for genuinely complex requests

Multi-agent analysis adds ~3,000 tokens (2 agent calls) and ~3–5 seconds latency. Reducing unnecessary triggers saves significantly on complex projects where short edits are common.

**Estimated savings**: 3,000 tokens × ~30% reduction in trigger rate = ~900 tokens/request average.

---

## Remaining Optimization Opportunities

| Optimization | Savings Estimate | Priority |
|-------------|-----------------|----------|
| Limit context history to last N messages | 500–2,000 tokens | HIGH |
| Compress project DNA before injection | 100–300 tokens | MEDIUM |
| Skip memory chunks for "inspect" intent | 200–500 tokens | MEDIUM |
| Use Claude Haiku for intent detection | $0.25/M vs $3/M | HIGH |
| Cache system prompt with Claude's prompt caching | 90% discount on cached tokens | HIGH |
| Remove duplicate CDN entries from SHARED_LIBRARIES | 50–100 tokens | LOW |
| Remove deprecated library entries | 100–200 tokens | LOW |

---

## Token Budget by Request Type

| Request Type | System Prompt | Context | Total Input (est.) |
|-------------|--------------|---------|-------------------|
| First message (HTML) | 3,000 | 500 | 3,500 |
| First message (React) | 1,800 | 500 | 2,300 |
| Edit (HTML, long history) | 3,000 | 4,000 | 7,000 |
| Edit (React, long history) | 1,800 | 6,000 | 7,800 |
| Complex CREATE with multi-agent | 3,000 | 500+3,000 | 6,500 |

---

## Claude Model Cost Reference

| Model | Input $/M | Output $/M |
|-------|-----------|------------|
| claude-haiku-4-5-20251001 | $0.25 | $1.25 |
| claude-sonnet-4-5-20251001 | $3.00 | $15.00 |

Use Haiku for: intent detection, planning/architecture agents, memory extraction.
Use Sonnet for: final generation, complex edits, React multi-file.
