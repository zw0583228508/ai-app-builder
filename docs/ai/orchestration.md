# AI Orchestration — Phase 6 Documentation

**Date**: 2026-03-22

---

## Orchestration Flow

Every user message to `/api/projects/:id/messages` goes through this pipeline:

```
1. Auth + ownership check
2. Project load (previewHtml, files, DNA, memory)
3. Intent detection (create / edit / fix / inspect / deploy / other)
4. Mode detection (entrepreneur / builder / developer / maker)
5. Multi-agent analysis (conditional — only for complex CREATE)
6. System prompt assembly (stack-aware)
7. Context assembly (history + memory + files)
8. Claude API call (streaming)
9. Output extraction (HTML / React files / patch)
10. HTML validation (isHtmlUsable)
11. Atomic DB write (previewHtml + project_files + snapshot)
12. SSE "done" event with previewUpdated flag
13. Fire-and-forget: DNA extraction, memory chunk extraction
```

---

## Multi-Agent Analysis (Step 5)

Multi-agent analysis runs up to 2 specialized sub-agents before the main build:

- **Architecture Agent**: plans technical approach
- **UI/UX Agent**: plans visual design

### Trigger Conditions (Phase 6 Fix)

```typescript
const isComplexRequest =
  isCreateIntent &&
  (isFirstMessage || // Always for first message
    isPlanningAnswerMessage || // After user answers planning questions
    (body.content.length > 350 && body.content.split(" ").length > 25)); // Long request
```

**Before Phase 6**: threshold was `200 chars & 15 words` — too aggressive, triggered on short "add a contact form" requests.

**After Phase 6**: threshold is `350 chars & 25 words` — only fires on genuinely complex requests.

---

## Intent Detection

Intent is classified by the `detectUserMode()` function using a fast heuristic model.

| Intent    | Example                   | Action                    |
| --------- | ------------------------- | ------------------------- |
| `create`  | "Build me a..."           | Full generation pipeline  |
| `edit`    | "Change the color to..."  | Patch mode or full re-gen |
| `fix`     | "The button is broken..." | Auto-fix pipeline         |
| `inspect` | "What does this code do?" | Chat-only, no generation  |
| `deploy`  | "Deploy this to Netlify"  | Deploy pipeline           |

---

## Output Extraction

After streaming completes, the accumulated response is parsed:

1. **HTML extraction**: regex for ` ```html ... ``` ` blocks
2. **React files extraction**: manifest format `### src/App.tsx\n```tsx\n...\n```\`
3. **Patch extraction**: unified diff blocks
4. **Fallback**: if all fail and response has HTML-like content, attempt heuristic extraction

HTML is validated with `isHtmlUsable()` before persisting. Truncated or structurally invalid HTML is rejected.

---

## Streaming Protocol

The API uses Server-Sent Events (SSE) to stream:

- `{ type: "chunk", content: "..." }` — AI response text
- `{ type: "pipeline_start" }` — multi-agent analysis starting
- `{ type: "agent_done", agentType: "..." }` — sub-agent complete
- `{ type: "done", previewUpdated: true/false }` — generation complete
- `{ type: "error", message: "..." }` — error occurred

---

## Agent Run (Autonomous Mode)

The `/api/projects/:id/agent-run` endpoint runs a fully autonomous multi-step task:

1. **Plan** (up to 8 steps using Haiku)
2. **Execute** (each step runs a Claude call)
3. **Auto-Fix** (up to 2 fix iterations if requested)
4. **Validate** (`isHtmlUsable` before persisting)
5. **Save** (atomic DB transaction: project + files + snapshot)
