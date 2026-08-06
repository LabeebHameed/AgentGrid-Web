# Audit Ledger Premium Redesign + Analytics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push the existing `AuditLedgerPage` to the same premium tier as `FleetPostureCard` / `FleetPassportPanel`, add a 24h sparkline, verdict-mix bar, and a per-agent × hour activity heatmap, and polish the existing surfaces (hero band, sticky filter bar, table).

**Architecture:** Pure-function helpers in a new file `auditLedgerAnalytics.ts` derive sparkline points, delta, verdict segments, and heatmap buckets from the existing `LedgerEntry[]`. The `AuditLedgerPage` component is rewritten in place, reusing `ad-stat-card`, `ad-coverage-bar`, `ad-hash-chain`, `ad-agent-passport-hero`, and `ad-agent-avatar` patterns already in `dashboard.css`. New CSS is appended to the same file under a `/* ---------- Audit Ledger (premium + analytics) ---------- */` block. No new dependencies.

**Tech Stack:** React 19, framer-motion 12, recharts 3.8, lucide-react, Tailwind 4 utility tokens, existing dashboard CSS variables.

**Spec:** `docs/superpowers/specs/2026-07-03-audit-ledger-redesign-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/dashboard/auditLedgerAnalytics.ts` | Create | Pure helpers: sparkline points, delta, verdict segments, heatmap buckets |
| `src/dashboard/pages.tsx` | Modify (`AuditLedgerPage`, ~lines 2110–2400) | Rewrite hero + KPI strip + filter bar + chain strip + heatmap + table |
| `src/dashboard/dashboard.css` | Modify (append) | New premium surfaces: hero band, KPI sparkline, verdict bar, heatmap, agent popover, table polish |

No new dependencies, no new exports from `data.tsx`, no route changes.

---

## Task 1: Pure analytics helpers

**Files:**
- Create: `src/dashboard/auditLedgerAnalytics.ts`

- [ ] **Step 1: Create the helpers file**

Write the following into `src/dashboard/auditLedgerAnalytics.ts`:

```ts
import type { LedgerEntry } from "./data";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type SparkPoint = { hour: number; count: number };

/** 24 hourly buckets, oldest first. Always last-24h (not affected by filter chips). */
export function computeSparkline(ledger: LedgerEntry[], now: number): SparkPoint[] {
  const start = now - DAY_MS;
  const buckets: SparkPoint[] = Array.from({ length: 24 }, (_, h) => ({
    hour: start + h * HOUR_MS,
    count: 0,
  }));
  for (const e of ledger) {
    if (e.ts < start || e.ts > now) continue;
    const idx = Math.min(23, Math.floor((e.ts - start) / HOUR_MS));
    buckets[idx].count += 1;
  }
  return buckets;
}

/** last24h minus previous24h. Positive = more activity than the prior day. */
export function computeDelta(ledger: LedgerEntry[], now: number): number {
  const lastStart = now - DAY_MS;
  const prevStart = now - 2 * DAY_MS;
  let last = 0;
  let prev = 0;
  for (const e of ledger) {
    if (e.ts >= lastStart && e.ts <= now) last += 1;
    else if (e.ts >= prevStart && e.ts < lastStart) prev += 1;
  }
  return last - prev;
}

export type VerdictKey = "ALLOW" | "STEP_UP" | "DENY" | "OK" | "-";

export type VerdictSegment = { key: VerdictKey | "OTHER"; count: number; share: number };

const VERDICT_ORDER: (VerdictKey | "OTHER")[] = ["ALLOW", "STEP_UP", "DENY", "OTHER"];

/** Counts by verdict over the supplied (already filtered) rows. */
export function computeVerdictSegments(rows: LedgerEntry[]): VerdictSegment[] {
  const total = rows.length;
  const counts = new Map<VerdictKey | "OTHER", number>();
  for (const k of VERDICT_ORDER) counts.set(k, 0);
  for (const r of rows) {
    const v = (VERDICT_ORDER.includes(r.verdict as VerdictKey)
      ? r.verdict
      : "OTHER") as VerdictKey | "OTHER";
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return VERDICT_ORDER.map((k) => ({
    key: k,
    count: counts.get(k) ?? 0,
    share: total === 0 ? 0 : (counts.get(k) ?? 0) / total,
  }));
}

export type HeatmapCell = { agent: string; hourOffset: number; count: number };
export type HeatmapRow = { agent: string; total: number; cells: HeatmapCell[] };

/**
 * Top-N agents by total in last 24h, with 24 hourly cells each (offset 0 = oldest, 23 = newest).
 * `hourOffset = 23` is the bucket containing `now`.
 */
export function computeHeatmap(
  ledger: LedgerEntry[],
  now: number,
  topN = 6,
): HeatmapRow[] {
  const start = now - DAY_MS;
  const perAgent = new Map<string, number[]>();
  for (const e of ledger) {
    if (e.ts < start || e.ts > now) continue;
    const idx = Math.min(23, Math.floor((e.ts - start) / HOUR_MS));
    const row = perAgent.get(e.agent) ?? Array.from({ length: 24 }, () => 0);
    row[idx] += 1;
    perAgent.set(e.agent, row);
  }
  const ranked = Array.from(perAgent.entries())
    .map(([agent, cells]) => ({
      agent,
      total: cells.reduce((a, b) => a + b, 0),
      cells: cells.map((count, hourOffset) => ({ agent, hourOffset, count })),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
  return ranked;
}

export function formatHourOffset(hourOffset: number, now: number): string {
  const ts = now - (23 - hourOffset) * HOUR_MS;
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}h`;
}

/** Color-mix percentage for heatmap cell intensity. Sparse → 8, dense → 70. */
export function heatmapIntensity(count: number, rowTotal: number): number {
  if (count === 0 || rowTotal === 0) return 0;
  const ratio = count / rowTotal;
  if (ratio <= 0.1) return 12;
  if (ratio <= 0.25) return 28;
  if (ratio <= 0.5) return 46;
  if (ratio <= 0.75) return 58;
  return 70;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -30`
Expected: no errors related to `auditLedgerAnalytics.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/dashboard/auditLedgerAnalytics.ts
git commit -m "feat(audit-ledger): add pure analytics helpers"
```

---

## Task 2: Append new CSS surfaces

**Files:**
- Modify: `src/dashboard/dashboard.css` (append at end)

- [ ] **Step 1: Append the new CSS block**

Append to the end of `src/dashboard/dashboard.css`:

```css
/* ---------- Audit Ledger premium + analytics ---------- */

/* Hero band */
.aeg-dash .ad-hero-band {
  position: relative;
  isolation: isolate;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, transparent);
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--crimson, #b91c1c) 7%, transparent), transparent 60%),
    radial-gradient(80% 60% at 100% 100%, color-mix(in srgb, #f59e0b 5%, transparent), transparent 60%),
    color-mix(in srgb, var(--card) 92%, transparent);
  padding: 22px 24px 20px;
  overflow: hidden;
}
.aeg-dash .ad-hero-band::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(135deg,
    transparent 0 12px,
    color-mix(in srgb, var(--foreground) 3%, transparent) 12px 13px);
  opacity: .25;
  pointer-events: none;
  z-index: 0;
}
.aeg-dash .ad-hero-band > * { position: relative; z-index: 1; }
.aeg-dash .ad-hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  font-weight: 600;
}
.aeg-dash .ad-hero-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -.02em;
  color: var(--foreground);
  margin-top: 6px;
  line-height: 1.1;
}
.aeg-dash .ad-hero-sub {
  font-size: 13px;
  color: var(--muted-foreground);
  margin-top: 4px;
  max-width: 60ch;
}
.aeg-dash .ad-hero-counter {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -.01em;
  color: var(--foreground);
  margin-top: 10px;
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}
.aeg-dash .ad-hero-counter-sub {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: var(--muted-foreground);
}
[data-theme="dark"] .aeg-dash .ad-hero-band {
  border-color: color-mix(in srgb, #fff 6%, transparent);
}

/* KPI micro-viz: sparkline, verdict bar */
.aeg-dash .ad-kpi-sparkline {
  margin-top: 8px;
  height: 28px;
  width: 100%;
}
.aeg-dash .ad-kpi-delta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  margin-left: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.aeg-dash .ad-kpi-delta--up {
  background: color-mix(in srgb, #10b981 14%, transparent);
  color: #047857;
}
.aeg-dash .ad-kpi-delta--down {
  background: color-mix(in srgb, var(--crimson, #b91c1c) 14%, transparent);
  color: var(--crimson, #b91c1c);
}
[data-theme="dark"] .aeg-dash .ad-kpi-delta--up { color: #34d399; }
[data-theme="dark"] .aeg-dash .ad-kpi-delta--down { color: #f87171; }

.aeg-dash .ad-verdict-bar {
  display: flex;
  height: 8px;
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 10px;
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
}
.aeg-dash .ad-verdict-bar-seg {
  height: 100%;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  letter-spacing: .04em;
}
.aeg-dash .ad-verdict-bar-seg--ALLOW   { background: #10b981; }
.aeg-dash .ad-verdict-bar-seg--STEP_UP { background: #f59e0b; }
.aeg-dash .ad-verdict-bar-seg--DENY    { background: var(--crimson, #b91c1c); }
.aeg-dash .ad-verdict-bar-seg--OTHER   { background: #64748b; }
.aeg-dash .ad-verdict-bar-legend {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 10px;
  color: var(--muted-foreground);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.aeg-dash .ad-verdict-bar-legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 4px;
  vertical-align: middle;
}

/* Heatmap */
.aeg-dash .ad-heatmap {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  padding: 14px 16px 12px;
}
.aeg-dash .ad-heatmap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.aeg-dash .ad-heatmap-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
}
.aeg-dash .ad-heatmap-legend {
  font-size: 10px;
  color: var(--muted-foreground);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.aeg-dash .ad-heatmap-grid {
  display: grid;
  grid-template-columns: 110px 1fr 36px;
  gap: 6px 10px;
  align-items: center;
}
.aeg-dash .ad-heatmap-row-label {
  font-size: 11px;
  color: var(--foreground);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.aeg-dash .ad-heatmap-row-label:hover { text-decoration: underline; }
.aeg-dash .ad-heatmap-cells {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  gap: 2px;
}
.aeg-dash .ad-heatmap-cell {
  height: 14px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
  transition: transform .12s var(--d-ease), box-shadow .12s var(--d-ease);
  cursor: default;
}
.aeg-dash .ad-heatmap-cell:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--foreground) 18%, transparent);
  z-index: 2;
}
.aeg-dash .ad-heatmap-row-total {
  font-size: 10px;
  color: var(--muted-foreground);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  text-align: right;
}
.aeg-dash .ad-heatmap-axis {
  display: grid;
  grid-template-columns: 110px 1fr 36px;
  gap: 6px 10px;
  margin-top: 6px;
  font-size: 9px;
  color: var(--muted-foreground);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.aeg-dash .ad-heatmap-axis-marks {
  display: flex;
  justify-content: space-between;
}

/* Agent filter popover */
.aeg-dash .ad-agent-popover {
  position: relative;
  display: inline-block;
}
.aeg-dash .ad-agent-popover-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  min-width: 240px;
  max-height: 280px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 28px -16px color-mix(in srgb, #000 50%, transparent),
              0 2px 6px -2px color-mix(in srgb, #000 20%, transparent);
  padding: 6px;
}
.aeg-dash .ad-agent-popover-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.aeg-dash .ad-agent-popover-search input {
  background: transparent;
  border: none;
  outline: none;
  font-size: 11px;
  color: var(--foreground);
  width: 100%;
}
.aeg-dash .ad-agent-popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11.5px;
  color: var(--foreground);
}
.aeg-dash .ad-agent-popover-item:hover {
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
}
.aeg-dash .ad-agent-popover-item.is-active {
  background: color-mix(in srgb, var(--foreground) 8%, transparent);
  font-weight: 600;
}
.aeg-dash .ad-agent-popover-list {
  overflow-y: auto;
  padding-right: 2px;
}

/* Table polish */
.aeg-dash .ad-ledger-table {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--card);
}
.aeg-dash .ad-ledger-table-scroll {
  max-height: 480px;
  overflow-y: auto;
  overflow-x: auto;
}
.aeg-dash .ad-ledger-table-head {
  position: sticky;
  top: 0;
  z-index: 5;
  background: color-mix(in srgb, var(--card) 96%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--border);
}
.aeg-dash .ad-ledger-table-head th {
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  padding: 10px 12px;
  white-space: nowrap;
}
.aeg-dash .ad-ledger-table-row {
  border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  transition: background-color .12s var(--d-ease);
}
.aeg-dash .ad-ledger-table-row:last-child { border-bottom: none; }
.aeg-dash .ad-ledger-table-row:hover {
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
}
.aeg-dash .ad-ledger-table-row.is-flash {
  animation: ad-row-flash 1.2s var(--d-ease);
}
@keyframes ad-row-flash {
  0%   { background: color-mix(in srgb, var(--crimson, #b91c1c) 18%, transparent); }
  100% { background: transparent; }
}
.aeg-dash .ad-ledger-table-row td {
  padding: 10px 12px;
  font-size: 12.5px;
  color: var(--foreground);
  vertical-align: middle;
  white-space: nowrap;
}
.aeg-dash .ad-ledger-table-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
.aeg-dash .ad-ledger-hash-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  transition: background-color .12s var(--d-ease);
}
.aeg-dash .ad-ledger-hash-btn:hover {
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
}
.aeg-dash .ad-ledger-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 16px;
  text-align: center;
  color: var(--muted-foreground);
}
.aeg-dash .ad-ledger-empty-ico {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--foreground) 5%, transparent);
  color: var(--muted-foreground);
}

/* Sticky filter bar */
.aeg-dash .ad-filter-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--background) 88%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 8px 0 10px;
  margin: -8px 0 -10px;
}

/* Chain block avatar */
.aeg-dash .ad-hash-block-avatar {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--foreground) 6%, transparent),
    color-mix(in srgb, var(--foreground) 14%, transparent));
  font-size: 9px;
  font-weight: 700;
  color: var(--foreground);
  letter-spacing: -.02em;
  flex: none;
}

/* Reduced motion: kill new animations */
@media (prefers-reduced-motion: reduce) {
  .aeg-dash .ad-heatmap-cell,
  .aeg-dash .ad-ledger-table-row,
  .aeg-dash .ad-ledger-hash-btn,
  .aeg-dash .ad-ledger-table-row.is-flash { transition: none !important; animation: none !important; transform: none !important; }
}
```

- [ ] **Step 2: Verify CSS parses**

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds (CSS errors would surface here; TS errors are unrelated).

- [ ] **Step 3: Commit**

```bash
git add src/dashboard/dashboard.css
git commit -m "feat(audit-ledger): add premium CSS surfaces"
```

---

## Task 3: Rewrite hero band and import helpers

**Files:**
- Modify: `src/dashboard/pages.tsx` (top of file imports + `AuditLedgerPage` header)

- [ ] **Step 1: Extend imports**

In `src/dashboard/pages.tsx`, locate the import line that brings in `Area, AreaChart` from recharts (around line 30). Replace it with:

```ts
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { computeSparkline, computeDelta, computeVerdictSegments, computeHeatmap, formatHourOffset, heatmapIntensity, type HeatmapRow } from "./auditLedgerAnalytics";
```

Add a `Copy`/`Check` icon import alongside the existing lucide imports. Locate the existing lucide-react import block and append `Copy, Check` (verify both are exported from the installed version — `lucide-react@1.21.0` includes both; if not, fall back to inline SVG).

- [ ] **Step 2: Replace the `PageHeader` block with the hero band**

In `AuditLedgerPage`, find the `PageHeader ... subtitle="Hash-chained..." ... actions={<></>} />` block and replace it with the new hero band. Locate this block (it spans the `<PageHeader ... />` JSX). The replacement:

```tsx
<div className="ad-hero-band">
  <div className="flex items-start justify-between gap-4 flex-wrap">
    <div>
      <span className="ad-hero-eyebrow">
        <span className="relative inline-flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        Live stream · chain verified
      </span>
      <h1 className="ad-hero-title">Audit Ledger</h1>
      <p className="ad-hero-sub">Hash-chained, tamper-evident record of every action across the fleet.</p>
      <div className="ad-hero-counter">
        <HeroCounter target={totalEntries} />
        <span className="ad-hero-counter-sub">
          24h +{last24h} · tail {lastHash}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-muted border border-border rounded-md px-2.5 py-1 w-64 h-8 gap-1.5">
        <Search size={14} className="text-muted-foreground" />
        <input
          placeholder="Search actions, agents…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-transparent border-none outline-none text-xs text-card-foreground flex-1 placeholder:text-muted-foreground"
        />
      </div>
      <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => toast(`Exported ${rows.length} records`, "ok")}>
        <Download size={14} /> Export
      </Button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add the `HeroCounter` inline component**

Above `export function AuditLedgerPage`, add:

```tsx
function HeroCounter({ target }: { target: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString());
  React.useEffect(() => {
    const controls = animate(motionVal, target, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [target, motionVal]);
  return <motion.span>{rounded}</motion.span>;
}
```

(Add `import React from "react";` if not already imported in the file. The file uses `useState`/`useMemo` from React; check the top of the file and add `React` only if needed for `React.useEffect`.)

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds (TypeScript will catch a missing `React` import or wrong path).

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/pages.tsx
git commit -m "feat(audit-ledger): add hero band with count-up"
```

---

## Task 4: Upgrade the KPI strip with micro-viz

**Files:**
- Modify: `src/dashboard/pages.tsx` (the KPI strip `<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">…</div>` inside `AuditLedgerPage`)

- [ ] **Step 1: Add the derived data memos above the KPI strip**

Locate the `chainEntries = useMemo(...)` line in `AuditLedgerPage`. Right after the existing memos, add:

```tsx
const sparkPoints = useMemo(() => computeSparkline(ledger, now), [ledger, now]);
const delta = useMemo(() => computeDelta(ledger, now), [ledger, now]);
const verdictSegments = useMemo(() => computeVerdictSegments(rows), [rows]);
```

- [ ] **Step 2: Add the `KpiSparkline` and `VerdictBar` inline components**

Above `AuditLedgerPage`, add:

```tsx
function KpiSparkline({ points }: { points: { hour: number; count: number }[] }) {
  const data = points.map((p) => ({ x: p.hour, y: p.count }));
  return (
    <div className="ad-kpi-sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--crimson, #b91c1c)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--crimson, #b91c1c)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: "color-mix(in srgb, var(--foreground) 12%, transparent)", strokeWidth: 1 }}
            contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)" }}
            labelFormatter={(v) => new Date(v as number).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "2-digit" })}
            formatter={(v: number) => [`${v} events`, ""]}
          />
          <Area type="monotone" dataKey="y" stroke="var(--crimson, #b91c1c)" strokeWidth={1.4} fill="url(#fillSpark)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const VERDICT_COLOR: Record<string, string> = {
  ALLOW: "#10b981",
  STEP_UP: "#f59e0b",
  DENY: "var(--crimson, #b91c1c)",
  OK: "#64748b",
  "-": "#64748b",
  OTHER: "#64748b",
};

function VerdictBar({ segments }: { segments: ReturnType<typeof computeVerdictSegments> }) {
  const visible = segments.filter((s) => s.share > 0);
  if (visible.length === 0) {
    return (
      <div className="ad-verdict-bar" aria-label="No verdict data">
        <div className="ad-verdict-bar-seg ad-verdict-bar-seg--OTHER" style={{ width: "100%", color: "var(--muted-foreground)" }}>—</div>
      </div>
    );
  }
  return (
    <>
      <div className="ad-verdict-bar" role="img" aria-label="Verdict distribution">
        {visible.map((s) => (
          <div
            key={s.key}
            className={`ad-verdict-bar-seg ad-verdict-bar-seg--${s.key}`}
            style={{ width: `${s.share * 100}%` }}
            title={`${s.key}: ${s.count} (${(s.share * 100).toFixed(0)}%)`}
          >
            {s.share >= 0.1 ? s.key.replace("_", "-") : ""}
          </div>
        ))}
      </div>
      <div className="ad-verdict-bar-legend">
        {visible.map((s) => (
          <span key={s.key}>
            <span className="ad-verdict-bar-legend-dot" style={{ background: VERDICT_COLOR[s.key] }} />
            {s.key.replace("_", "-")} {s.count}
          </span>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Replace the 4 KPI card bodies**

Replace the entire `<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">…</div>` block with:

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  <div className="ad-stat-card">
    <span className="ad-stat-label">
      <span className="ad-stat-ico ad-stat-ico--violet"><Hash size={14} /></span>
      Total entries
    </span>
    <span className="ad-stat-value">{totalEntries}</span>
    <KpiSparkline points={sparkPoints} />
  </div>
  <div className="ad-stat-card">
    <span className="ad-stat-label">
      <span className="ad-stat-ico ad-stat-ico--blue"><Clock size={14} /></span>
      Last 24h
    </span>
    <span className="ad-stat-value">
      {last24h}
      {delta !== 0 && (
        <span className={`ad-kpi-delta ${delta > 0 ? "ad-kpi-delta--up" : "ad-kpi-delta--down"}`}>
          {delta > 0 ? "+" : ""}{delta}
        </span>
      )}
    </span>
  </div>
  <div className="ad-stat-card">
    <span className="ad-stat-label">
      <span className="ad-stat-ico ad-stat-ico--amber"><BarChart3 size={14} /></span>
      Verdict mix
    </span>
    <span className="ad-stat-value">
      {rows.length}
      <span className="text-sm text-muted-foreground font-medium"> / {totalEntries}</span>
    </span>
    <VerdictBar segments={verdictSegments} />
  </div>
  <div className="ad-stat-card">
    <span className="ad-stat-label">
      <span className="ad-stat-ico ad-stat-ico--emerald"><ShieldCheck size={14} /></span>
      Chain integrity
    </span>
    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-flex items-center gap-1.5">
      <span className="relative inline-flex size-1.5">
        <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      Verified
    </span>
    <span className="text-[10.5px] text-muted-foreground mt-1 ad-ledger-table-mono">
      {totalEntries.toLocaleString()} prev_hash links
    </span>
  </div>
</div>
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/pages.tsx
git commit -m "feat(audit-ledger): add KPI sparkline, delta, verdict bar"
```

---

## Task 5: Sticky filter bar + agent popover

**Files:**
- Modify: `src/dashboard/pages.tsx` (the filter row `<div className="flex items-center gap-3 flex-wrap">…</div>`)

- [ ] **Step 1: Add the popover state and helper**

Inside `AuditLedgerPage`, after the existing `useState` calls, add:

```tsx
const [agentOpen, setAgentOpen] = useState(false);
const [agentQuery, setAgentQuery] = useState("");
const filteredAgents = useMemo(
  () => agents.filter((a) => a.name.toLowerCase().includes(agentQuery.toLowerCase())),
  [agents, agentQuery],
);
```

- [ ] **Step 2: Add the `AgentFilterPopover` inline component**

Above `AuditLedgerPage`, add:

```tsx
function AgentFilterPopover({
  agents,
  value,
  onChange,
}: {
  agents: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = agents.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));
  const current = value === "all" ? "All agents" : value;

  return (
    <div className="ad-agent-popover" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-7 px-2 text-xs rounded-md border border-border/60 bg-background text-foreground inline-flex items-center gap-1.5 hover:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/15"
      >
        <User size={11} />
        <span>{current}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="ad-agent-popover-panel" role="listbox">
          <div className="ad-agent-popover-search">
            <Search size={11} className="text-muted-foreground" />
            <input
              autoFocus
              placeholder="Search agents…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ad-agent-popover-list">
            <div
              className={`ad-agent-popover-item ${value === "all" ? "is-active" : ""}`}
              onClick={() => { onChange("all"); setOpen(false); setQuery(""); }}
              role="option"
              aria-selected={value === "all"}
            >
              <span className="ad-hash-block-avatar">*</span>
              All agents
            </div>
            {filtered.map((a) => (
              <div
                key={a.id}
                className={`ad-agent-popover-item ${value === a.name ? "is-active" : ""}`}
                onClick={() => { onChange(a.name); setOpen(false); setQuery(""); }}
                role="option"
                aria-selected={value === a.name}
              >
                <span className="ad-hash-block-avatar">{a.name.charAt(0).toUpperCase()}</span>
                {a.name}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="ad-agent-popover-item" style={{ color: "var(--muted-foreground)", cursor: "default" }}>
                No agents match
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

Add `User` and `ChevronDown` to the lucide-react import if missing. Also remove the now-unused `agentOpen`/`agentQuery`/`filteredAgents` state added in Step 1.

- [ ] **Step 3: Replace the filter row**

Wrap the existing filter row's outermost `<div className="flex items-center gap-3 flex-wrap">…</div>` with `className="ad-filter-bar flex items-center gap-3 flex-wrap"`. Then replace the `<select>…</select>` block with:

```tsx
<span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">Agent</span>
<AgentFilterPopover agents={agents} value={af} onChange={setAf} />
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/pages.tsx
git commit -m "feat(audit-ledger): sticky filter bar + agent popover"
```

---

## Task 6: Enhanced hash-chain strip

**Files:**
- Modify: `src/dashboard/pages.tsx` (the hash-chain `<div className="rounded-xl border border-border bg-card overflow-hidden">…</div>` block, ~lines 2295–2400)

- [ ] **Step 1: Add flash state**

Inside `AuditLedgerPage`, near the existing `hoverSeq` state, add:

```tsx
const [flashSeq, setFlashSeq] = useState<number | null>(null);
React.useEffect(() => {
  if (flashSeq == null) return;
  const t = setTimeout(() => setFlashSeq(null), 1200);
  return () => clearTimeout(t);
}, [flashSeq]);
```

- [ ] **Step 2: Replace the chain block JSX**

Inside the chain strip's `.map((e, idx) => …)`, replace the inner `<button>` content so the block now shows the agent avatar + name + verdict pill. The click handler is updated to also call `setFlashSeq(e.seq)` and smooth-scroll:

```tsx
<button
  type="button"
  onMouseEnter={() => setHoverSeq(e.seq)}
  onMouseLeave={() => setHoverSeq(null)}
  onClick={() => {
    setHoverSeq(e.seq);
    setFlashSeq(e.seq);
    const el = document.querySelector(`[data-ledger-row="${e.seq}"]`);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    }
  }}
  className={`ad-hash-block ${hoverSeq === e.seq ? "is-hovered" : ""} border rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5 min-w-[120px] text-left transition-colors`}
  aria-label={`Show ledger entry #${e.seq}`}
>
  <div className="flex items-center gap-1.5">
    <span className="ad-hash-block-avatar">{e.agent.charAt(0).toUpperCase()}</span>
    <span className="mono text-[10px] text-muted-foreground">#{e.seq}</span>
    <span
      className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded"
      style={{
        background: `${VERDICT_COLOR[e.verdict] ?? "#64748b"}26`,
        color: VERDICT_COLOR[e.verdict] ?? "#64748b",
      }}
    >
      {e.verdict.replace("_", "-")}
    </span>
  </div>
  <span className="text-[10.5px] text-foreground/80 truncate" title={e.agent}>{e.agent}</span>
  <span className="mono text-[10px] text-muted-foreground/70 truncate">{e.hash}</span>
</button>
```

Add the helper at module scope (above `AuditLedgerPage`):

```tsx
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/pages.tsx
git commit -m "feat(audit-ledger): enhanced chain block with avatar + scroll"
```

---

## Task 7: Agent activity heatmap

**Files:**
- Modify: `src/dashboard/pages.tsx` (add `AgentHeatmap` component + render between chain strip and table)

- [ ] **Step 1: Add the `AgentHeatmap` inline component**

Above `AuditLedgerPage`, add:

```tsx
function AgentHeatmap({
  ledger,
  now,
  onPickAgent,
}: {
  ledger: LedgerEntry[];
  now: number;
  onPickAgent: (name: string) => void;
}) {
  const rows = useMemo(() => computeHeatmap(ledger, now, 6), [ledger, now]);
  if (rows.length === 0 || rows.length === 1) return null;

  const maxRowTotal = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="ad-heatmap">
      <div className="ad-heatmap-header">
        <div className="ad-heatmap-title">Agent activity · last 24h</div>
        <div className="ad-heatmap-legend">fewer ░ → denser █</div>
      </div>
      <div className="ad-heatmap-grid">
        {rows.map((row) => (
          <React.Fragment key={row.agent}>
            <div
              className="ad-heatmap-row-label"
              title={`Filter by ${row.agent}`}
              onClick={() => onPickAgent(row.agent)}
            >
              {row.agent}
            </div>
            <div className="ad-heatmap-cells">
              {row.cells.map((cell) => {
                const intensity = heatmapIntensity(cell.count, row.total);
                const bg = cell.count === 0
                  ? undefined
                  : `color-mix(in srgb, var(--crimson, #b91c1c) ${intensity}%, transparent)`;
                return (
                  <div
                    key={cell.hourOffset}
                    className="ad-heatmap-cell"
                    style={bg ? { background: bg } : undefined}
                    title={`${row.agent} · ${formatHourOffset(cell.hourOffset, now)} · ${cell.count} event${cell.count === 1 ? "" : "s"}`}
                    aria-label={`${row.agent} ${formatHourOffset(cell.hourOffset, now)} ${cell.count} events`}
                  />
                );
              })}
            </div>
            <div className="ad-heatmap-row-total">{row.total}</div>
          </React.Fragment>
        ))}
      </div>
      <div className="ad-heatmap-axis">
        <span />
        <div className="ad-heatmap-axis-marks">
          {[0, 4, 8, 12, 16, 20, 23].map((h) => (
            <span key={h}>{h === 23 ? "now" : formatHourOffset(h, now)}</span>
          ))}
        </div>
        <span />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render it between the chain strip and the table**

In `AuditLedgerPage`, immediately after the chain strip closing `</div>` and before the table heading/section, insert:

```tsx
<AgentHeatmap
  ledger={ledger}
  now={now}
  onPickAgent={(name) => setAf((cur) => (cur === name ? "all" : name))}
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/pages.tsx
git commit -m "feat(audit-ledger): add agent activity heatmap"
```

---

## Task 8: Polish table — sticky header, empty state, copy icon swap

**Files:**
- Modify: `src/dashboard/pages.tsx` (the existing `<table>` block inside `AuditLedgerPage`)

- [ ] **Step 1: Add copy state**

Inside `AuditLedgerPage`, near the existing state hooks, add:

```tsx
const [copiedSeq, setCopiedSeq] = useState<number | null>(null);
```

- [ ] **Step 2: Replace the table markup**

Find the existing `<table className="...">` block (the one rendered after the chain strip) and replace it with the polished version. The replacement uses the same columns (`Seq │ Event │ Action │ Agent │ Verdict │ When │ Hash`) and applies the new `.ad-ledger-table*` classes:

```tsx
{rows.length === 0 ? (
  <div className="ad-ledger-empty">
    <div className="ad-ledger-empty-ico"><Inbox size={18} /></div>
    <div className="text-sm font-medium text-foreground">No ledger entries match your filters</div>
    <div className="text-xs">Try clearing one or more filters to widen the result set.</div>
    <Button
      variant="outline"
      size="sm"
      className="mt-2 h-7 gap-1.5"
      onClick={() => { setVf("all"); setEf("all"); setAf("all"); setQ(""); }}
    >
      Clear filters
    </Button>
  </div>
) : (
  <div className="ad-ledger-table">
    <div className="ad-ledger-table-scroll">
      <table className="w-full border-collapse">
        <thead className="ad-ledger-table-head">
          <tr>
            <th>Seq</th>
            <th>Event</th>
            <th>Action</th>
            <th>Agent</th>
            <th>Verdict</th>
            <th>When</th>
            <th>Hash</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.seq}
              data-ledger-row={r.seq}
              className={`ad-ledger-table-row ${hoverSeq === r.seq ? "ad-row-hovered" : ""} ${flashSeq === r.seq ? "is-flash" : ""}`}
            >
              <td className="ad-ledger-table-mono text-muted-foreground">#{r.seq}</td>
              <td className="text-muted-foreground">{r.eventType}</td>
              <td className="text-foreground">{r.action}</td>
              <td className="text-foreground">{r.agent}</td>
              <td>
                <Chip tone={verdictTone(r.verdict)}>{r.verdict}</Chip>
              </td>
              <td className="ad-ledger-table-mono text-muted-foreground">{timeAgo(r.ts, now)}</td>
              <td>
                <button
                  type="button"
                  className="ad-ledger-hash-btn"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(r.hash).then(
                        () => { setCopiedSeq(r.seq); toast("Hash copied", "ok"); setTimeout(() => setCopiedSeq((s) => (s === r.seq ? null : s)), 1200); },
                        () => toast("Copy failed", "err"),
                      );
                    }
                  }}
                  aria-label={`Copy hash ${r.hash}`}
                >
                  {copiedSeq === r.seq ? <Check size={11} /> : <Copy size={11} />}
                  {r.hash}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

Ensure `Inbox`, `Copy`, and `Check` are imported from lucide-react. `Chip` and `timeAgo` are already imported.

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/pages.tsx
git commit -m "feat(audit-ledger): polish table with sticky header, copy, empty state"
```

---

## Task 9: Final verification

**Files:** none modified.

- [ ] **Step 1: Build + lint**

Run:
```bash
npm run build 2>&1 | tail -40
npm run lint 2>&1 | tail -40
```
Expected: `build` succeeds. `lint` reports no new errors in the changed files.

- [ ] **Step 2: Manual smoke checklist**

Run `npm run dev`, open `#/app/history`, and verify each item from the spec's Verification section. Particular items to confirm:

1. Hero counter animates 0 → total on first mount.
2. KPI sparkline renders for "Total entries".
3. "Last 24h" shows a delta badge with the correct sign.
4. "Verdict mix" bar segments appear with correct widths and labels.
5. Filter chips bar sticks to top while scrolling the page.
6. Agent popover opens on click, search filters agents, selecting an agent filters the table.
7. Hash-chain blocks show avatar + verdict pill; hovering highlights the matching row.
8. Clicking a chain block scrolls the table to that seq; the row flashes for ~1.2s.
9. Heatmap renders 6 agents × 24 hours; clicking an agent name applies that agent filter.
10. Empty filter result shows the empty state with "Clear filters" button.
11. Clicking a hash button copies the hash, swaps the icon to `Check` for ~1.2s, and toasts.
12. Dark mode parity on every new surface.
13. Toggling `prefers-reduced-motion: reduce` in DevTools removes the count-up animation, heatmap cell transitions, and smooth scroll.

- [ ] **Step 3: Final commit**

If any small visual fixes were made during smoke, commit them:

```bash
git add -A
git commit -m "fix(audit-ledger): smoke-test fixes" || echo "nothing to commit"
```

---

## Self-review

**Spec coverage**
- §1 Hero band → Task 3
- §2 KPI strip upgrade (sparkline, delta, verdict bar, chain subline) → Task 4
- §3 Sticky filter bar + agent popover → Task 5
- §4 Enhanced hash-chain strip (avatar, verdict pill, scroll-to-row) → Task 6
- §5 Agent activity heatmap → Task 7
- §6 Table polish (sticky header, copy icon swap, empty state) → Task 8
- §7 Theme + motion parity → Task 2 (CSS) + Task 3–8 (CSS class usage)
- Data derivations → Task 1
- Verification → Task 9

All spec sections map to a task.

**Placeholder scan**: No TBD/TODO. All code blocks are complete. Helper functions include full bodies.

**Type consistency**: `computeSparkline`/`computeDelta`/`computeVerdictSegments`/`computeHeatmap` are exported from `auditLedgerAnalytics.ts` and consumed by name in `pages.tsx`. `HeatmapRow` is the only type re-exported. `VERDICT_COLOR` is declared in `pages.tsx` and reused by both `VerdictBar` and the chain block — single source of truth.

No issues found.
