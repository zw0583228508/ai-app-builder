# Current Defects

## Data Flow

### DEF-001: Agent flow snapshot skips HTML validation
**File**: `messages.ts` lines 1354-1361
**Severity**: MEDIUM
**Description**: Agent flow creates snapshots without calling `isHtmlUsable()`, allowing partial/corrupt HTML to be saved as a version.
**Status**: FIXED

### DEF-002: previewUpdated=false in patch mode even when HTML saved
**File**: `messages.ts` (patch success path)
**Severity**: LOW — final done event at line 2107 uses `hasUpdate` correctly
**Description**: Intermediate patch code sends previewUpdated=false in error cases; the final success path is correct.
**Status**: ACCEPTABLE (early exits correctly don't set previewUpdated)

### DEF-003: React previewHtml set to null but not broadcasted distinctly
**File**: `messages.ts` line 1872
**Severity**: LOW
**Description**: For React projects previewHtml is set to null and the hasUpdate flag handles broadcast correctly.
**Status**: OK

## AI / Prompts

### DEF-004: SHARED_LIBRARIES injected into every prompt mode
**File**: `services/ai/prompts/index.ts`
**Severity**: MEDIUM (token waste ~500 tokens per call for non-HTML projects)
**Description**: SHARED_LIBRARIES is always-on in all 4 mode prompts even for React/Next.js stacks.
**Status**: FIXED — conditional injection based on stack

### DEF-005: Multi-agent pipeline runs for messages > 200 chars
**File**: `messages.ts` line 962-966
**Severity**: MEDIUM (latency for simple messages)
**Description**: A 201-char create message triggers 4 agent calls in parallel. Threshold is too low.
**Status**: FIXED — raised to 300 chars and 20+ words

### DEF-006: Memory fire-and-forget swallows all errors silently
**File**: `messages.ts` lines 1715-1726
**Severity**: LOW
**Description**: `.catch(() => {})` swallows everything; no observability for memory failures.
**Status**: FIXED — now logs warning with structured data

## Security

### DEF-007: Terminal passes full process.env to bash
**File**: `terminal.ts`
**Severity**: CRITICAL
**Status**: FIXED — whitelist of safe env vars only

### DEF-008: Terminal has no command blacklist
**File**: `terminal.ts`
**Severity**: HIGH
**Status**: FIXED — blocked dangerous patterns and listed in audit

## Frontend

### DEF-009: No loading state in PreviewPanel when bundle is building
**Severity**: LOW
**Status**: FIXED

### DEF-010: Error state in chat panel doesn't suggest retry clearly
**Severity**: LOW
**Status**: FIXED
