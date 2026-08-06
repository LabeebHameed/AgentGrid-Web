# Audit Ledger — Premium Redesign + Analytics — Design Spec

Date: 2026-07-03
Status: Draft (pending user review)

## Goal
Push the existing `AuditLedgerPage` (the route formerly called `History`, already promoted by the 2026-07-02 fleet redesign) into the same premium tier as `FleetPostureCard` and `FleetPassportPanel`, and add lightweight analytics on top of the existing `LedgerEntry` data.

- Match the established premium visual language already in `src/dashboard/dashboard.css` (`ad-stat-card`, `ad-passport-shine`, `ad-coverage-bar`, `ad-hash-chain`, `ad-agent-passport-hero`).
- Add three micro-visualizations: a 24h sparkline trend, a verdict-mix mini-bar, and a per-agent × hour activity heatmap.
- Keep behavior and copy honest: mocked chain stays mocked; "Chain verified" reads as a demo state.

## Non-goals
- No backend, no real signing, no real cryptographic verification.
- No new sidebar entries, no new routes, no route-key change (`history` stays).
- No new dependencies. `recharts` and `framer-motion` are already in `package.json`.
- No data model changes. All visualizations are derived from the existing `LedgerEntry` type.
- No accessibility regressions: keyboard focus, ARIA, and reduced-motion parity must hold.

## Design

### 1. Hero band (replaces the current `PageHeader`)
- Backdrop: subtle radial-gradient with crimson + amber tints (reuses the `ad-agent-passport-hero` layered-gradient pattern).
- Eyebrow: `LIVE STREAM · CHAIN VERIFIED` with the existing `animate-ping` pulse indicator.
- Headline: "Audit Ledger" in the existing title treatment.
- Subtitle: "Hash-chained, tamper-evident record of every action across the fleet." (kept from current).
- **Hero counter**: large mono numeric total (`1,313 entries`) with a framer-motion count-up on first mount (spring stiffness ≈ 80, damping ≈ 18). Subline shows `24h +184 · tail 0x…`.
- Right-side actions: Search input + Export button (kept from current).

### 2. KPI strip — 4 cards, upgraded with micro-visualizations
The grid stays `grid-cols-2 lg:grid-cols-4 gap-3` and reuses `ad-stat-card` for the surface.

1. **Total entries** — number + 24h sparkline.
   - Number in large mono (`ad-stat-value`).
   - `recharts` `AreaChart`, ~80×24px, no axes, no gridlines. Single crimson-tinted area.
   - Tooltip on hover shows the hourly count.
   - Sparkline is **always last-24h** (not affected by filter chips) so the trend reads as fleet-wide traffic.
2. **Last 24h** — count + delta badge.
   - Number in large mono.
   - Delta badge: `+184` (emerald) vs previous 24h, or `−12` (crimson). Hidden when delta is 0.
3. **Verdict mix** — compact stacked bar.
   - Same family as `ad-coverage-bar` but three segments: ALLOW (emerald), STEP_UP (amber), DENY (crimson).
   - Width = proportion of filtered rows. Segment labels visible at ≥10% width.
4. **Chain integrity** — pulse + "Verified".
   - Keeps the existing `animate-ping` indicator.
   - Adds a subline: `1,313 prev_hash links · last 0x…`.

### 3. Filter chips bar — sticky, polished
- Sticky to the top of `.ad-scroll` on scroll within the page container.
- **Verdict segmented control**: kept (animated `motion.div layoutId="active-seg-ledger"`).
- **Event type chips**: kept. Each shows name + count badge.
- **Agent filter**: upgraded from native `<select>` to a small popover (`<button>` + popover with checkboxes + text search).
  - Lists all agents with avatars (initial letter, matching `ad-agent-avatar`).
  - "All agents" header row clears selection.
  - Selection is single-agent for parity with current behavior (multi-select flagged as follow-up).
  - Falls back to the existing native `<select>` when JS is disabled or viewport < 640px.
- "Clear filters" link stays right-aligned, only shown when any filter is active.

### 4. Hash-chain visualization strip — enhanced
- Keeps the horizontal scrollable strip of the 12 most-recent entries.
- Each `ad-hash-block` gains:
  - Agent initial-avatar (1.5rem, matching `ad-agent-avatar` gradient).
  - Truncated agent name under the hash.
  - Verdict pill in the block's top-right corner (uses the same verdict-color tokens as the KPI bar).
- Hovering a block still highlights the matching table row via the existing `hoverSeq` state (already wired).
- Clicking a block scrolls the table to that seq (`scrollIntoView({ behavior: "smooth", block: "center" })`) and flashes the row.
- Reduced-motion: no block hover lift, no scroll smooth behavior.

### 5. Agent activity heatmap (new)
- Sits between the hash-chain strip and the table.
- Header: "Agent activity · last 24h" + small legend ("fewer ░ → denser █").
- Grid: up to 6 rows (top 6 agents by entry count in the last 24h, selected from agents actually present in the last 24h) × 24 columns (one per hour bucket, oldest left → newest right).
- Cell intensity = entries in that hour. Color: `color-mix(in srgb, var(--crimson) X%, transparent)` where `X` scales from 8 (sparse) to 70 (dense), with a small floor so empty cells read as muted.
- Hour axis: labeled at 00, 04, 08, 12, 16, 20 + `now`.
- Hover a cell → tooltip "Ops Agent · 14:00 · 7 events".
- Click a row's agent label → applies that agent as the filter (sets `af` to the agent name).
- Pure CSS grid + inline `style={{ background: ... }}`. No recharts dependency.
- Hidden when `ledger.length === 0`, when there are zero entries in the last 24h, or when there is exactly one agent with activity in the last 24h (avoids a degenerate single-row grid).
- Reduced-motion: no cell hover transition.

### 6. Ledger table — polished
- Sticky header row (`position: sticky; top: 0; background: var(--card);`).
- Subtle `ad-row-hovered` highlight when matched from the chain strip (already exists).
- Hash cell: click-to-copy with a one-shot icon swap `Copy` → `Check` for ~1.2s, plus existing toast.
- Empty state: when filters return zero rows, show centered icon + "No ledger entries match your filters" + a "Clear filters" button (instead of just an empty table).
- Monospace for Seq / Hash / When; proportional for Action / Agent.
- Keeps the existing column set: `Seq │ Event │ Action │ Agent │ Verdict │ When │ Hash`.

### 7. Theme + motion parity
- Every new surface has a `[data-theme="dark"]` override matching the surrounding card tokens.
- Every animation is wrapped in a `prefers-reduced-motion: reduce` block in `dashboard.css`.
- Heatmap cells, sparkline, and verdict bar do not animate on initial render.

## Data derivations (no model changes)
- **Sparkline points**: `ledger` bucketed by hour for the last 24h. Filter respect: derived from the same `rows` memo as the table so it matches.
- **Delta**: `last24h - previous24h` where `previous24h = ledger.filter(e => e.ts >= now-48h && e.ts < now-24h).length`.
- **Verdict bar segments**: count by verdict over the filtered `rows`.
- **Heatmap**: `ledger.filter(e => e.ts >= now-24h)` → bucket by `Math.floor((now - e.ts) / (60*60*1000))` per agent, then take top 6 agents by total.

## Files affected
- `src/dashboard/pages.tsx` — rewrite the body of `AuditLedgerPage` (≈ lines 2110–2300). Add inline sub-components: `HeroCounter`, `KpiSparkline`, `VerdictBar`, `AgentHeatmap`, `AgentFilterPopover`. No new exports.
- `src/dashboard/dashboard.css` — append:
  - `.ad-hero-band`, `.ad-hero-counter`
  - `.ad-kpi-sparkline`, `.ad-verdict-bar`, `.ad-verdict-bar-seg`
  - `.ad-heatmap-grid`, `.ad-heatmap-row`, `.ad-heatmap-cell`, `.ad-heatmap-axis`
  - `.ad-agent-popover`, `.ad-agent-popover-search`
  - dark-mode overrides for each
  - `prefers-reduced-motion` overrides for each animated surface
- No other files touched. No new icons beyond the existing `Copy`/`Check` (already in `lucide-react`).

## Verification
1. `npm run build` — typecheck + Vite build pass.
2. `npm run lint` — clean for new code; pre-existing errors untouched.
3. Manual smoke:
   - Open `#/app/history` → hero counter animates 0 → total on first mount; live pulse visible.
   - Each KPI card shows its micro-viz (sparkline / delta badge / verdict bar / pulse).
   - Filter by `DENY` → only deny rows; verdict bar updates; sparkline recomputes from filtered rows.
   - Filter by event type `policy` → only policy rows; heatmap recomputes.
   - Filter by agent via the popover → only that agent's rows; clicking a heatmap row also sets the filter.
   - Hover a chain block → matching table row highlights.
   - Click a chain block → table scrolls to that seq and the row flashes.
   - Click a hash cell → copy + toast; icon swaps to `Check` for ~1.2s.
   - Empty filter result → empty state with "Clear filters" button.
   - Dark mode parity on hero band, KPIs, verdict bar, heatmap, chain strip, table header.
   - `prefers-reduced-motion: reduce` → no shine, no count-up animation, no cell transitions, no smooth scroll.
   - Keyboard: Tab order is hero → search → export → verdict segmented → event chips → agent popover → clear → chain blocks → heatmap → table; all interactive elements have visible focus rings.
