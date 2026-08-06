import { useMemo, useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";

// Ticking "now" hook
// eslint-disable-next-line react-refresh/only-export-components
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

import {
  Cpu, ShieldCheck, Clock, KeyRound, Plug, ChevronDown, ChevronUp,
  ChevronRight, CircleCheck, Webhook, User, FileCode
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from "recharts";
import { type LedgerEntry, type Agent } from "../data";

// Premium UI Component imports
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Tiny helpers
// eslint-disable-next-line react-refresh/only-export-components
export const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

// eslint-disable-next-line react-refresh/only-export-components
export const statusTone = (s: string) => (s === "active" ? "ok" : s === "paused" ? "warn" : "bad");

// Stagger wrapper for cards
// eslint-disable-next-line react-refresh/only-export-components
export const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
// eslint-disable-next-line react-refresh/only-export-components
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

// eslint-disable-next-line react-refresh/only-export-components
export const fadeUpDelay = (delay: number) => ({
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: "easeOut", delay } },
});

// eslint-disable-next-line react-refresh/only-export-components
export const cardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
};

// Spend over time trend data
const SPEND_TREND = [
  { day: "Jun 02", spend: 188 }, { day: "Jun 04", spend: 204 }, { day: "Jun 06", spend: 197 },
  { day: "Jun 08", spend: 243 }, { day: "Jun 10", spend: 231 }, { day: "Jun 12", spend: 286 },
  { day: "Jun 14", spend: 274 }, { day: "Jun 16", spend: 318 }, { day: "Jun 18", spend: 352 },
  { day: "Jun 20", spend: 339 }, { day: "Jun 22", spend: 388 }, { day: "Jun 24", spend: 401 },
  { day: "Jun 26", spend: 423 }, { day: "Jun 28", spend: 430 },
];export function SpendTrendChart() {
  return (
    <ChartContainer config={{}} className="aspect-auto h-[240px] w-full">
      <AreaChart data={SPEND_TREND} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="currentColor" className="ad-chart-gradient-top" />
            <stop offset="95%" stopColor="currentColor" className="ad-chart-gradient-bottom" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} minTickGap={28} className="text-[10px]" />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Area dataKey="spend" type="natural" fill="url(#fillSpend)" stroke="currentColor" strokeWidth={1.5} />
      </AreaChart>
    </ChartContainer>
  );
}

const VERDICT_META = [
  { key: "ALLOW", label: "Allow", color: "currentColor" },
  { key: "STEP_UP", label: "Step-up", color: "currentColor" },
  { key: "NOTICE", label: "Notice", color: "currentColor" },
  { key: "DENY", label: "Deny", color: "var(--destructive)" },
];

export function DecisionsDonut({ ledger }: { ledger: LedgerEntry[] }) {
  const data = useMemo(() => {
    const base: Record<string, number> = { ALLOW: 0, STEP_UP: 0, NOTICE: 0, DENY: 0 };
    for (const e of ledger) {
      const v = e.verdict === "OK" ? "ALLOW" : e.verdict;
      if (v in base) base[v] += 1;
    }
    base.ALLOW += 38; base.STEP_UP += 9; base.NOTICE += 14; base.DENY += 4;
    return VERDICT_META.map((m) => ({ name: m.label, value: base[m.key], fill: m.color }));
  }, [ledger]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-square h-[170px] w-full flex items-center justify-center">
        <ChartContainer config={{}} className="absolute inset-0 aspect-square h-[170px] w-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={76} strokeWidth={2} stroke="var(--card)">
              {data.map((d) => (
                <Cell 
                  key={d.name} 
                  fill={d.fill} 
                  opacity={
                    d.name === "Allow" ? 1 :
                    d.name === "Step-up" ? 0.6 :
                    d.name === "Notice" ? 0.3 : 1
                  }
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">{total}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span 
              className="size-2 shrink-0 rounded-[3px]" 
              style={{ 
                backgroundColor: d.fill === "currentColor" ? "currentColor" : d.fill,
                opacity: 
                  d.name === "Allow" ? 1 :
                  d.name === "Step-up" ? 0.6 :
                  d.name === "Notice" ? 0.3 : 1
              }} 
            />
            <span className="flex-1 text-muted-foreground">{d.name}</span>
            <span className="font-medium tabular-nums">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
// One-glance system posture
export function SystemPostureCard({
  agents,
  approvals,
}: {
  agents: import("../data").Agent[];
  approvals: import("../data").Approval[];
}) {
  const enforced = agents.filter((a) => a.enforcement).length;
  const totalMandates = agents.reduce((s, a) => s + a.mandates.filter((m) => m.active).length, 0);
  const enforcementPct = agents.length ? Math.round((enforced / agents.length) * 100) : 0;
  const scoreColor = "var(--foreground)";

  // SVG ring math
  const R = 36, CX = 40, CY = 40, CIRC = 2 * Math.PI * R;
  const dash = (enforcementPct / 100) * CIRC;

  const rows = [
    { label: "Enforcing", value: `${enforced}`, sub: `/${agents.length}`, icon: <Cpu size={12} /> },
    { label: "Mandates", value: `${totalMandates}`, sub: "active", icon: <ShieldCheck size={12} /> },
    { label: "Requests", value: `${approvals.length}`, sub: "pending", icon: <Clock size={12} /> },
    { label: "Providers", value: "5", sub: "/5 online", icon: <Plug size={12} /> },
  ];

  return (
    <div className="flex flex-col gap-5 h-full justify-between">
      {/* Score + ring */}
      <div className="flex items-center gap-5 mt-1 px-1">
        <div className="relative flex items-center justify-center">
          <svg width="80" height="80" className="shrink-0 -rotate-90 drop-shadow-sm" aria-hidden>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={3} opacity={0.6} />
            <circle
              cx={CX} cy={CY} r={R} fill="none"
              stroke={scoreColor}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRC - dash}`}
              style={{ transition: "stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tabular-nums tracking-tight text-foreground leading-none">
              {enforcementPct}<span className="text-[10px] font-medium text-muted-foreground ml-0.5">%</span>
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">System coverage</div>
          <div className="text-xs text-muted-foreground leading-snug mt-1">
            Percentage of registered agents operating under active governance.
          </div>
        </div>
      </div>

      {/* Metric Grid — 2x2 layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1.5 rounded-xl border border-border/40 bg-muted/20 p-2.5 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-1.5 text-muted-foreground/80">
              {row.icon}
              <span className="text-[9px] font-semibold uppercase tracking-wider">{row.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold tabular-nums tracking-tight text-foreground leading-none">{row.value}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{row.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Audit Ledger panel
export function AuditLedgerPanel({
  ledger,
  onOpenHistory,
}: {
  ledger: LedgerEntry[];
  onOpenHistory: () => void;
}) {
  const entries = useMemo(() => ledger.slice(-12).reverse(), [ledger]);
  const totalEntries = ledger.length;
  const lastHash = entries[0]?.hash ?? "0x0000…";

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Terminal header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-muted/20">
          <span className="flex gap-1.5" aria-hidden>
            <span className="block size-2.5 rounded-full bg-border" />
            <span className="block size-2.5 rounded-full bg-border" />
            <span className="block size-2.5 rounded-full bg-border" />
          </span>
          <span className="mono text-[12px] text-muted-foreground">agenttag · audit ledger</span>
          <span className="ml-auto inline-flex items-center gap-1.5 mono text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
            live
          </span>
        </div>

        {/* Terminal body */}
        <div className="px-2 py-1 font-mono overflow-x-auto">
          {entries.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No ledger entries yet.
            </div>
          ) : (
            entries.map((row, idx) => (
              <div
                key={row.seq}
                className="grid grid-cols-[44px_70px_1fr_auto_70px] min-w-[500px] items-center gap-2 px-3 py-2 text-[12.5px]"
                style={{ borderBottom: idx === entries.length - 1 ? "none" : "1px solid var(--border)" }}
              >
                <span className="text-muted-foreground/50">#{row.seq}</span>
                <span className="text-[11px] text-muted-foreground">{row.eventType}</span>
                <span className="truncate text-foreground/90 font-medium" title={row.action}>{row.action}</span>
                <span className="text-right font-medium tabular-nums text-foreground">
                  {row.verdict}
                </span>
                <span className="text-right text-muted-foreground/50">{(row.hash || "").slice(0, 8)}</span>
              </div>
            ))
          )}
        </div>

        {/* Terminal footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground mono bg-muted/10">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground/80 font-medium">
            <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden />
            Chain verified
          </span>
          <span>{totalEntries}+ entries · prev_hash linked · tail: <span className="text-foreground/80">{(lastHash || "").slice(0, 8)}</span></span>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onOpenHistory}>
          View full ledger
          <ChevronRight size={12} />
        </Button>
      </div>
    </div>
  );
}

export function LiveActivityPanel() {
  const rows: { tone: "ok" | "info" | "warn" | "muted"; title: string; meta: string }[] = [
    { tone: "ok",   title: "Chain integrity check passed",     meta: "system · just now" },
    { tone: "info", title: "System posture recomputed",         meta: "system · 2 min ago" },
    { tone: "ok",   title: "Passport rotation completed",      meta: "operator · 8 min ago" },
    { tone: "warn", title: "SLA warning cleared on Ops",       meta: "Ops Agent · 12 min ago" },
    { tone: "info", title: "Mandate signed (Stripe)",          meta: "operator · 1 hour ago" },
    { tone: "warn", title: "Budget threshold warning",         meta: "Research Agent · 3 hours ago" },
    { tone: "warn", title: "Suspicious tool execution blocked",meta: "Agenttag Enforcer · 5 hours ago" },
    { tone: "ok",   title: "Biometric signature verified",     meta: "Finance Agent · 8 hours ago" },
    { tone: "muted",title: "Provider connected (Stripe)",      meta: "system · 1 day ago" },
    { tone: "muted",title: "Ledger snapshot archived",         meta: "system · 2 days ago" },
  ];

  return (
    <div className="ad-scroll-inner flex flex-col overflow-y-auto pr-1" style={{ maxHeight: 240 }}>
      <div className="ad-timeline">
        {rows.map((r, i) => (
          <div key={i} className="ad-timeline-item">
            <div className="ad-timeline-indicator">
              <span className={`ad-timeline-dot tone-${r.tone}`} />
              <span className="ad-timeline-track" />
            </div>
            <div className="ad-timeline-content">
              <span className="ad-timeline-title">{r.title}</span>
              <span className="ad-timeline-meta">{r.meta}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemPassportPanel({
  agents,
  providers,
}: {
  agents: import("../data").Agent[];
  providers: import("../data").Provider[];
}) {
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const connectedProviders = providers.filter((p) => p.connected).length;

  const rows = [
    { label: "Operator DID", value: <span className="font-mono text-[10px]">did:key:z6Mk…HUMAN</span>, icon: <User size={13} className="text-muted-foreground/60" /> },
    { label: "Agent passports", value: <span className="font-mono tabular-nums"><span className="font-semibold text-foreground">{totalAgents}</span><span className="text-muted-foreground"> issued</span></span>, icon: <FileCode size={13} className="text-muted-foreground/60" /> },
    { label: "Active passports", value: <span className="font-mono tabular-nums"><span className="font-semibold text-foreground">{activeAgents}</span><span className="text-muted-foreground"> of {totalAgents}</span></span>, icon: <CircleCheck size={13} className="text-muted-foreground/60" /> },
    { label: "Signing key", value: <span className="text-xs">Ed25519</span>, icon: <KeyRound size={13} className="text-muted-foreground/60" /> },
    { label: "Operator proof", value: <span className="text-xs text-muted-foreground"><span className="text-foreground font-medium">signed</span> · passkey</span>, icon: <ShieldCheck size={13} className="text-muted-foreground/60" /> },
    { label: "Providers bound", value: <span className="font-mono tabular-nums"><span className="font-semibold text-foreground">{connectedProviders}</span><span className="text-muted-foreground"> of {providers.length}</span></span>, icon: <Webhook size={13} className="text-muted-foreground/60" /> },
  ];

  return (
    <div className="flex flex-col gap-5 h-full justify-between">
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="shrink-0">{row.icon}</span>
              <span>{row.label}</span>
            </div>
            <span className="text-right">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Deterministic 14-day spend series
// eslint-disable-next-line react-refresh/only-export-components
export function generateSparkline(agentId: string, base: number): number[] {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) hash = ((hash << 5) - hash + agentId.charCodeAt(i)) | 0;
  return Array.from({ length: 14 }, (_, i) => {
    const noise = Math.abs(Math.sin(hash + i * 1.7)) * 0.6 + 0.4;
    const trend = 0.7 + (i / 13) * 0.6;
    return Math.round(base * noise * trend);
  });
}// Sparkline SVG
export function Sparkline({ data, status }: { data: number[]; status: Agent["status"]; agentId?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 88;
  const h = 28;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 6) - 3}`);
  const colorClass = status === "paused" ? "text-muted-foreground/50" : status === "revoked" ? "text-zinc-650" : "text-muted-foreground/80";
  return (
    <svg width={w} height={h} aria-hidden className={`overflow-visible flex-shrink-0 ${colorClass}`}>
      <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(data.length - 1) * step} cy={h - ((data[data.length - 1] - min) / range) * (h - 6) - 3} r={2} fill="currentColor" />
    </svg>
  );
}
export function SortIndicator({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronDown size={10} className="opacity-30" />;
  return dir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
}

export function KpiCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="bg-card border border-border p-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-[0.08em] font-semibold">{label}</div>
      <div className="mt-1.5 mono text-2xl font-semibold tabular-nums text-card-foreground leading-none">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-2">{sub}</div>}
    </Card>
  );
}

export function ExpandedDetail({ agent }: { agent: Agent }) {
  const activity = useMemo(() => {
    const types = ["policy.match", "spend.commit", "authn.verify", "card.auth", "ledger.append"];
    const outcomes = ["ALLOW", "ALLOW", "STEP_UP", "ALLOW"];
    let hash = 0;
    for (let i = 0; i < agent.id.length; i++) hash = ((hash << 5) - hash + agent.id.charCodeAt(i)) | 0;
    return Array.from({ length: 4 }, (_, i) => {
      const typeIndex = (Math.abs(hash) + i) % types.length;
      const outcomeIndex = (Math.abs(hash) + i + 1) % outcomes.length;
      const t = types[typeIndex];
      const o = outcomes[outcomeIndex];
      const mins = (i + 1) * 23 + (Math.abs(hash) & 0xf);
      return { type: t, outcome: o, when: `${mins}m ago` };
    });
  }, [agent.id]);
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden bg-muted/30 backdrop-blur-xl border-t border-border/40 relative shadow-inner"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-muted/10 to-transparent pointer-events-none" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 px-8 py-8 relative z-10">
        <div className="md:col-span-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-5 flex items-center gap-3">
            Active mandates
            <span className="h-[1px] flex-1 bg-gradient-to-r from-border/50 to-transparent" />
          </div>
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } }
            }}
          >
            {agent.mandates.map((m) => (
              <motion.div 
                key={m.id} 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
                }}
                className="group relative flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border/50 shadow-sm transition-all duration-300 hover:bg-card/90 hover:border-border/80 hover:shadow-md hover:-translate-y-0.5 overflow-hidden cursor-default"
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0 transition-colors duration-300 shadow-sm">
                    <KeyRound size={14} className="text-muted-foreground transition-colors" />
                  </div>
                  <div className="text-sm font-semibold text-foreground tracking-tight">{m.label}</div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">{m.detail}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
        <div className="flex flex-col relative before:absolute before:left-[-20px] before:top-0 before:bottom-0 before:w-[1px] before:bg-gradient-to-b before:from-border/50 before:to-transparent before:hidden md:before:block pl-0 md:pl-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-5 flex items-center gap-3">
            Recent activity
          </div>
          <motion.div 
            className="space-y-4 flex-1"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
            }}
          >
            {activity.map((a, i) => (
              <motion.div 
                key={i} 
                variants={{
                  hidden: { opacity: 0, x: 10 },
                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
                }}
                className="flex items-start justify-between gap-3 group cursor-default"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor] transition-transform duration-300 group-hover:scale-125 ${
                    a.outcome === "ALLOW" ? "bg-emerald-400 text-emerald-400" : a.outcome === "STEP_UP" ? "bg-amber-400 text-amber-400" : "bg-red-400 text-red-400"
                  }`} />
                  <span className="mono text-xs text-foreground/80 font-medium truncate group-hover:text-foreground transition-colors">{a.type}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap pt-0.5">{a.when}</span>
              </motion.div>
            ))}
          </motion.div>
          
          <div className="mt-8 pt-5 relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-border/50 to-transparent" />
            <div className="flex items-center justify-between text-[11px] mb-3">
              <span className="text-muted-foreground font-medium uppercase tracking-wider">Compliance posture</span>
              <span className="mono font-bold text-foreground tabular-nums text-sm">{agent.enforcement ? "98%" : "—"}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border shadow-inner relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: agent.enforcement ? "98%" : "0%" }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="absolute top-0 left-0 bottom-0 rounded-full bg-foreground shadow-sm" 
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <Card className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
      <div className="text-sm text-muted-foreground">No agents match this filter.</div>
      <button onClick={onClear} className="mt-3 text-xs text-foreground/80 underline underline-offset-2 ">
        Clear filter
      </button>
    </Card>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const TZ_OPTIONS = [
  { value: "America/Sao_Paulo", label: "São Paulo (UTC−03)" },
  { value: "America/New_York", label: "New York (UTC−05/−04)" },
  { value: "Europe/London", label: "London (UTC+00/+01)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+09)" },
  { value: "UTC", label: "UTC" },
];

