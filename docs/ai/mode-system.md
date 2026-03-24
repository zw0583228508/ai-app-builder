# Mode System

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 15 — Product Modes UX

---

## Overview

The mode system classifies users into one of four adaptive behavioral profiles. Each mode affects the AI's tone, prompt strategy, suggested defaults, and UI emphasis.

**File:** `artifacts/api-server/src/services/ai/mode.ts`  
**Frontend:** `ChatPanel.tsx` (mode selector UI)  
**API:** `PUT /api/projects/:id/mode`

---

## Modes

### Entrepreneur

**Target user:** Business owner, non-technical, idea-focused  
**Hebrew keywords:** "עסק", "לקוחות", "מכירות", "הכנסה", "שיווק"  
**AI behavior:**

- Focuses on business value and conversions
- Suggests CTAs, landing pages, lead capture
- Avoids technical jargon
- Emphasizes visual polish and first impressions
- Suggests deployment and sharing early

**UI hints:**

- Purple accent theme
- Suggested prompts: "צור דף נחיתה", "הוסף טופס יצירת קשר"
- Grow-with-me: upgrade to Builder when complexity grows

---

### Builder

**Target user:** Product manager, startup founder, semi-technical  
**Hebrew keywords:** "דשבורד", "אדמין", "ניהול", "משתמשים", "הרשאות", "חנות"  
**AI behavior:**

- Focuses on product features and user flows
- Suggests CRUD operations, authentication, dashboards
- Balances technical depth with product thinking
- Explains decisions in product terms

**UI hints:**

- Blue accent theme
- Suggested prompts: "הוסף ניהול משתמשים", "בנה דשבורד"
- Grow-with-me: upgrade to Developer when architecture questions arise

---

### Developer

**Target user:** Software engineer, technical user  
**Hebrew keywords:** "ריאקט", "קומפוננט", "API", "TypeScript", "גיטהאב", "דאטהבייס", "אנדפוינט"  
**AI behavior:**

- Uses technical terminology freely
- Generates clean, production-quality code
- Separates concerns, uses proper patterns
- Explains architectural decisions
- Offers code review-style feedback

**UI hints:**

- Green/cyan accent theme
- Suggested prompts: "הוסף TypeScript types", "שפר את הארכיטקטורה"
- GitHub sync prominently displayed

---

### Maker

**Target user:** Creative technologist, experimenter, hobbyist  
**Hebrew keywords:** "מגניב", "אנימציה", "אפקט", "ניסיון", "כיף", "גיימינג", "Three.js"  
**AI behavior:**

- Encourages creativity and experimentation
- Suggests visual effects, animations, Three.js
- Less structured, more exploratory
- "Try this cool thing" energy

**UI hints:**

- Purple gradient theme
- Suggested prompts: "הוסף אנימציה", "עשה משהו מגניב"

---

## Mode Detection

### `detectUserMode(message, currentMode)`

Detects the appropriate mode based on message content. Can upgrade the user's mode mid-conversation.

**Algorithm:**

1. Score message against keyword lists for each mode
2. If score threshold met, return that mode
3. If no strong signal, return `currentMode` (no downgrade)

**Keyword weights:**

```typescript
// Maker: scored by >= 2 signals
makerSignals = ["three.js", "canvas", "אנימציה", "animation", "webgl", ...]

// Developer: scored by >= 2 tech signals
devKeywords = ["ריאקט", "react", "api", "typescript", "קומפוננט", ...]

// Builder: scored by >= 2 product signals
builderKeywords = ["דשבורד", "dashboard", "admin", "ניהול", "חנות", ...]

// Entrepreneur: default (lowest threshold)
```

**Mode upgrade only:** The system never downgrade a user's mode automatically. Only explicit user selection from the UI can downgrade.

---

## Mode Persistence

- Stored in `projects.user_mode` column (DB)
- Updated via `PUT /api/projects/:id/mode`
- Read on every chat message
- Can be changed mid-project without data loss

---

## Mode Effects Summary

| Aspect                  | Entrepreneur      | Builder         | Developer       | Maker           |
| ----------------------- | ----------------- | --------------- | --------------- | --------------- |
| System prompt additions | Business-focused  | Product-focused | Technical       | Creative        |
| Tone                    | Friendly, simple  | Balanced        | Technical       | Playful         |
| Suggested CDNs          | Stripe, Mailchimp | Charts, Auth    | TypeScript libs | Three.js, GSAP  |
| UI color                | Purple            | Blue            | Cyan            | Purple gradient |
| Grow-with-me direction  | → Builder         | → Developer     | ← Builder       | Stays           |
| Git/Deploy prominence   | Low               | Medium          | High            | Low             |

---

## Adding a New Mode

1. Add the mode value to `UserMode` enum in `lib/db/src/schema/projects.ts`
2. Add detection keywords to `mode.ts`
3. Add system prompt additions to `system-prompt.ts`
4. Add UI configuration to `ChatPanel.tsx` `MODE_CONFIG`
5. Add to the Zod schema in `lib/api-zod/src/generated/api.ts`
6. Bump `PROMPT_VERSION`
