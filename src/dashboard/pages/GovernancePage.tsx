import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { Cpu, ShieldCheck, Pause, Play, Ban, X, KeyRound, Trash2, Pencil, ChevronRight, Search, Briefcase, Activity, Headphones } from "lucide-react";
import { useStore, money, type Agent } from "../data";
import { IconBtn, Chip, Toggle, PageHeader, SegmentedControl } from "../ui";

// Premium UI Component imports from the installed blocks
import { Button } from "@/components/ui/button";



// Stagger wrapper for cards



import { generateSparkline, Sparkline, SortIndicator, KpiCard, ExpandedDetail, NoMatches, statusTone, stagger, fadeUp } from "./shared";

// Spend as a share of limit — guards agents with no limit set yet (e.g. still
// enrolling, governance endpoint unreachable) so we never divide by zero.
const spendRatio = (a: Agent): number => (a.spendLimit > 0 ? a.spendUsed / a.spendLimit : 0);
export function GovernancePage() {
  const { agents, toggleAgentEnforcement, setAgentStatus, activeAgentId } = useStore();
  const [statusFilter, setStatusFilter] = useState<"all" | Agent["status"]>("all");
  const [sortKey, setSortKey] = useState<"name" | "tasks" | "spend" | "mandates" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingAgent = useMemo(
    () => (editingId ? agents.find((a) => a.id === editingId) ?? null : null),
    [editingId, agents]
  );

  useEffect(() => {
    if (activeAgentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedId(activeAgentId);
    }
  }, [activeAgentId]);

  // KPI totals — memoized to avoid recompute on every render
  const kpis = useMemo(() => {
    let active = 0, paused = 0, revoked = 0, totalSpend = 0, totalMandates = 0;
    for (const a of agents) {
      if (a.status === "active") active++;
      else if (a.status === "paused") paused++;
      else if (a.status === "revoked") revoked++;
      totalSpend += a.spendUsed;
      totalMandates += a.mandates.length;
    }
    return {
      total: agents.length,
      active, paused, revoked,
      totalSpend,
      avgMandates: agents.length ? totalMandates / agents.length : 0,
    };
  }, [agents]);

  // Sparkline cache — deterministic per agent id, computed once per agents list
  const sparklineCache = useMemo(() => {
    const cache: Record<string, number[]> = {};
    for (const a of agents) cache[a.id] = generateSparkline(a.id, Math.max(a.spendUsed / 14, 1));
    return cache;
  }, [agents]);

  // Filtered + sorted agents
  const visibleAgents = useMemo(() => {
    const list = statusFilter === "all" ? agents.slice() : agents.filter((a) => a.status === statusFilter);
    if (sortKey) {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name") cmp = a.name.localeCompare(b.name);
        else if (sortKey === "tasks") cmp = a.tasks - b.tasks;
        else if (sortKey === "spend") cmp = spendRatio(a) - spendRatio(b);
        else if (sortKey === "mandates") cmp = a.mandates.length - b.mandates.length;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [agents, statusFilter, sortKey, sortDir]);

  // Grouped agents — sections for active / paused / revoked when no filter applied
  const groupedAgents = useMemo(() => {
    if (statusFilter !== "all") {
      return [{ status: statusFilter, items: visibleAgents }];
    }
    const buckets: Record<Agent["status"], Agent[]> = { active: [], paused: [], revoked: [], killed: [], connecting: [] };
    for (const a of visibleAgents) buckets[a.status].push(a);
    const order: Agent["status"][] = ["active", "paused", "revoked", "killed", "connecting"];
    return order.filter((s) => buckets[s].length > 0).map((s) => ({ status: s, items: buckets[s] }));
  }, [visibleAgents, statusFilter]);

  const handleSort = (key: "name" | "tasks" | "spend" | "mandates") => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Filter chip config for the header
  const filterButtons: Array<{ key: "all" | Agent["status"]; label: string; count: number; dot?: string; ping?: boolean }> = [
    { key: "all", label: "All", count: kpis.total },
    { key: "active", label: "Active", count: kpis.active, dot: "bg-emerald-500", ping: true },
    { key: "paused", label: "Paused", count: kpis.paused, dot: "bg-amber-500" },
  ];
  if (kpis.revoked > 0) filterButtons.push({ key: "revoked", label: "Revoked", count: kpis.revoked, dot: "bg-red-500" });

  return (
    <>
      <PageHeader
        title="Governance"
        subtitle="Every agent, its mandates, and the limits you've signed."
        actions={
          <div className="flex items-center gap-3">
            {agents.length > 0 && (
              <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground mr-1">
                {filterButtons.map((f) => {
                  const active = statusFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${
                        active ? "bg-muted text-foreground" : ""
                      }`}
                      aria-pressed={active}
                    >
                      {f.dot && (
                        <span className="relative inline-flex h-1.5 w-1.5">
                          {f.ping && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />}
                          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${f.dot}`} />
                        </span>
                      )}
                      <span>{f.label}</span>
                      <span className="font-medium tabular-nums text-foreground/80">{f.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        }
      />
      <div className="ad-scroll overflow-y-auto flex-1 p-6 space-y-5">
        {agents.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            variants={stagger}
            initial="visible"
            animate="visible"
          >
            <motion.div variants={fadeUp}>
              <KpiCard label="Total agents" value={kpis.total.toLocaleString()} sub={`${kpis.active} active, ${kpis.paused} paused`} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <KpiCard label="Active" value={kpis.active.toLocaleString()} sub={`${kpis.total ? Math.round((kpis.active / kpis.total) * 100) : 0}% of system`} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <KpiCard label="Total spend" value={`$${kpis.totalSpend.toLocaleString()}`} sub="this billing period" />
            </motion.div>
            <motion.div variants={fadeUp}>
              <KpiCard label="Avg mandates" value={kpis.avgMandates.toFixed(1)} sub="per agent" />
            </motion.div>
          </motion.div>
        )}

        {visibleAgents.length === 0 ? (
          statusFilter === "all" ? (
            <EmptyGovernance />
          ) : (
            <NoMatches onClear={() => setStatusFilter("all")} />
          )
        ) : (
          <div className="overflow-x-auto rounded-xl">
          <motion.div
            className="bg-card text-card-foreground border border-border/60 rounded-xl overflow-hidden shadow-xl relative"
            variants={stagger}
            initial="visible"
            animate="visible"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-transparent pointer-events-none" />
            <div className="hidden md:grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-border/60 bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground font-bold relative z-10">
              <button onClick={() => handleSort("name")} className="col-span-3 flex items-center gap-1  text-left">
                Agent <SortIndicator active={sortKey === "name"} dir={sortDir} />
              </button>
              <button onClick={() => handleSort("tasks")} className="col-span-1 flex items-center gap-1  text-left">
                Tasks <SortIndicator active={sortKey === "tasks"} dir={sortDir} />
              </button>
              <button onClick={() => handleSort("spend")} className="col-span-2 flex items-center gap-1  text-left">
                Spend <SortIndicator active={sortKey === "spend"} dir={sortDir} />
              </button>
              <div className="col-span-2">Trend</div>
              <button onClick={() => handleSort("mandates")} className="col-span-2 flex items-center gap-1  text-left">
                Mandates <SortIndicator active={sortKey === "mandates"} dir={sortDir} />
              </button>
              <div className="col-span-2 text-right pr-1">Controls</div>
            </div>

            {groupedAgents.map((group) => (
              <div key={group.status}>
                {statusFilter === "all" && groupedAgents.length > 1 && (
                  <div className="px-4 py-1.5 bg-muted/30 border-b border-border/40 text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      group.status === "active" ? "bg-emerald-500" : group.status === "paused" ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    {group.status} · {group.items.length}
                  </div>
                )}
                {group.items.map((a, i) => {
                  const pct = Math.min(100, spendRatio(a) * 100);
                  const isExpanded = expandedId === a.id;
                  const sparkData = sparklineCache[a.id];
                  return (
                    <div key={a.id} className={i > 0 ? "border-t border-border/40" : ""}>
                      <motion.div
                        variants={fadeUp}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button")) return;
                          setExpandedId(isExpanded ? null : a.id);
                        }}
                        className={`relative grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-4 py-4 group cursor-pointer transition-all duration-300 ${isExpanded ? "bg-muted/40" : "hover:bg-muted/20"}`}
                      >
                        <div className="md:col-span-3 flex items-center gap-4 min-w-0 pl-1">
                          <ChevronRight size={14} className={`text-muted-foreground/50 transition-transform duration-300 flex-shrink-0 ${isExpanded ? "rotate-90 text-foreground" : "group-hover:text-foreground/70"}`} />
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm flex-shrink-0 transition-colors duration-300 ${isExpanded ? "bg-card border-border/80 text-foreground" : "bg-gradient-to-br from-muted/50 to-muted/20 border-border/40 text-muted-foreground group-hover:border-border/80 group-hover:text-foreground/80"}`}>
                            {(() => {
                              const n = a.name.toLowerCase();
                              const props = { size: 18, strokeWidth: isExpanded ? 2 : 1.5 };
                              if (n.includes('research')) return <Search {...props} />;
                              if (n.includes('ops')) return <Activity {...props} />;
                              if (n.includes('finance')) return <Briefcase {...props} />;
                              if (n.includes('support')) return <Headphones {...props} />;
                              if (n.includes('security')) return <ShieldCheck {...props} />;
                              return <Cpu {...props} />;
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                              <span className={`font-semibold text-sm truncate transition-colors duration-300 ${isExpanded ? "text-foreground" : "text-card-foreground group-hover:text-foreground"}`}>{a.name}</span>
                              <Chip tone={statusTone(a.status) as "ok" | "warn" | "bad"} dot>{a.status}</Chip>
                            </div>
                            <div className="mono text-[10px] text-muted-foreground mt-1 truncate tracking-wider opacity-70">{a.did}</div>
                          </div>
                        </div>

                        <div className="md:col-span-1 hidden md:block">
                          <span className="md:hidden text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Tasks</span>
                          <span className={`mono font-semibold text-xs tabular-nums transition-colors duration-300 ${isExpanded ? "text-foreground" : "text-card-foreground"}`}>{a.tasks.toLocaleString()}</span>
                        </div>

                        <div className={`md:col-span-2 min-w-0 ${isExpanded ? "" : "hidden md:block"}`}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="md:hidden text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Spend</span>
                            <span className={`mono text-[11px] tabular-nums ml-auto transition-colors duration-300 ${isExpanded ? "text-foreground" : "text-card-foreground"}`}>
                              {money(a.spendUsed)} <span className="text-muted-foreground/60">/ {money(a.spendLimit)}</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted border border-border shadow-inner">
                            <div
                              className="h-full rounded-full duration-700 ease-out shadow-[0_0_8px_currentColor]"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  a.status === "paused" ? "var(--amber-500, #f59e0b)" :
                                  a.status === "revoked" ? "var(--red-500, #ef4444)" :
                                  "var(--foreground)",
                              }}
                            />
                          </div>
                        </div>

                        <div className={`md:col-span-2 flex-col md:flex-row md:items-center min-w-0 ${isExpanded ? "flex" : "hidden md:flex"}`}>
                          <span className="md:hidden text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Activity</span>
                          <Sparkline data={sparkData} status={a.status} agentId={a.id} />
                        </div>

                        <div className={`md:col-span-2 min-w-0 ${isExpanded ? "" : "hidden md:block"}`}>
                          <div className="md:hidden text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Mandates</div>
                          <div className="flex flex-wrap gap-1.5">
                            {a.mandates.slice(0, 2).map((m) => (
                              <span key={m.id} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-foreground/80 bg-card border border-border rounded-full px-2.5 py-1 shadow-sm" title={m.detail}>
                                <KeyRound size={10} className="text-muted-foreground/80" />
                                {m.label}
                              </span>
                            ))}
                            {a.mandates.length > 2 && (
                              <span className="inline-flex items-center text-[10px] text-muted-foreground bg-muted/50 border border-transparent rounded-full px-2 py-1">+{a.mandates.length - 2}</span>
                            )}
                          </div>
                        </div>

                        <div className={`md:col-span-2 flex items-center justify-end gap-2 ${isExpanded ? "" : "hidden md:flex"}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground font-medium hidden lg:inline">Enforce</span>
                            <Toggle on={a.enforcement} onClick={() => toggleAgentEnforcement(a.id)} label={`enforcement for ${a.name}`} />
                          </div>
                          <div className="flex items-center gap-1">
                            <IconBtn onClick={() => setEditingId(a.id)} title="Edit agent" aria-label={`Edit ${a.name}`}>
                              <Pencil size={14} />
                            </IconBtn>
                            {a.status === "active" ? (
                              <IconBtn onClick={() => setAgentStatus(a.id, "paused")} title="Pause" aria-label={`Pause ${a.name}`} className="">
                                <Pause size={14} />
                              </IconBtn>
                            ) : a.status === "paused" ? (
                              <IconBtn onClick={() => setAgentStatus(a.id, "active")} title="Resume" aria-label={`Resume ${a.name}`} className="">
                                <Play size={14} />
                              </IconBtn>
                            ) : (
                              <IconBtn onClick={() => setAgentStatus(a.id, "active")} title="Reactivate" aria-label={`Reactivate ${a.name}`} className="">
                                <Play size={14} />
                              </IconBtn>
                            )}
                            {a.status !== "revoked" && (
                              <IconBtn onClick={() => setAgentStatus(a.id, "revoked")} title="Revoke" aria-label={`Revoke ${a.name}`} className="text-red-500 ">
                                <Ban size={14} />
                              </IconBtn>
                            )}
                          </div>
                        </div>
                      </motion.div>
                      <AnimatePresence initial={false}>
                        {isExpanded && <ExpandedDetail agent={a} />}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}
          </motion.div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {editingAgent && <EditAgentModal agent={editingAgent} onClose={() => setEditingId(null)} />}
      </AnimatePresence>
    </>
  );
}

function EmptyGovernance() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-card text-card-foreground border border-dashed border-border/80 rounded-xl overflow-hidden"
    >
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="relative w-14 h-14 mb-5">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--crimson,#b91c1c)]/15 to-[var(--crimson,#b91c1c)]/5 border border-[var(--crimson,#b91c1c)]/20" />
          <div className="absolute inset-0 flex items-center justify-center text-[var(--crimson,#b91c1c)]">
            <ShieldCheck size={22} strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="text-base font-semibold text-card-foreground mb-1.5 tracking-tight">No agents yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Agents registered in the control plane will appear here, each with its mandates, spend limits, and enforcement state.
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================
// Edit Agent Modal — name, spend limit, status, enforcement, mandates
// ============================================================
function EditAgentModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { updateAgent, toggleMandate, removeMandate, removeAgent } = useStore();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(agent.name);
  const [spendLimit, setSpendLimit] = useState(agent.spendLimit);
  const [status, setStatus] = useState<Agent["status"]>(agent.status);
  const [enforcement, setEnforcement] = useState(agent.enforcement);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // ESC + focus trap (matches PolicyComposer)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      target?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [onClose]);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    updateAgent(agent.id, {
      name: trimmedName,
      spendLimit,
      status,
      enforcement,
    });
    onClose();
  };

  return (
    <motion.div
      className="ad-composer-mask"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={dialogRef}
        className="ad-composer max-w-[520px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-agent-title"
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      >
        <div className="ad-composer-header">
          <h2 id="edit-agent-title" className="text-base">
            <Pencil size={16} style={{ verticalAlign: -3, marginRight: 8 }} />
            Edit agent
          </h2>
          <button className="ad-iconbtn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Read-only identity */}
        <div className="px-5 pt-4 pb-3 border-b border-border/60">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Identity</div>
          <div className="mono text-[11px] text-card-foreground break-all">{agent.did}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Read-only · cryptographic identifier</div>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label htmlFor="edit-agent-name" className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
              Name
            </label>
            <input
              id="edit-agent-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/15"
              autoFocus
            />
          </div>

          {/* Spend limit + Enforcement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-spend-limit" className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                Spend limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground mono pointer-events-none">$</span>
                <input
                  id="edit-spend-limit"
                  type="number"
                  min={0}
                  step={1}
                  value={spendLimit}
                  onChange={(e) => setSpendLimit(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full h-9 pl-7 pr-3 rounded-md border border-border bg-background text-sm mono tabular-nums focus:outline-none focus:ring-2 focus:ring-foreground/15"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                Enforcement
              </label>
              <div className="flex items-center h-9">
                <Toggle on={enforcement} onClick={() => setEnforcement((v) => !v)} label="Enforcement" />
                <span className="ml-2 text-xs text-muted-foreground">{enforcement ? "On" : "Off"}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
              Status
            </label>
            <SegmentedControl<Agent["status"]>
              value={status}
              onChange={setStatus}
              layoutId="edit-status-seg"
              size="sm"
              ariaLabel="Agent status"
              options={[
                { value: "active", label: "Active" },
                { value: "paused", label: "Paused" },
                { value: "revoked", label: "Revoked" },
              ]}
            />
          </div>

          {/* Mandates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Mandates ({agent.mandates.length})
              </label>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {agent.mandates.map((m) => (
                <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="pt-0.5">
                    <Toggle
                      on={m.active}
                      onClick={() => toggleMandate(agent.id, m.id)}
                      label={`mandate ${m.label}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-card-foreground truncate">{m.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{m.detail}</div>
                  </div>
                  <IconBtn onClick={() => removeMandate(agent.id, m.id)} title="Remove mandate" aria-label={`Remove ${m.label}`}>
                    <Trash2 size={13} />
                  </IconBtn>
                </div>
              ))}
              {agent.mandates.length === 0 && (
                <div className="text-[11px] text-muted-foreground italic px-2 py-3 text-center border border-dashed border-border/60 rounded-md">
                  No mandates yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border/60 bg-muted/20">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-destructive font-semibold">Type DELETE to confirm:</span>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="h-7 w-20 px-2 text-[11px] rounded border border-destructive/30 bg-destructive/5 text-destructive placeholder:text-destructive/40 focus:outline-none focus:ring-1 focus:ring-destructive"
                  autoFocus
                />
                <Button variant="destructive" size="sm" onClick={() => { removeAgent(agent.id); onClose(); }} disabled={deleteConfirmText !== "DELETE"}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => { setConfirmDelete(false); setDeleteConfirmText(""); }}>Cancel</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-3.5 mr-1.5" /> Delete Agent
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={confirmDelete}>Cancel</Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!canSave || confirmDelete}
            >
              Save changes
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Inbox — Split-Pane with Biometric
// ============================================================

