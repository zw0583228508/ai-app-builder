# Memory System Cleanup — Phase 7 Documentation

**Date**: 2026-03-22

---

## Overview

The memory system is a key differentiator of this platform. It maintains:

- **Project DNA**: evolving identity of what a project is
- **User DNA**: user preferences, vocabulary, and style
- **Memory Chunks**: specific facts, decisions, and preferences extracted from conversations
- **Decision Log**: architectural decisions the AI has made
- **Grow-With-Me**: suggestions generated from user patterns

All memory is stored in PostgreSQL and injected selectively into AI prompts.

---

## Files

| File                                                     | Purpose                                      |
| -------------------------------------------------------- | -------------------------------------------- |
| `routes/projects/messages.ts`                            | Triggers memory extraction after AI response |
| `services/ai/memory/extractAndSaveDNA.ts` (if extracted) | DNA extraction logic                         |
| `services/ai/memory/extractAndSaveMemoryChunks.ts`       | Memory chunk extraction                      |
| DB tables: `project_dna`, `user_dna`, memory chunks      | Persistence layer                            |

---

## Fixes Applied in Phase 7

### 1. Observability for Fire-and-Forget Errors

**Before**:

```typescript
extractAndSaveDNA(...).catch(() => {});
extractAndSaveMemoryChunks(...).catch(() => {});
```

**After**:

```typescript
extractAndSaveDNA(...).catch(
  (err) => logger.warn({ err, projectId }, "[Memory] DNA extraction failed")
);
extractAndSaveMemoryChunks(...).catch(
  (err) => logger.warn({ err, projectId }, "[Memory] Chunk extraction failed")
);
```

This makes memory failures visible in structured logs without blocking the main response.

### 2. Logger Import Added

`messages.ts` was missing the `logger` import. Added:

```typescript
import { logger } from "../../lib/logger";
```

---

## Memory Injection Strategy

Memory is injected into the AI context in `messages.ts` before the AI call:

- Project DNA: summarized project identity (~200 tokens)
- Relevant memory chunks: top-K by recency and relevance score
- User DNA: user preferences and vocabulary (injected selectively)

The injection is skipped if the project is new (< 2 messages) to avoid noise.

---

## Remaining Work

- Add explicit memory schema validation (Zod or type guards)
- Add relevance scoring explainability (why was this chunk selected?)
- Consider adding a memory debug endpoint (`/api/projects/:id/memory/debug`) for transparency
- Test that memory injection doesn't double-inject on retry
