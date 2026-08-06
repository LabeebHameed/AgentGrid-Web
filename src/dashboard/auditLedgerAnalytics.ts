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

export type VerdictKey = "ALLOW" | "STEP_UP" | "NOTICE" | "DENY" | "OK" | "-";

export type VerdictSegment = { key: VerdictKey | "OTHER"; count: number; share: number };

const VERDICT_ORDER: (VerdictKey | "OTHER")[] = ["ALLOW", "STEP_UP", "NOTICE", "DENY", "OTHER"];

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

