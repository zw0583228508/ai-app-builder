# User Flows

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 6 — Frontend Product Shell

---

## Overview

This document describes the primary user journeys through the AI App Builder platform.

---

## Flow 1 — New User Onboarding

```
1. User arrives → signs in with Replit OIDC
2. Redirect to /dashboard
3. Empty state shown: "צור את הפרויקט הראשון שלך"
4. User clicks "פרויקט חדש" → modal opens
5. User enters project name + optional description
6. Project type selected (website / webapp / landing / portfolio / mobile)
7. Project created → redirect to /projects/:id/workspace
8. Workspace opens with ChatPanel focused
9. Planner may ask 2-3 targeted questions if guided build mode selected
10. User types first message → generation begins
```

**Mode detection:** On the first message, `detectUserMode()` classifies the user and adjusts the AI's approach.

---

## Flow 2 — Standard Generation Session

```
1. User in workspace, types a message (Hebrew or English)
2. Intent detection: build / patch / question / plan / debug
3. If "question": AI answers with text, no code generation
4. If "build" / "patch":
   a. SSE stream opens
   b. Text response streams to ChatPanel
   c. Code generation begins (visible progress)
   d. Preview updates in PreviewPanel iframe
   e. TrustCard appears: change summary + diff stats
   f. Suggestions appear (contextual next steps)
5. Snapshot saved automatically
6. DNA extraction runs in background (async)
```

**Happy path time:** First token < 1s, full generation 5-15s for typical pages.

---

## Flow 3 — Project Version History

```
1. User opens History tab in PreviewPanel
2. List of snapshots shown, newest first
3. Each snapshot shows: timestamp + change percent badge + diff stats
4. User clicks a snapshot → preview switches to that version
5. User can "Restore" to make that version the active one
6. Restore creates a new snapshot (non-destructive)
```

---

## Flow 4 — Deploy to Netlify

```
1. User opens Deploy panel in SidePanel
2. Panel shows connection status (connected / not connected)
3. If not connected: user pastes Netlify token → saved encrypted in DB
4. User clicks "פרסם" (Deploy)
5. Deploy queue entry created, rate limit checked
6. Background deploy job:
   a. Upload previewHtml or React build output to Netlify
   b. Get deploy URL
   c. Save to project.deploymentUrl
7. SSE broadcast: project updated with new deployUrl
8. Panel shows live URL + "Open site" button
9. Deploy Brain AI suggests optimization tips (optional)
```

**Rate limit:** 5 deploys per 5 minutes per user.

---

## Flow 5 — GitHub Sync

```
1. User opens GitHub panel in SidePanel
2. Panel shows: not connected / connected + repo info
3. If not connected: user pastes GitHub PAT → saved encrypted in DB
4. User selects repo (create new or pick existing)
5. User clicks "סנכרן" (Sync)
6. Batched upload: all project files uploaded as a commit
7. README.md auto-generated for the project
8. Commit SHA saved to project.lastCommitSha
9. Panel shows: last sync time + commit link + sync status
```

---

## Flow 6 — Planning / Spec Mode

```
1. User selects "guided build" on project creation
2. Planner Agent invoked (claude-haiku)
3. Planner asks 2-3 targeted clarifying questions
4. User answers via ChatPanel
5. Spec generated: features, screens, APIs, DB schema
6. Spec shown in PlannerPanel (readable, editable)
7. User approves spec → generation begins using spec as context
8. Spec remains visible in PlannerPanel during development
9. Later edits reference spec: AI checks "does this contradict the spec?"
```

---

## Flow 7 — Database Panel

```
1. User opens Database panel
2. Schema visualizer shows project's tables
3. User can run raw SQL queries (with blocklist protection)
4. Query results shown in table view
5. Schema changes via AI chat: "הוסף עמודה X לטבלה Y"
6. AI generates ALTER TABLE + updates schema visualization
```

**Security:** All queries scoped to project schema only. DROP/ALTER restricted.

---

## Flow 8 — Secrets Management

```
1. User opens Secrets panel
2. List of secrets shown (names only, values masked)
3. User adds secret: name + value
4. Value encrypted at rest in DB
5. On deploy: secrets injected as Netlify/Vercel env vars
6. In preview: secrets NOT available (security by design)
```

---

## Flow 9 — QA Tests

```
1. AI generates app
2. QA Agent (claude-haiku) generates test plan
3. Tests run against preview URL via Playwright (if configured)
4. Results stored in qa_test_results
5. QA Panel shows: pass/fail per test + error details
6. User can ask AI to "fix failing tests" → AI reads QA output + regenerates
```

---

## Flow 10 — Collaboration

```
1. User shares project collaboration link
2. Collaborator opens link → authenticated via OIDC
3. WebSocket connection established (collab room keyed by projectId)
4. Presence shown: viewer count, live cursors (if enabled)
5. AI edits by any collaborator broadcast to all via SSE
6. Activity log shows who changed what and when
```

---

## Error Flows

### Generation Error

- SSE `error` event sent to client
- Error message shown in ChatPanel (Hebrew)
- Retry button offered
- Previous version preserved (snapshot not overwritten on error)

### Deploy Error

- Deploy queue entry marked failed
- Error message stored
- User sees error in Deploy panel with "Try again" button

### Auth Expiry

- `refreshIfExpired` refreshes token silently
- If refresh fails → user redirected to sign-in
- After sign-in → returned to same workspace URL

### Rate Limit Hit

- 429 response with `Retry-After` header
- Hebrew message: "כמות הבקשות עברה את המותר, נסה שוב בעוד X שניות"
