# Design System

**Platform:** AI App Builder  
**Date:** 2026-03-22  
**Phase:** 6 — Frontend Product Shell

---

## Overview

The platform uses Tailwind CSS as its styling foundation with a custom design token system. All components follow a consistent visual language optimized for RTL Hebrew usage.

---

## Color Palette

### Base Colors
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#0f1117` | App background |
| `surface` | `#1a1d27` | Card/panel background |
| `surface-raised` | `#222536` | Elevated elements |
| `border` | `#2d3148` | Borders, dividers |
| `text-primary` | `#e8eaf6` | Main text |
| `text-secondary` | `#8b8fa8` | Secondary/muted text |
| `text-muted` | `#5a5d70` | Disabled, timestamps |

### Mode Accent Colors
| Mode | Primary | Light |
|------|---------|-------|
| Entrepreneur | `#8b5cf6` (purple) | `#ede9fe` |
| Builder | `#3b82f6` (blue) | `#dbeafe` |
| Developer | `#06b6d4` (cyan) | `#cffafe` |
| Maker | `#a855f7` (purple-500) | gradient |

### Status Colors
| State | Color |
|-------|-------|
| Success | `#10b981` (emerald) |
| Warning | `#f59e0b` (amber) |
| Error | `#ef4444` (red) |
| Info | `#6366f1` (indigo) |

---

## Typography

All UI uses the system's Hebrew-compatible font stack:

```css
font-family: 'Inter', 'Assistant', 'Heebo', system-ui, sans-serif;
```

`Assistant` and `Heebo` are optimized Hebrew fonts, loaded via Google Fonts CDN.

### Type Scale
| Role | Size | Weight |
|------|------|--------|
| Page title | 24px | 700 |
| Section header | 18px | 600 |
| Body | 14px | 400 |
| Caption | 12px | 400 |
| Code | 13px (monospace) | 400 |
| Button label | 14px | 500 |

---

## Component Conventions

### Buttons
Three variants:
- `primary` — filled accent color, main actions
- `secondary` — outlined, secondary actions
- `ghost` — transparent, icon buttons and tertiary actions

States: default → hover → active → disabled → loading

### Cards/Panels
```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 12px;
padding: 16px;
```

### Input Fields
```css
background: var(--surface-raised);
border: 1px solid var(--border);
border-radius: 8px;
padding: 10px 14px;
color: var(--text-primary);
```

Focus ring: `2px solid accent-color` with offset.

### Badges
Used for version numbers, diff stats, status:
- Small pill shape (`border-radius: 100px`)
- Color-coded by semantic meaning
- Max-width constrained for consistent layout

---

## Spacing

Base unit: 4px (Tailwind default)

| Spacing | Value | Usage |
|---------|-------|-------|
| `space-1` | 4px | Inline gaps |
| `space-2` | 8px | Component internal padding |
| `space-3` | 12px | Small gaps between elements |
| `space-4` | 16px | Standard padding |
| `space-6` | 24px | Panel padding |
| `space-8` | 32px | Section spacing |

---

## Icons

Library: `lucide-react`  
Size standard: 16px for inline icons, 20px for UI icons, 24px for feature icons.

---

## Animation

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Panel slide-in | 200ms | ease-out | Side panel opens |
| Fade in | 150ms | linear | Toast notifications |
| Skeleton pulse | 1.5s | ease-in-out | Loading states |
| SSE text reveal | streaming | — | Chat messages |
| Modal backdrop | 200ms | ease | Modal overlays |

All animations respect `prefers-reduced-motion`.

---

## RTL Layout Rules

1. `dir="rtl"` on root — all flex/grid layout reverses automatically
2. Icons that indicate direction (chevrons, arrows) must be flipped for RTL
3. Chat messages: user on right, AI on left (correct for RTL)
4. Input fields: text aligns right by default
5. Padding/margin asymmetry: use logical properties (`padding-inline-start`) where needed

---

## Dark Mode

Platform is dark-mode only. No light mode. Background is `#0f1117` — designer's choice for the "premium AI tool" aesthetic.

---

## Accessibility Minimums

- Color contrast: WCAG AA minimum on all text (4.5:1 for body, 3:1 for large)
- Focus indicators: visible on all interactive elements
- Keyboard navigation: all panels accessible without mouse
- ARIA labels: all icon-only buttons have `aria-label`
- Screen reader: `sr-only` class used for hidden labels
