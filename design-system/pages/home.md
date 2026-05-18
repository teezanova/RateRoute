# Page: Home (Rates Comparison)

> Overrides for the single-screen rates view (`/`).
> When this file's rules conflict with `design-system/MASTER.md`, **this file wins**.
> When something isn't covered here, fall back to MASTER.

---

## 1. Page Purpose

User opens the page → enters a TWD amount → sees within ~1 second which conversion route (DIRECT, USD, EUR, JPY) yields the most THB, plus a "delta vs best" for each non-winning route. Repeat visits are common (rates change). No accounts, no settings, no navigation.

**Decision-time KPI:** result visible within 1 second of page load on a 3G connection.

---

## 2. Layout (top → bottom)

```
[ Sticky topbar ] ─ brand + theme toggle + refresh
[ Input panel  ] ─ amount field + status pills + source health (2-col card pair)
[ Best route   ] ─ headline result card (always visible, even with no data → skeleton)
[ Route list   ] ─ 4 vertically stacked cards, sorted by THB output desc
[ Footer       ] ─ disclosure note
```

- The order is **fixed**. Do not move "Best route" below the route list — it is the reason users opened the page.
- On viewports ≥ 768px, layout stays single-column. **No** two-column / sidebar layout for this screen.

---

## 3. Information Hierarchy

| Rank | Element | Visual weight | Token |
|---|---|---|---|
| 1 | Best-route THB output value | Largest, boldest, accent-tinted | `--text-display` (24–28px), weight 800, `color-mix(--good 60%, --text)` |
| 2 | Per-card THB output (`.kValue`) | Large, bold | `--text-kpi` (22px), weight 800 |
| 3 | "Best" badge | Pill, green-tinted | `.badge.badgeBest` |
| 4 | Foreign-amount (`.kValueSm`) | Medium, bold | `--text-kpi-sm` (18px), weight 700 |
| 5 | Card title (`.cardTitle`) | Title weight | `--text-title` (16px), weight 600 |
| 6 | Delta vs best (`.kpiDelta`) | Muted, small | `--text-body` 12px, `--muted` |
| 7 | Labels (`.kLabel`) | Smallest, muted | `--text-label` (12px), `--muted` |

**Rule:** numerical values dominate. Currency strings ("THB", "USD") render at the same size as the number but at weight 400 — they are unit, not data.

---

## 4. The Best-Route Card

This is the page's hero. It must always exist, even before data loads.

| State | Treatment |
|---|---|
| Loading (first visit) | Skeleton: same dimensions, `.chip` shows shimmer, `.summaryText` shows "Calculating best route…" with reduced-motion-safe shimmer |
| Loaded | `.chip` = winning route name (`Direct` / `USD` / `EUR` / `JPY`); `.summaryText` = "Best: USD — 10,842.12 THB" |
| Error (no cached data) | `.chip` shows `—`; `.summaryText` shows "Rates unavailable. Tap Refresh to retry." with retry affordance |
| Stale (cached data, fetch failed) | Show last-known result + `--warn` accent on `.chip` + helper text "Showing last value from 12m ago" |

**Heuristic:** the user must be able to make a decision in **one glance** at this card. Do not require them to read the route list.

---

## 5. Route List (`.vlist`)

| Rule | Spec |
|---|---|
| Sort order | THB output descending. Tie-break: priority `DIRECT > USD > EUR > JPY` (matches `app.js:216`). |
| Count | Always 4 (USD, EUR, JPY, DIRECT). Never hide a route — show `—` for missing data. |
| Best card | `.card.best` adds green-tinted border + `--good 7%` background overlay. **No size change, no entrance animation, no halo glow.** |
| Non-best cards | Show `.kpiDelta` (`-123.45 THB vs best`) below the KPI grid in muted text. Always with a leading minus sign. |
| Card entrance | Stagger by 40ms × index when the list first mounts; only on initial load, not on recalc. Respect `prefers-reduced-motion`. |
| Recalc | Instant (no animation). User typing in the amount field must not see flicker — update values in place, do not re-render the whole list. (Current `app.js:288` does re-render — accept for now; if it ever flickers, switch to in-place text updates.) |

### Card body grid (`.kpis`)
- 2-column on tablet+, 1-column below 520px (current code).
- DIRECT route has only the THB KPI → uses `.kpis.single`.
- Both KPIs share equal column width — no asymmetric grid.

---

## 6. Input Panel

| Element | Rule |
|---|---|
| `<input id="amountInput">` | `type="number"`, `inputmode="decimal"`, `min="0"`, `step="1"`. Font 16px (suppresses iOS zoom — preserve). |
| Default value | `10000` TWD. This is intentional — it produces a meaningful result on first paint. Do not change. |
| Label | "Amount (TWD)" above the field. Required field (no asterisk needed — only field on the page). |
| Enter key | Triggers `fetchAndRender()` (current behavior — preserve). |
| Input event | Re-renders results from cached `lastData` (no network). Preserve. |
| Validation | If value ≤ 0 or empty: route cards show `—` for all values, no error pill. Negative isn't possible (`min="0"` + `type="number"`). |

---

## 7. Source Health Row

Two cards side-by-side (SuperRich + Cathay). Stay 2-up on **all** breakpoints — they're informational, not primary, and look unbalanced when stacked.

| State | Color token | Text |
|---|---|---|
| `ok` (fetched ≤ 15 min ago) | `--good` accent | "Fetched 3m ago" |
| `warn` (fetched > 15 min ago) | `--warn` accent | "Fetched 23m ago" |
| `bad` (fetch failed) | `--bad` accent | "Fetch failed" |
| Initial | neutral `--line` | "—" |

**Color-only state ban (MASTER §10):** the text "Fetched Xm ago" / "Fetch failed" is the textual cue. Do not remove it.

The "Open" link on each card is a secondary action — keep the pill style (`.sourceLink`), do not promote to a button.

---

## 8. Status Pills (`aria-live="polite"`)

| Pill | When | Style |
|---|---|---|
| `#loadingPill` | During fetch | `.pill` with pulse animation. **Wrap pulse + dots in `prefers-reduced-motion` guard** (current code doesn't — fix on next pass). |
| `#errorPill` | When fetch fails and no cached data | `.pill.error` + add `role="alert"` when shown |
| `#updatedPill` | After successful fetch | `.pill.subtle`, text "Last updated: 18 May 2026, 14:23" |

Pills wrap to a second line on mobile via `flex-wrap: wrap` (already present).

---

## 9. Topbar

- Sticky (`position: sticky; top: 0`), with `backdrop-filter: blur(10px)` + 72%-opaque background. Preserve.
- Brand block: `.logo` (RR initials, 46×46) + `<h1>RateRoute</h1>` + `<p class="sub">…</p>`.
- Right side: `Theme toggle` then `Refresh`. **In this order** (theme is more permanent → leftward).
- On viewports < 360px, hide the button **labels** (keep icons) — not implemented yet; add when needed.

---

## 10. Empty / Error States

| Scenario | Treatment |
|---|---|
| First load, fetching | Best-route card shows skeleton; route list shows 4 skeleton cards (same dimensions) |
| First load, fetch fails | Best-route card shows "Rates unavailable" with Refresh affordance; route list shows 4 cards with `—` everywhere |
| Subsequent fetch fails (had data) | Dim existing cards via `.fetching` (current behavior — preserve), show error pill, keep last data visible |
| Partial data (one source up, one down) | Show whatever routes can be calculated; for unavailable routes, card shows `—` and a small "Source unavailable" line in the details disclosure |

---

## 11. Page-Specific Anti-Patterns

In addition to MASTER §13, on this page do **not**:

1. Add a comparison chart. Four bars is fewer than the labels around them — text wins.
2. Animate the THB value counting up. It implies precision changes that don't exist.
3. Add a "share this rate" button. Out of scope; ratesroute is for the user's own decision.
4. Auto-refresh in the background. The server cache is 5 min; user pulls when they want a fresh number.
5. Show a "rate history" sparkline inline. Belongs on a future details page if at all.
6. Re-order route cards mid-session based on user preference. Order is determined by THB output, always.

---

## 12. Open Issues (for future passes — track in MASTER violations)

These exist today and should be fixed when this page is next touched:

- [ ] Replace `☾` / `☀` / `↻` emoji with Lucide SVG (MASTER §7)
- [ ] Wrap `rrPulse` and `rrDots` animations in `prefers-reduced-motion` (MASTER §8)
- [ ] Add `:focus-visible` outline ring on `.btn` (MASTER §6)
- [ ] Add `font-variant-numeric: tabular-nums` to `.kValue`, `.kValueSm`, `.kpiDelta`, `.sourceMeta` (MASTER §4)
- [ ] Fix heading hierarchy: `<h3>` is currently used as a small muted label — move that styling to a `<span class="label">` and reserve `<h3>` for actual sub-headings (MASTER §4)
- [ ] Add `role="alert"` on `.pill.error` when visible (this file §8)
- [ ] Cap `.kValue` font-weight at `800` (MASTER §4)
- [ ] Replace `100vh` with `100dvh` if/when full-height layout is introduced (MASTER §13)
