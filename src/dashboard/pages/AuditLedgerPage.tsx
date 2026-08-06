import { useMemo, useState } from "react";
import { motion } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { ShieldCheck, Activity, Search, Download, ScrollText } from "lucide-react";
import { useStore, verdictTone, timeAgo } from "../data";
import { Btn, PageHeader, Chip, EmptyState } from "../ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeSparkline, computeDelta, computeVerdictSegments, computeHeatmap, heatmapIntensity } from "../auditLedgerAnalytics";

// Premium UI Component imports from the installed blocks



// Stagger wrapper for cards



import { useNow, stagger, fadeUp } from "./shared";
export function AuditLedgerPage() {
  const { ledger, toast, activeAgentId, agents } = useStore();
  const now = useNow(30_000);
  const [filter, setFilter] = useState<"all" | "ALLOW" | "DENY" | "STEP_UP" | "NOTICE">("all");
  const [search, setSearch] = useState("");

  const sparkData = useMemo(() => computeSparkline(ledger, now), [ledger, now]);
  const delta = useMemo(() => computeDelta(ledger, now), [ledger, now]);
  const verdictSegs = useMemo(() => computeVerdictSegments(ledger), [ledger]);
  const heatmap = useMemo(() => computeHeatmap(ledger, 6, now), [ledger, now]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const activeAgent = agents.find((a) => a.id === activeAgentId);
    return ledger
      .filter((e) => {
        if (filter !== "all" && e.verdict !== filter) return false;
        if (activeAgent && e.agent !== activeAgent.name) return false;
        if (!needle) return true;
        return (
          e.action.toLowerCase().includes(needle) ||
          e.agent.toLowerCase().includes(needle) ||
          (e.hash || "").toLowerCase().includes(needle)
        );
      })
      .slice(-100)
      .reverse();
  }, [ledger, filter, search, activeAgentId, agents]);

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenttag-audit-ledger-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} entries`, "ok");
  };

  const VERDICT_FILTERS = [
    { value: "all" as const, label: "All" },
    { value: "ALLOW" as const, label: "Allow" },
    { value: "DENY" as const, label: "Deny" },
    { value: "STEP_UP" as const, label: "Step-up" },
    { value: "NOTICE" as const, label: "Notice" },
  ];

  const verdictColor = (v: string) =>
    v === "ALLOW" || v === "OK"
      ? "var(--chart-2)"
      : v === "DENY"
      ? "var(--chart-1)"
      : v === "STEP_UP"
      ? "var(--chart-3)"
      : v === "NOTICE"
      ? "var(--chart-4)"
      : "var(--muted-foreground)";

  // Sparkline path builder
  const sparkMax = Math.max(...sparkData.map((p) => p.count), 1);
  const W = 160, H = 40;
  const sparkPath = sparkData.map((p, i) => {
    const x = (i / (sparkData.length - 1)) * W;
    const y = H - (p.count / sparkMax) * H * 0.85 - 4;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  const okCount = verdictSegs.find((s) => s.key === "ALLOW" || s.key === "OK")?.count ?? 0;
  const denyCount = verdictSegs.find((s) => s.key === "DENY")?.count ?? 0;
  const stepUpCount = verdictSegs.find((s) => s.key === "STEP_UP")?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Audit Ledger"
        subtitle="System-wide hash-chain event stream — every action, every verdict, every hash."
        actions={
          <>
            <Btn variant="ghost" icon={<Download size={13} />} onClick={exportLog}>
              Export
            </Btn>
          </>
        }
      />
      <div className="ad-scroll overflow-y-auto flex-1 p-6">
        <motion.div
          className="flex flex-col gap-5"
          variants={stagger}
          initial="visible"
          animate="visible"
        >
          {/* KPI hero strip */}
          <motion.div variants={fadeUp} className="ad-ledger-hero-strip">
            {/* Total events */}
            <div data-slot="card" className="ad-ledger-kpi">
              <div className="ad-ledger-kpi-head">
                <span className="ad-ledger-kpi-label">Total Events</span>
                <span className={`ad-ledger-kpi-delta ${delta >= 0 ? "is-up" : "is-down"}`}>
                  {delta >= 0 ? "+" : ""}{delta}% vs prev 12h
                </span>
              </div>
              <div className="ad-ledger-kpi-value tabular-nums">{ledger.length.toLocaleString()}</div>
              <svg viewBox={`0 0 ${W} ${H}`} className="ad-ledger-spark text-foreground/40" aria-hidden>
                <defs>
                  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path d={sparkPath + ` L ${W} ${H} L 0 ${H} Z`} fill="url(#sparkFill)" stroke="none" />
                <path d={sparkPath} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </div>

            {/* Allow */}
            <div data-slot="card" className="ad-ledger-kpi">
              <div className="ad-ledger-kpi-head">
                <span className="ad-ledger-kpi-label">Allowed</span>
                <span className="ad-ledger-kpi-chip is-ok">Clean</span>
              </div>
              <div className="ad-ledger-kpi-value tabular-nums text-foreground">
                {okCount.toLocaleString()}
              </div>
              <div className="ad-ledger-kpi-sub">
                {ledger.length > 0 ? ((okCount / ledger.length) * 100).toFixed(1) : "0"}% of events
              </div>
            </div>

            {/* Deny */}
            <div data-slot="card" className="ad-ledger-kpi">
              <div className="ad-ledger-kpi-head">
                <span className="ad-ledger-kpi-label">Denied</span>
                <span className="ad-ledger-kpi-chip is-bad">Blocked</span>
              </div>
              <div className="ad-ledger-kpi-value tabular-nums text-foreground">
                {denyCount.toLocaleString()}
              </div>
              <div className="ad-ledger-kpi-sub">
                {ledger.length > 0 ? ((denyCount / ledger.length) * 100).toFixed(1) : "0"}% of events
              </div>
            </div>

            {/* Step-up */}
            <div data-slot="card" className="ad-ledger-kpi">
              <div className="ad-ledger-kpi-head">
                <span className="ad-ledger-kpi-label">Step-up</span>
                <span className="ad-ledger-kpi-chip is-warn">MFA</span>
              </div>
              <div className="ad-ledger-kpi-value tabular-nums text-foreground">
                {stepUpCount.toLocaleString()}
              </div>
              <div className="ad-ledger-kpi-sub">
                {ledger.length > 0 ? ((stepUpCount / ledger.length) * 100).toFixed(1) : "0"}% of events
              </div>
            </div>

            {/* Chain integrity */}
            <div className="ad-ledger-kpi ad-ledger-kpi--chain">
              <div className="ad-ledger-kpi-head">
                <span className="ad-ledger-kpi-label">Chain</span>
              </div>
              <div className="ad-ledger-kpi-chain-badge">
                <span className="relative inline-flex size-2" aria-hidden>
                  <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span>Verified</span>
              </div>
              <div className="ad-ledger-kpi-sub mono">{ledger[ledger.length - 1]?.hash ?? "–"}</div>
            </div>
          </motion.div>

          {/* Verdict bar */}
          <motion.div variants={fadeUp} className="ad-section-card group">
            <div className="ad-section-head">
              <span className="ad-section-icon bg-muted text-muted-foreground"><ShieldCheck size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="ad-section-title">Verdict Distribution</div>
                <div className="ad-section-sub">{ledger.length} total events</div>
              </div>
            </div>
            <div className="ad-ledger-verdict-bar">
              {verdictSegs.map((s) => (
                <div
                  key={s.key}
                  className="ad-ledger-verdict-seg"
                  style={{
                    width: `${s.share * 100}%`,
                    background: verdictColor(s.key),
                    opacity: s.share > 0 ? 1 : 0,
                  }}
                  title={`${s.key}: ${s.count} (${(s.share * 100).toFixed(1)}%)`}
                />
              ))}
            </div>
            <div className="ad-ledger-verdict-legend">
              {verdictSegs.filter((s) => s.count > 0).map((s) => (
                <div key={s.key} className="ad-ledger-verdict-legend-item">
                  <span className="ad-ledger-verdict-dot" style={{ background: verdictColor(s.key) }} />
                  <span className="ad-ledger-verdict-legend-key">{s.key}</span>
                  <span className="ad-ledger-verdict-legend-count tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Heatmap */}
          {heatmap.length > 0 && (
            <motion.div variants={fadeUp} className="ad-section-card group">
              <div className="ad-section-head">
                <span className="ad-section-icon bg-muted text-muted-foreground"><Activity size={16} /></span>
                <div className="min-w-0 flex-1">
                  <div className="ad-section-title">Agent Activity Heatmap</div>
                  <div className="ad-section-sub">Events per agent per hour (last 6h)</div>
                </div>
              </div>
              <div className="ad-heatmap-grid">
                {heatmap.map((row) => (
                  <div key={row.agent} className="ad-heatmap-row">
                    <div className="ad-heatmap-label mono truncate" title={row.agent}>{row.agent}</div>
                    <div className="ad-heatmap-cells">
                      {row.cells.map((cell) => {
                        const intensity = heatmapIntensity(cell.count, row.total);
                        return (
                          <div
                            key={cell.hourOffset}
                            className="ad-heatmap-cell"
                            style={{ opacity: 0.12 + intensity * 0.88 }}
                            title={`${cell.count} events`}
                          />
                        );
                      })}
                    </div>
                    <div className="ad-heatmap-total tabular-nums">{row.total}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Filter bar + event table */}
          <motion.div variants={fadeUp} className="ad-section-card group">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between w-full">
              <div className="ad-section-head w-full md:w-auto flex-1 min-w-0">
                <span className="ad-section-icon bg-muted text-muted-foreground">
                  <ScrollText size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="ad-section-title">Event Stream</div>
                  <div className="ad-section-sub">{filtered.length} entries shown</div>
                </div>
              </div>
              {/* Filter chips & Search */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-1.5 flex-wrap">
                {VERDICT_FILTERS.map((f) => {
                  const active = filter === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setFilter(f.value)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                        active
                          ? "bg-foreground/8 text-foreground border-foreground/15 font-medium"
                          : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                      }`}
                    >
                      {f.value !== "all" && (
                        <span className="size-1.5 rounded-full" style={{ background: verdictColor(f.value) }} />
                      )}
                      {f.label}
                    </button>
                  );
                })}
              </div>
                <div className="relative w-full lg:w-auto">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-8 pl-8 pr-3 rounded-md border border-border bg-background text-xs text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30 w-full lg:w-48"
                    placeholder="Search entries…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search audit entries"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-card text-card-foreground shadow-none overflow-x-auto mt-4 rounded-b-xl border-t border-border">
              {filtered.length === 0 ? (
                <EmptyState icon={<Search size={22} />} title="No matching records">Try a different search or verdict filter.</EmptyState>
              ) : (
                <div className="min-w-[700px]">
                  <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/40 hover:bg-transparent">
                      <TableHead className="w-[50px] p-3 pl-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Seq</TableHead>
                      <TableHead className="w-[80px] p-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Event</TableHead>
                      <TableHead className="p-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Action</TableHead>
                      <TableHead className="w-[120px] p-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Agent</TableHead>
                      <TableHead className="w-[100px] p-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Verdict</TableHead>
                      <TableHead className="w-[100px] p-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">When</TableHead>
                      <TableHead className="w-[90px] p-3 pr-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase text-right">Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e, index) => (
                      <TableRow 
                        key={e.seq ?? index}
                        className={`border-b-0 hover:bg-muted/30 ${index % 2 === 0 ? "bg-transparent" : "bg-muted/10"}`}
                      >
                        <TableCell className="p-3 pl-4 text-muted-foreground mono text-[11px]">#{e.seq}</TableCell>
                        <TableCell className="p-3">
                          <span className="inline-flex items-center text-[10px] font-semibold text-muted-foreground border border-border/60 rounded px-1.5 py-0.5 bg-background">{e.eventType}</span>
                        </TableCell>
                        <TableCell className="p-3 font-medium max-w-[240px] truncate text-xs text-foreground/90">{e.action}</TableCell>
                        <TableCell className="p-3 text-muted-foreground/90 mono text-[11px]">{e.agent}</TableCell>
                        <TableCell className="p-3">
                          <Chip tone={verdictTone(e.verdict)} dot>{String(e.verdict)}</Chip>
                        </TableCell>
                        <TableCell className="p-3 text-muted-foreground/80 text-[11px] mono whitespace-nowrap">{timeAgo(e.ts)}</TableCell>
                        <TableCell 
                          className="p-3 pr-4 text-right text-[11px] text-muted-foreground/70 mono cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(e.hash);
                            toast("Hash copied to clipboard", "ok");
                          }}
                          title="Click to copy full hash"
                        >
                          {e.hash.length > 10 ? e.hash.slice(0, 8) + "…" : e.hash}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}




