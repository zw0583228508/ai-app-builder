# Memory System

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 5 — Memory System Rebuild

---

## Overview

The memory system provides the AI with persistent, cross-conversation context about both the project and the user. It enables truly adaptive behavior — the AI remembers decisions made in earlier sessions and applies them to future interactions.

---

## Two Memory Layers

### Layer 1 — Project DNA
Per-project structured memory. Describes what the project is and what decisions have been made about it.

**Schema table:** `project_dna`  
**File:** `services/memory/project-dna.ts`

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | string | Foreign key to `projects` |
| `purpose` | text | What this project does |
| `audience` | text | Target audience |
| `techDecisions` | jsonb | Key technical decisions {"React": "used because user prefers it"} |
| `preferences` | jsonb | Design/color/layout preferences |
| `avoidList` | jsonb | Things the AI should avoid (user said "don't use X") |
| `lastTopics` | text[] | Recent conversation topics |
| `qualityNotes` | text | Performance/quality notes from QA |
| `updatedAt` | timestamp | Last memory update |

### Layer 2 — User DNA
Cross-project user profile. Describes what the user is like across all their projects.

**Schema table:** `user_dna`  
**File:** `routes/user-dna.ts`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Foreign key to `users` |
| `skillLevel` | enum | `beginner` / `intermediate` / `expert` |
| `designPreferences` | jsonb | Preferred color schemes, font styles |
| `frameworkPreferences` | jsonb | Preferred libraries and frameworks |
| `communicationStyle` | text | How the AI should talk to this user |
| `integrations` | jsonb | User's connected integrations |
| `lastActiveMode` | enum | Last detected `UserMode` |

### Layer 3 — Memory Chunks
Searchable semantic memory fragments extracted from conversations.

**Schema table:** `memory_chunks`

Each chunk:
- Has a `summary` (condensed insight)
- Has a `tags` array (for relevance matching)
- Scored by `scoreMemoryChunks()` before injection

---

## Memory Flow

### Extraction (after every AI response)

```
AI responds
    │
    ▼
shouldExtractMemory(message, response) ─── returns false early if message is short
    │
    ▼
extractAndSaveDNA(projectId, messages, response)
    │ uses claude-haiku-4-5-20251001
    │ structured JSON output
    ▼
DB: upsert project_dna
    │
    ▼
extractAndSaveMemoryChunks(projectId, messages, response)
    │ extracts 0-5 semantic chunks
    ▼
DB: insert memory_chunks (dedup by tag hash)
```

### Injection (before every AI call)

```
User sends message
    │
    ▼
getProjectDNA(projectId) ──► buildDNAContext(dna)
    │
    ▼
getUserDNA(userId) ──────────► buildUserDNAContext(userDna)
    │
    ▼
getRelevantChunks(projectId, message) ──► scoreMemoryChunks(chunks, message)
    │                                       (keyword scoring, not embeddings)
    ▼
buildMemoryChunkContext(topChunks)
    │
    ▼
All injected into system prompt before AI call
```

---

## `shouldExtractMemory(message, response)`

Returns `false` (skip extraction) if:
- Message is fewer than 15 characters
- Response contains no substantive code or insights
- Message is a simple question (`intent === "question"`)

Extraction is intentionally skipped on low-value turns to avoid polluting memory with noise.

---

## `scoreMemoryChunks(chunks, currentMessage)`

Scores each stored chunk against the current user message by:
1. Counting tag keyword matches in the message
2. Boosting recently accessed chunks
3. Returns top 5 by score

This is a lightweight keyword-based approach — no vector embeddings, works without a separate vector DB.

---

## Memory Lifecycle

| Event | Action |
|-------|--------|
| Project created | Empty DNA record created |
| AI generation | DNA extracted (async, non-blocking) |
| User sets preference | DNA updated via PATCH /api/user-dna |
| Project deleted | DNA soft-deleted with project (30-day purge) |
| Hard purge (GDPR) | DNA hard-deleted immediately |

---

## Retry Logic

Memory extraction includes retry on failure:

```typescript
withRetry(fn, maxAttempts=3, delayMs=500)
```

Extraction failures are logged but **non-fatal** — the AI still responds, memory is just not updated.

---

## Future Improvements (Deferred)

- Replace keyword scoring with vector similarity (pgvector)
- Cross-project memory chunk search
- Memory chunk editor UI for users
- Memory versioning / rollback
