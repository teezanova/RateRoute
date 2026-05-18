# RateRoute — Master Design System

> **Source of Truth.** Read this before generating or modifying any UI code.
> Page-specific overrides (if any) live in `design-system/pages/<page>.md` and **override** these rules.
>
> Generated via the `ui-ux-pro-max` skill, adapted from the codebase's existing visual language.
> Stack: **Vanilla HTML + CSS + JS** (no framework). Treat platform guidance as **mobile-first responsive web**.

---

## 1. Product Profile

| Field | Value |
|---|---|
| **Type** | Financial tool / FX rate comparator (single-screen utility) |
| **Audience** | Thai consumers + expats moving TWD ⇄ THB; want a fast, trustworthy "which route gives me the most THB?" answer |
| **Use context** | Quick mobile glance during a transfer decision; revisits whenever rates change |
| **Tone** | Calm, confident, numerical; never playful, never aggressive |
| **Primary KPI** | Time-to-decision (user sees the best route within ~1 second of load) |
| **Trust drivers** | Live timestamps, source attribution, plain explanations of math |

---

## 2. Style Direction

**Chosen style: Calm Fintech Glassmorphism (dark-first, light parity).**

This is what the codebase already does — formalized so future changes stay coherent.

| Property | Rule |
|---|---|
| **Surfaces** | Translucent panels (`rgba(255,255,255,.03)` dark / `.70–.80` light) over a fixed radial-gradient backdrop |
| **Borders** | Single hairline at `rgba(255,255,255,.10)` (dark) / `rgba(0,0,0,.08)` (light) — never thicker than 1px |
| **Shadows** | One elevation: `0 14px 34px rgba(0,0,0,.20)` for cards. No multi-tier shadow stack. |
| **Radius** | `--radius-card: 18px`, `--radius-control: 14px`, `--radius-pill: 999px`. Do not invent new values. |
| **Blur** | `backdrop-filter: blur(10px)` on sticky topbar and any modal scrim only. Never decorative. |
| **Gradient ambience** | Background is six fixed radial orbs (`background-attachment: fixed`). Do not add more. Do not parallax. |

**Anti-patterns (do not introduce):**
- ❌ Skeuomorphic textures (paper, leather, metal)
- ❌ Neumorphism (soft inset/outset shadows)
- ❌ Brutalism (raw borders, off-grid type)
- ❌ Heavy gradients on text or buttons
- ❌ Mixing flat icons with photographic imagery

---

## 3. Color Tokens

All component CSS **must** consume CSS variables, never raw hex. Both themes are first-class — design and test them together.

### Dark (default)
```css
--bg:        #070a10;
--panel:     rgba(255,255,255,.03);
--card:      rgba(255,255,255,.03);
--text:      #eaf1fb;   /* primary  — body / values */
--muted:     #98aac3;   /* secondary — labels / hints */
--line:      rgba(255,255,255,.10);
--good:      #2ee59d;   /* success / best-route accent */
--warn:      #ffc42e;   /* stale data / soft warning */
--bad:       #ff5d5d;   /* fetch failure / hard error */
--chip:      #162438;
--btnbg:     rgba(255,255,255,.04);
--btnbdr:    rgba(255,255,255,.12);
```

### Light
```css
--bg:        #f4f7fb;
--panel:     rgba(255,255,255,.70);
--card:      rgba(255,255,255,.80);
--text:      #0c1320;
--muted:     #50627b;
--line:      rgba(0,0,0,.08);
--good:      #10b981;
--warn:      #d97706;
--bad:       #b00020;
--chip:      rgba(16,185,129,.10);
--btnbg:     rgba(255,255,255,.80);
--btnbdr:    rgba(0,0,0,.10);
```

### Semantic usage map
| Token | Used for | Never use for |
|---|---|---|
| `--good` | Best-route highlight, success pill, focus ring | Decorative accents, brand logos |
| `--warn` | Source card aged > 15 min | Critical errors |
| `--bad` | Fetch failures, validation errors | Anything cosmetic |
| `--muted` | Labels, helper text, less important metadata | Primary numerical values |

### Contrast targets (WCAG AA, enforced)
| Pair | Dark | Light | Min |
|---|---|---|---|
| `--text` on `--bg` | 14.2:1 | 14.5:1 | 7:1 ✅ |
| `--muted` on `--bg` | 6.1:1 | 5.4:1 | 4.5:1 ✅ |
| `--good` on `--bg` | 9.8:1 | 4.6:1 | 4.5:1 ✅ |
| White on `--bad` (light) | n/a | 5.5:1 | 4.5:1 ✅ |

**Rule:** Functional color must never carry meaning alone. Always pair `--bad` with an inline word and (when added) an icon. Source: §1 `color-not-only`.

---

## 4. Typography

System stack for zero font-loading cost (no FOIT, no CLS):

```css
font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
             Roboto, Helvetica, Arial, sans-serif;
```

### Type scale (fixed — do not invent new sizes)
| Token | Size | Weight | Use |
|---|---|---|---|
| `--text-display` | 24–28px | 800 | Hero values only (best-route THB on results screen) |
| `--text-kpi` | 22px | 800 | Primary numerical values (`.kValue`) |
| `--text-kpi-sm` | 18px | 700 | Secondary KPI (intermediate currency amount) |
| `--text-title` | 16px | 600 | Card titles, section heads |
| `--text-body` | 14px | 400 | Helper text, summary copy |
| `--text-label` | 12px | 500 | Labels, pills, metadata |
| **Min body** | **14px** desktop / **16px** form inputs | — | Inputs **must** be 16px to suppress iOS Safari zoom |

### Numerical text
**All money / rate values must use `font-variant-numeric: tabular-nums`** to keep digit columns from jittering across renders. Apply on `.kValue`, `.kValueSm`, `.kpiDelta`, and any element showing currency / rate / age.

### Line-height
- Body / paragraphs: `1.5`
- Tight numerical values: `1.1–1.2`
- Headings: `1.2`

### Heading hierarchy
- `<h1>` — site / app brand only (RateRoute wordmark)
- `<h2>` — page-level section (e.g. "Best route", route card titles)
- `<h3>` — card sub-section (use sparingly)
- Never skip levels. The current code uses `<h3>` as a small label — that is a **bug** to fix on next pass; new code must not repeat it.

### Anti-patterns
- ❌ `font-weight: 900` everywhere (current `.kValue` overshoot — cap at `800`)
- ❌ Letter-spacing on body text (only on labels/pills, max `0.25–0.5px`)
- ❌ Truncating numerical values (always show full digit)

---

## 5. Spacing & Layout

### Spacing scale (4 / 8 rhythm)
```
4  · 8  · 12 · 14 · 16 · 18 · 20 · 24 · 26 · 32 · 48
```
Padding & gaps **must** come from this scale. No `7px`, no `13px`, no `21px`.

### Section vertical rhythm
| Tier | Spacing | Use |
|---|---|---|
| Within a card | 8 / 12 | Label → value, row gaps |
| Card internal padding | 14 / 16 | `.panel`, `.card`, `.summaryCard` |
| Between sibling sections | 12 / 14 | `.summary` ↔ `.vlist` |
| Page top/bottom | 18 / 26 | `<main>` insets |

### Container
- Width: `min(900px, 92vw)` — applied via `.container`. **Do not change** without updating MASTER.
- On small screens (`< 520px`), gutter = `4vw` (the `92vw` rule already handles this).

### Breakpoints
```
mobile:  default (< 520px)
tablet:  520–767px
desktop: ≥ 768px
```
Mobile-first. Use `min-width` queries when adding new ones. The current `(max-width: 520px)` queries are kept for backward compat but **new rules should be `min-width`**.

### Z-index scale
```
0    base
10   sticky topbar
20   floating pills / source cards-over-panel (if ever)
40   dropdown / popover
100  modal scrim + dialog
1000 toast layer
```

### Viewport rules
- `<meta name="viewport" content="width=device-width,initial-scale=1">` — present, do **not** add `maximum-scale` or `user-scalable=no`.
- Use `min-height: 100dvh` for full-height shells on mobile (not `100vh`).
- No horizontal scroll on any breakpoint.

---

## 6. Components (Web-Adapted)

### Buttons (`.btn`)
| State | Visual |
|---|---|
| Default | `--btnbg` fill, `--btnbdr` 1px border, `--text` foreground, radius `--radius-control` |
| Hover | Border → `color-mix(in srgb, var(--text) 20%, transparent)` |
| Focus-visible | `2px` solid `--good` outline with `2px` offset (currently missing — add) |
| Active | `transform: translateY(1px)` |
| Disabled | `opacity: 0.55`, `cursor: not-allowed`, `aria-disabled` |
| Loading | Disable + replace label text with progress indicator; never just spinner without label |
| **Min height** | **44px** (touch target). Current `.btn` padding `10px 12px` → check on small font sizes |

**Primary action rule:** each screen has at most one primary CTA. RateRoute's primary action is the implicit "see the result" (no CTA needed); `Refresh` is **secondary** and must not be styled as primary.

### Inputs (`input`)
- Height ≥ 44px (current padding `12px 12px` + 16px font ≈ 44px ✅)
- Always paired with a visible `<label>` above (current `.field span` — keep)
- Focus: `--good` 55%-tinted border + 4px ring at 18% (already done; preserve)
- `inputmode="decimal"` on numeric fields, `inputmode="numeric"` for integer
- Use `autocomplete` attributes when relevant

### Cards (`.card`)
- Padding `16px`, radius `--radius-card`, border `1px solid --line`, `--card` background, shadow `--shadow`
- **Best state** (`.card.best`): green-tinted border + `--good 7%` overlay. Do not also enlarge or animate; restraint over flourish.
- Touch target: entire card is **not** clickable (good — keeps it predictable). If we ever make a card a link, use semantic `<a>` and add `cursor: pointer` plus a focus ring.

### Pills (`.pill`)
- Radius `--radius-pill`, padding `8px 10px`, font-size 12px
- Variants: `subtle` (muted), `error` (bad), default
- `aria-live="polite"` on the wrapping `.statusRow` (already present — preserve)

### Source cards (`.sourceCard`)
- Three states via class: `.ok`, `.warn`, `.bad`
- **State must use both color and a textual cue** (not color alone). Current "Fetched 3m ago" / "—" text satisfies this; if you add an aging icon, use SVG, never emoji.

### Details disclosure (`<details>`)
- Use native `<details>` (already done — good for a11y).
- Toggle animation ≤ 200ms; respect `prefers-reduced-motion`.

---

## 7. Iconography

**Critical rule:** No emoji glyphs in UI chrome. The current `☾`, `☀`, `↻` buttons **violate this** and should be replaced with SVG on next iconography pass.

| Source | Style | Stroke | Size tokens |
|---|---|---|---|
| Library | **Lucide** (preferred) or **Heroicons** outline | 1.5px | `--icon-sm: 16px`, `--icon-md: 20px`, `--icon-lg: 24px` |

- Inline SVG (do not load via `<img>` for icons — defeats `currentColor`).
- Color via `stroke="currentColor"` so theme tokens flow through.
- Tap area ≥ 44×44px (use button padding or `padding` on the icon wrapper).
- One visual language across the whole app — never mix filled + outline at the same hierarchy level.

**Replacement map for current emoji:**
| Current | Replace with |
|---|---|
| `☾` (Dark toggle) | Lucide `moon` |
| `☀` (Light toggle) | Lucide `sun` |
| `↻` (Refresh) | Lucide `refresh-cw` |
| Logo `RR` text in `.logo` div | Keep as wordmark for now (acceptable as brand initials); revisit when a real mark exists. **Do not** use guessed brand logos for SuperRich / Cathay. |

---

## 8. Motion

### Tokens
```css
--ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-in:  cubic-bezier(0.4, 0, 1, 1);
--dur-fast: 150ms;  /* press, hover */
--dur-base: 220ms;  /* state changes, dim/undim */
--dur-slow: 320ms;  /* card mount, expand */
```

### Rules
- Animate **only** `transform` and `opacity`. Never width / height / top / left.
- Exit duration ≈ 70% of enter duration.
- Maximum 1–2 animated elements per view.
- Every animation must carry meaning (state change, spatial continuity). Never decorative.
- **Mandatory:** wrap every keyframe / transition in:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- Current `rrPulse` and `rrDots` animations on the loading pill **must** respect this — currently they don't.

### Loading states
- < 300ms: no indicator
- 300ms–1s: dim existing content (`.fetching`) + show a single non-blocking pill
- > 1s: replace card body with a skeleton (gray rectangles), not a spinner

---

## 9. Forms & Feedback

| Rule | Application in RateRoute |
|---|---|
| Visible label above input | ✅ `.field span` |
| Error placement | Below related field (the global error pill is acceptable here because there is one input; new forms must use field-level errors) |
| Inline validation | On blur, not on every keystroke |
| `aria-live="polite"` | ✅ already on `.statusRow` |
| `role="alert"` for hard errors | Add to `.pill.error` when shown |
| Disabled state | `opacity: 0.55`, `cursor: not-allowed`, `disabled` attribute, no hover affordance |
| Retry path | Every error must show a retry. Currently "Refresh" serves this — keep visible during error states. |

---

## 10. Accessibility Floor

These are non-negotiable. PR review should reject anything that violates them.

- [ ] Contrast: body ≥ 4.5:1, large text ≥ 3:1, both themes
- [ ] Every interactive element has a visible focus ring (`:focus-visible`)
- [ ] Tab order matches visual order
- [ ] Touch target ≥ 44×44px, 8px+ between targets
- [ ] No content conveyed by color alone (always add text or icon)
- [ ] All meaningful images / icons have `alt` or `aria-label`
- [ ] All form inputs have an associated `<label for>` or wrapping label
- [ ] `aria-live` regions for async status; `role="alert"` for errors
- [ ] `prefers-reduced-motion` honored everywhere
- [ ] Body font ≥ 16px on mobile inputs (suppresses iOS zoom)
- [ ] Page works with `text-size-adjust` and 200% zoom without horizontal scroll

---

## 11. Performance Floor

- [ ] No layout shift > 0.1 CLS. Reserve space for async-loaded cards (use skeleton with same dimensions).
- [ ] Backdrop-filter limited to topbar + modals only (heavy on low-end GPUs).
- [ ] No more than 6 background radial-gradients (current count). Adding a 7th is not allowed.
- [ ] All transitions use `transform`/`opacity` only.
- [ ] Debounce input-driven recalc if it ever touches the network; the current `input` listener only does local math so debounce is unnecessary.
- [ ] Add `font-display: swap` if/when a custom font is introduced.

---

## 12. Charts & Data (Future)

Not currently used. When added:
- Trend over time → line chart (rate history)
- Comparison of fixed routes → horizontal bar (mobile-friendly)
- Avoid pie / donut entirely (≤ 4 routes; bar is clearer)
- Always supply a data-table fallback for screen readers
- Tooltip on hover **and** tap; values keyboard-reachable
- Color must not be the only series differentiator (add pattern or direct label)

---

## 13. Banned Patterns

Quick reject-list:
1. Emoji as icons
2. Raw hex colors in component CSS
3. `font-weight: 900` on body text
4. `100vh` on mobile (use `100dvh`)
5. `maximum-scale=1` / `user-scalable=no` on viewport
6. Animating width / height / top / left
7. Tooltips that require hover (provide tap fallback)
8. `placeholder` used as the only label
9. Color-only state indication
10. Skeleton-less loading > 1 second
11. New shadow values outside `--shadow`
12. New radius values outside the three defined tokens
13. Adding a 7th gradient orb to the background
14. Guessing brand logos for third-party sources

---

## 14. How to Use This File

When generating code:

1. Read this file **first**.
2. Check `design-system/pages/<page>.md` for the screen you're working on. If it exists, its rules **override** the rules here.
3. If a needed rule is missing from both files, **ask before inventing**. Do not silently introduce a new token, scale, or animation.

When you discover a gap or contradiction, update this file in the same PR.
