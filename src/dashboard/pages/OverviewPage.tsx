import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Inbox as InboxIcon, DollarSign, Activity, AlertTriangle, ChevronDown, ChevronRight, Fingerprint, ScrollText, Shield } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useStore, money } from "../data";
import type { RouteKey } from "../Dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { SpendTrendChart, DecisionsDonut, SystemPostureCard, AuditLedgerPanel, LiveActivityPanel, SystemPassportPanel } from "./shared";
// Simple stagger animations
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: "easeOut" as const } },
};

export function OverviewPage({ onNav }: { onNav: (k: RouteKey) => void }) {
  const { agents, approvals, ledger, providers, settings, toast } = useStore();
  const spend = agents.reduce((s, a) => s + a.spendUsed, 0);
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const decisionsToday = ledger.length;
  const pendingCount = approvals.length;

  const [timeframe, setTimeframe] = useState("Last 30 days");

  return (
    <div className="ad-scroll flex flex-1 flex-col gap-5 overflow-y-auto p-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-[1.5rem] leading-[1.15] font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-0.015em" }}>
              Overview
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live operational metrics and system telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 relative before:absolute before:-inset-1 before:content-['']">
                {timeframe}
                <ChevronDown size={11} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem className="focus:bg-transparent" onClick={() => { setTimeframe("Last 7 days"); toast("Timeframe updated", "ok"); }}>Last 7 days</DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-transparent" onClick={() => { setTimeframe("Last 30 days"); toast("Timeframe updated", "ok"); }}>Last 30 days</DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-transparent" onClick={() => { setTimeframe("Last 90 days"); toast("Timeframe updated", "ok"); }}>Last 90 days</DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-transparent" onClick={() => { setTimeframe("All time"); toast("Timeframe updated", "ok"); }}>All time</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Enforcement-off warning ── */}
      <AnimatePresence>
        {!settings.enforcement && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 px-4 py-3 bg-amber-500/5">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Enforcement is paused</p>
                <p className="text-xs text-muted-foreground mt-0.5">Policies are currently evaluated in monitoring-only mode. Actions are not blocked.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2"
                onClick={() => onNav("settings")}
              >
                Configure →
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stat cards — monochromatic, unified layout ── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <StatCard
            label="Pending approvals"
            icon={<InboxIcon size={13} />}
            value={pendingCount}
            note="requires review"
            chartData={[{ v: 2 }, { v: 3 }, { v: 2 }, { v: 4 }, { v: 3 }, { v: 4 }]}
            alert={pendingCount > 0}
            onAction={pendingCount > 0 ? () => onNav("inbox") : undefined}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <StatCard
            label="Active agents"
            icon={<Cpu size={13} />}
            value={`${activeAgents} / ${agents.length}`}
            note="systems online"
            chartData={[{ v: 1 }, { v: 2 }, { v: 2 }, { v: 2 }, { v: 3 }, { v: 2 }, { v: 2 }]}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <StatCard
            label="Spend this month"
            icon={<DollarSign size={13} />}
            value={money(spend)}
            note="accrued usage"
            chartData={[{ v: 180 }, { v: 240 }, { v: 210 }, { v: 320 }, { v: 380 }, { v: 350 }, { v: 430 }]}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <StatCard
            label="Decisions today"
            icon={<Activity size={13} />}
            value={decisionsToday}
            note="policies evaluated"
            chartData={[{ v: 15 }, { v: 22 }, { v: 19 }, { v: 35 }, { v: 42 }, { v: 38 }, { v: 47 }]}
          />
        </motion.div>
      </motion.div>

      {/* ── Charts row ── */}
      <motion.div
        className="grid grid-cols-1 gap-3 lg:grid-cols-3"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-semibold">Spend over time</CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">Cumulative monthly operational cost</CardDescription>
                </div>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                  {money(spend)} total
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <SpendTrendChart />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-xs font-semibold">Decisions by verdict</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">Policy outcomes breakdown</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-1">
              <DecisionsDonut ledger={ledger} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── 3-column operational row ── */}
      <motion.div
        className="grid grid-cols-1 gap-3 lg:grid-cols-3"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Posture card */}
        <motion.div variants={fadeUp} className="h-full">
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" />
                <div>
                  <CardTitle className="text-xs font-semibold">System posture</CardTitle>
                  <CardDescription className="text-[10px]">Mandate coverage by family</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <SystemPostureCard agents={agents} approvals={approvals} />
            </CardContent>
            <div className="px-6 pb-5">
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1 text-xs"
                onClick={() => onNav("governance")}
              >
                Open Governance
                <ChevronRight size={11} />
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Live activity card */}
        <motion.div variants={fadeUp} className="h-full">
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-muted-foreground" />
                  <div>
                    <CardTitle className="text-xs font-semibold">Live activity</CardTitle>
                    <CardDescription className="text-[10px]">Operational signals feed</CardDescription>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </span>
                  live
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <LiveActivityPanel ledger={ledger} />
            </CardContent>
            <div className="px-6 pb-5">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1 text-xs"
                onClick={() => onNav("audit")}
              >
                Activity logs
                <ChevronRight size={11} />
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Operator passport card */}
        <motion.div variants={fadeUp} className="h-full">
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Fingerprint size={14} className="text-muted-foreground" />
                <div>
                  <CardTitle className="text-xs font-semibold">Operator passport</CardTitle>
                  <CardDescription className="text-[10px]">Cryptographic keys & identity</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <SystemPassportPanel agents={agents} providers={providers} />
            </CardContent>
            <div className="px-6 pb-5">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1 text-xs"
                onClick={() => onNav("settings")}
              >
                Identity settings
                <ChevronRight size={11} />
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Audit ledger (unified Card) ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText size={14} className="text-muted-foreground" />
                <div>
                  <CardTitle className="text-xs font-semibold">Audit ledger</CardTitle>
                  <CardDescription className="text-[11px]">Hash-chained secure records stream</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AuditLedgerPanel ledger={ledger} onOpenHistory={() => onNav("audit")} />
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
}

function StatCard({
  label, icon, value, note, chartData, alert, onAction,
}: {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  note: string;
  chartData: { v: number }[];
  alert?: boolean;
  onAction?: () => void;
}) {
  return (
    <Card className="relative overflow-hidden flex flex-col justify-between h-[150px] p-5 bg-card border border-border/60 shadow-sm transition-all hover:shadow hover:border-border group rounded-[14px]">
      
      {/* Decorative Background Chart */}
      <div className="absolute bottom-0 left-0 right-0 h-[72px] opacity-40 pointer-events-none z-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 25 }}>
            <defs>
              <linearGradient id={`grad-${label.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.12} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke="currentColor"
              strokeWidth={1.5}
              fill={`url(#grad-${label.replace(/\s+/g, "-")})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Header & Value */}
      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="text-muted-foreground opacity-70">{icon}</span>
        </div>
        <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums flex items-center gap-2">
          {value}
          {alert && <span className="size-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between mt-auto pt-4">
        <span className="text-[11px] text-muted-foreground font-medium">{note}</span>
        {onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground bg-background/80 hover:bg-muted border border-border/60 rounded-md px-2.5 py-1 transition-colors backdrop-blur-sm shadow-sm"
          >
            Review <ChevronRight size={10} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </Card>
  );
}

