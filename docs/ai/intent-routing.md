# Intent Routing

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 4 — AI Orchestration

---

## Overview

Intent routing is the system that classifies what a user wants to do before deciding how to respond. It determines the generation strategy, which prompt additions to inject, and whether to call the AI at all.

**File:** `artifacts/api-server/src/services/ai/intent.ts`

---

## Intent Classification

### `detectChatIntent(message: string, hasExistingCode: boolean): ChatIntent`

Analyzes the user's message and current project state to classify intent.

```
Input:  user message (string) + whether project has existing code (boolean)
Output: ChatIntent enum value
```

### Intent Values

| Intent     | Hebrew Examples                     | English Examples                        | Action                   |
| ---------- | ----------------------------------- | --------------------------------------- | ------------------------ |
| `build`    | "בנה לי", "צור אתר", "תוסיף"        | "build me", "create", "make"            | Full generation or patch |
| `patch`    | "שנה את", "עדכן", "תתקן"            | "change", "update", "fix"               | Patch mode preferred     |
| `question` | "מה זה", "איך", "הסבר"              | "what is", "how does", "explain"        | Text response, no code   |
| `plan`     | "תכנן", "מה כדאי", "עזור לי להחליט" | "plan", "help me decide", "what should" | Planner agent            |
| `debug`    | "יש שגיאה", "לא עובד", "שבור"       | "error", "broken", "not working"        | Debug strategy           |

---

## Routing Decision Tree

```
User sends message
        │
        ▼
Has existing code? ──No──► intent = "build" (full generation)
        │
       Yes
        │
        ▼
Contains debug signals? ──Yes──► intent = "debug"
        │                        (full re-gen or targeted patch)
       No
        │
        ▼
Contains question signals? ──Yes──► intent = "question"
        │                           (text-only response)
       No
        │
        ▼
Contains plan signals? ──Yes──► intent = "plan"
        │                       (planner agent)
       No
        │
        ▼
Contains patch signals? ──Yes──► intent = "patch"
        │                        (<<<REPLACE>>> mode)
       No
        │
        ▼
Default ──────────────────────► intent = "build"
                                 (full generation)
```

---

## Intent-Specific Strategy

### `build`

- AI generates complete or updated code
- If React project: outputs all changed files
- If HTML project: outputs complete HTML or uses patch format for targeted changes
- Snapshot saved after generation

### `patch`

- AI receives explicit instruction to use `<<<REPLACE>>>...<<<WITH>>>...<<<END>>>` format
- Applied by `applyPatch()` in `services/ai/preview.ts`
- Falls back to full generation if patch application fails
- Produces smaller `changeSummary.changePercent`

### `question`

- No code generation
- AI responds in conversational mode
- No snapshot saved
- No bundle cache invalidation

### `plan`

- Planner agent invoked (`services/ai/agents.ts`)
- Generates structured plan: features, screens, APIs, DB schema
- Stored in `project_plans` table
- Returned as structured JSON, not HTML

### `debug`

- Full project context provided
- AI instructed to identify and fix the specific error
- Error details from `qa_test_results` or `runtime_environments` injected if available

---

## Contextual Suggestions

### `detectContextualSuggestions(html, integrations)`

After successful generation, analyzes the output to suggest relevant next actions:

```typescript
// Example output
[
  { type: "add_stripe", label: "הוסף תשלומים עם Stripe", priority: "high" },
  { type: "add_analytics", label: "הוסף Google Analytics", priority: "medium" },
  { type: "deploy", label: "פרסם את האתר", priority: "low" },
];
```

Sent to client as `suggestions` SSE event in the stream.

---

## Grow-With-Me Suggestions

Triggered when the AI detects the user is ready to upgrade their plan or skill level.

Detection logic:

- User has sent many messages (high engagement)
- User is asking for advanced features beyond their current mode
- Project complexity signals professional use case

Sent to client as `growWithMeSuggestion` field in the `done` SSE event.

---

## Testing Intent Detection

Intent detection is a pure function — no DB or AI calls needed:

```typescript
import { detectChatIntent } from "../services/ai/intent";

// Unit testable
const intent = detectChatIntent("תוסיף כפתור קנייה", true);
assert(intent === "patch");

const intent2 = detectChatIntent("מה זה React?", false);
assert(intent2 === "question");
```
