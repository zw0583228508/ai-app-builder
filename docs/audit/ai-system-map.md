# AI System Map

## Generation Pipeline

````
1. User message arrives → sanitize (null bytes, control chars, max 8000 chars)
2. Rate check (20 req/min per user for AI endpoint)
3. Semantic cache check (prompt_cache table — SHA-256 keyed)
4. Intent detection (intent.ts) → one of:
   create / edit / fix / inspect / deploy / git_push / question / plan
5. Mode detection (mode.ts) → one of:
   entrepreneur / builder / developer / maker
6. Context assembly:
   - Project DNA (from project_dna table)
   - User DNA (from user_dna table)
   - Memory chunks (scored by relevance to current message)
   - Existing code (previewHtml or React files)
   - Agent analysis (architecture/ui/security/performance — for complex creates only)
7. System prompt assembly (system-prompt.ts):
   - Base system prompt (per mode)
   - CDN libraries reference (SHARED_LIBRARIES — conditional on stack)
   - DNA context
   - Memory chunk context
   - Agent recommendations
   - Intent-specific additions
8. Claude stream (claude-sonnet-4-5)
9. Output extraction:
   - HTML: ```html fence or full document detection
   - React: FILE: path\n```lang\ncontent\n``` manifests
   - Patch: <<<REPLACE>>>...<<<WITH>>>...<<<END>>>
   - Text-only: plain response (no code fences)
10. Atomic DB write:
    - project_files upsert (HTML as index.html or React files)
    - projectsTable.previewHtml update
    - projectSnapshotsTable insert (if valid HTML)
    - projectsTable skillScore update
11. Fire-and-forget side effects:
    - DNA extraction (withRetry wrapper)
    - Memory chunk extraction
    - Prompt cache write
    - User DNA update
    - QA auto-analysis
    - Usage telemetry
12. SSE done event: { previewUpdated, filesUpdated, changeSummary, growWithMeSuggestion }
````

## Intent Types

| Intent   | Trigger                     | Strategy           |
| -------- | --------------------------- | ------------------ |
| create   | New project, build, make    | Full generation    |
| edit     | Change, modify, update, add | Patch or full      |
| fix      | Bug, error, fix, fix it     | Patch preferred    |
| inspect  | How does, what is, show me  | Text-only analysis |
| deploy   | Publish, deploy, netlify    | Direct action      |
| git_push | Push, github, sync          | Direct action      |
| question | Question words              | Text-only          |
| plan     | Planning phase response     | Full generation    |

## Mode Profiles

| Mode         | Prompt Style              | Code Detail | Agent Use |
| ------------ | ------------------------- | ----------- | --------- |
| Entrepreneur | Business-focused, simple  | Low         | Yes       |
| Builder      | Product-focused, balanced | Medium      | Yes       |
| Developer    | Technical, clean code     | High        | Yes       |
| Maker        | Creative, experimental    | Medium      | Yes       |

## Multi-Agent Pipeline

Runs only for `create` intent + complex requests (>300 chars, 20+ words):

1. **Architecture Agent** (sequential): Tech stack, component breakdown
2. **UI Agent** (parallel): Visual design, color, layout
3. **Security Agent** (parallel): Input validation, auth patterns
4. **Performance Agent** (parallel): Loading, optimization

Results are injected into the main system prompt context.

## Memory System

```
project_dna table:
  - purpose, audience, techDecisions (JSON)
  - preferences, avoidList, qualityNotes
  - growSuggestionCount, lastGrowSuggestionAt
  - memoryChunks (JSONB array of {summary, tags, importance, createdAt})
  - decisionLog (JSONB)

user_dna table:
  - preferredStack, skillLevel, communicationStyle
  - integrations, frameworkPreferences, designPreferences

Memory injection:
  1. Score chunks by relevance to current message (tag matching)
  2. Select top 5 by score
  3. Inject as "PREVIOUS DECISIONS" context block
```

## Token Budget

| Component                    | Approx Tokens |
| ---------------------------- | ------------- |
| Base system prompt           | ~800          |
| SHARED_LIBRARIES (HTML only) | ~500          |
| DNA context                  | ~200          |
| Memory chunks (5)            | ~300          |
| Agent context                | ~400          |
| Existing code (truncated)    | ~2000         |
| Message history              | ~1000         |
| **Total input**              | ~5200         |
| Max output tokens            | 8192          |
