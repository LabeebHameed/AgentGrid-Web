import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Inbox, History as HistoryIcon, Bot, ShieldQuestion, LayoutDashboard, Landmark } from "lucide-react";
import { HttpApi, SeedApi, type ApprovalApi } from "./api";
import type { ActivityEntry, AgentSummary, ApprovalDecision, ApprovalRequest, ResolvedApproval } from "./types";
import { shortDid } from "./lib/format";
import { useMediaQuery, useNow } from "./lib/useMediaQuery";
import { InboxList } from "./components/InboxList";
import { ApprovalCard } from "./components/ApprovalCard";
import { History } from "./components/History";
import { Dashboard } from "./components/Dashboard";
import { GovernanceConsole } from "./components/Governance";

type View = "governance" | "dashboard" | "inbox" | "history";

// The app is part of Aegis: by default it talks to the bridge that serves it,
// same-origin (`/api/...`). VITE_AEGIS_API points it at a bridge on another
// origin; VITE_AEGIS_DEMO=1 runs the self-contained seeded demo with no backend.
const apiBase = import.meta.env.VITE_AEGIS_API as string | undefined;
const demo = (import.meta.env.VITE_AEGIS_DEMO as string | undefined) === "1";
const api: ApprovalApi = demo
  ? new SeedApi()
  : new HttpApi(apiBase !== undefined && apiBase !== "" ? apiBase : "");
const AGENT = "did:key:z6MkvS1cqyiGLD6vMgccHakJ1GZK9mfkQnjbxZdxTyW8X23b";

const EmptyInbox = () => (
  <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border py-20 text-center" style={{ borderColor: "var(--line)" }}>
    <span className="grid h-14 w-14 place-items-center rounded-[var(--radius-full)]" style={{ background: "var(--ok-dim)" }}>
      <ShieldCheck className="h-7 w-7" style={{ color: "var(--ok)" }} strokeWidth={1.75} aria-hidden />
    </span>
    <h2 className="mt-5 text-lg font-semibold text-[var(--text)]">All clear</h2>
    <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
      Nothing needs you right now. The agent keeps acting within its mandate — you'll only be pulled in for the consequential.
    </p>
  </div>
);

const NavButton = ({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-current={active}
    className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer"
    style={{ background: active ? "var(--surface-2)" : "transparent", color: active ? "var(--text)" : "var(--muted)" }}
  >
    {icon}
    <span className="flex-1 text-left">{label}</span>
    {count !== undefined && count > 0 && (
      <span
        className="mono grid h-5 min-w-5 place-items-center rounded-[var(--radius-full)] px-1.5 text-xs font-semibold"
        style={{ background: "var(--danger-dim)", color: "var(--danger)" }}
      >
        {count}
      </span>
    )}
  </button>
);

export default function App() {
  const [pending, setPending] = useState<readonly ApprovalRequest[]>([]);
  const [history, setHistory] = useState<readonly ResolvedApproval[]>([]);
  const [agents, setAgents] = useState<readonly AgentSummary[]>([]);
  const [activity, setActivity] = useState<readonly ActivityEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("governance");
  const [busy, setBusy] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");
  const nowMs = useNow(1000);

  const refresh = useCallback(async () => {
    const [p, h, ag, ac] = await Promise.all([
      api.listPending(),
      api.listHistory(),
      api.listAgents(),
      api.listActivity(),
    ]);
    setPending(p);
    setHistory(h);
    setAgents(ag);
    setActivity(ac);
  }, []);

  const freeze = useCallback(
    async (params: { agentDid: string; reason: string }) => {
      setBusy(true);
      try {
        await api.freeze(params);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const unfreeze = useCallback(
    async (params: { agentDid: string }) => {
      setBusy(true);
      try {
        await api.unfreeze(params);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  // Poll the bridge so a STEP_UP raised by the agent surfaces here within a
  // couple of seconds without a manual reload.
  useEffect(() => {
    void refresh();
    const handle = setInterval(() => void refresh(), 2000);
    return () => clearInterval(handle);
  }, [refresh]);

  // Keep a valid selection: default to the first pending request.
  useEffect(() => {
    if (pending.length === 0) {
      setSelectedId(null);
    } else if (selectedId === null || !pending.some((r) => r.id === selectedId)) {
      if (isLg) setSelectedId(pending[0]!.id);
    }
  }, [pending, selectedId, isLg]);

  const selected = useMemo(() => pending.find((r) => r.id === selectedId) ?? null, [pending, selectedId]);

  const decide = useCallback(
    async (decision: ApprovalDecision, reason: string) => {
      if (selected === null) return;
      setBusy(true);
      try {
        await api.decide({ id: selected.id, decision, reason });
        setSelectedId(null);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [selected, refresh],
  );

  const mobileShowCard = !isLg && selected !== null && view === "inbox";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop rail */}
      <aside
        className="hidden w-60 shrink-0 flex-col border-r px-4 py-6 lg:flex"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2.5 px-2">
          <ShieldCheck className="h-6 w-6 text-[var(--text)]" strokeWidth={1.75} aria-hidden />
          <span className="text-base font-semibold tracking-tight text-[var(--text)]">Aegis</span>
        </div>
        <p className="mb-7 mt-1 px-2 text-xs text-[var(--subtle)]">Approvals</p>

        <nav className="flex flex-col gap-1">
          <NavButton active={view === "governance"} onClick={() => setView("governance")} label="Governance" icon={<Landmark className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
          <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")} label="Dashboard" icon={<LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
          <NavButton active={view === "inbox"} onClick={() => setView("inbox")} label="Inbox" count={pending.length} icon={<Inbox className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
          <NavButton active={view === "history"} onClick={() => setView("history")} label="History" icon={<HistoryIcon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-3" style={{ borderColor: "var(--line)" }}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-full)]" style={{ background: "var(--surface-3)" }}>
            <Bot className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--text)]">Aegis Agent</p>
            <p className="mono truncate text-[11px] text-[var(--subtle)]">{shortDid(AGENT)}</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b px-5 py-4 lg:hidden" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--text)]" strokeWidth={1.75} aria-hidden />
            <span className="font-semibold tracking-tight text-[var(--text)]">Aegis Approvals</span>
          </div>
          <div className="flex gap-1 rounded-[var(--radius-md)] p-1" style={{ background: "var(--surface-2)" }}>
            <button onClick={() => setView("governance")} className="rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium cursor-pointer" style={{ background: view === "governance" ? "var(--surface-3)" : "transparent", color: view === "governance" ? "var(--text)" : "var(--muted)" }}>Governance</button>
            <button onClick={() => setView("dashboard")} className="rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium cursor-pointer" style={{ background: view === "dashboard" ? "var(--surface-3)" : "transparent", color: view === "dashboard" ? "var(--text)" : "var(--muted)" }}>Dashboard</button>
            <button onClick={() => setView("inbox")} className="rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium cursor-pointer" style={{ background: view === "inbox" ? "var(--surface-3)" : "transparent", color: view === "inbox" ? "var(--text)" : "var(--muted)" }}>Inbox</button>
            <button onClick={() => setView("history")} className="rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium cursor-pointer" style={{ background: view === "history" ? "var(--surface-3)" : "transparent", color: view === "history" ? "var(--text)" : "var(--muted)" }}>History</button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            {view === "governance" ? (
              <GovernanceConsole api={api} agents={agents} busy={busy} onFreeze={freeze} onUnfreeze={unfreeze} />
            ) : view === "dashboard" ? (
              <Dashboard agents={agents} activity={activity} busy={busy} onFreeze={freeze} onUnfreeze={unfreeze} />
            ) : view === "history" ? (
              <>
                <h1 className="mb-1 text-xl font-semibold tracking-tight text-[var(--text)]">Decision history</h1>
                <p className="mb-6 text-sm text-[var(--muted)]">Every approval and denial, signed and recorded.</p>
                <History items={history} />
              </>
            ) : (
              <>
                {!mobileShowCard && (
                  <div className="mb-6 flex items-baseline justify-between">
                    <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Pending approvals</h1>
                    <span className="text-sm text-[var(--muted)]">
                      {pending.length === 0 ? "none" : `${pending.length} awaiting you`}
                    </span>
                  </div>
                )}

                {pending.length === 0 ? (
                  <EmptyInbox />
                ) : isLg ? (
                  <div className="grid grid-cols-[360px_1fr] gap-6">
                    <div className="min-w-0">
                      <InboxList requests={pending} selectedId={selectedId} nowMs={nowMs} onSelect={setSelectedId} />
                    </div>
                    <div className="min-w-0">
                      {selected ? (
                        <ApprovalCard request={selected} nowMs={nowMs} busy={busy} onDecide={decide} />
                      ) : (
                        <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-[var(--radius-lg)] border text-center" style={{ borderColor: "var(--line)" }}>
                          <ShieldQuestion className="h-6 w-6 text-[var(--subtle)]" aria-hidden />
                          <p className="mt-2 text-sm text-[var(--subtle)]">Select a request to review.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : mobileShowCard && selected ? (
                  <ApprovalCard request={selected} nowMs={nowMs} busy={busy} onDecide={decide} onBack={() => setSelectedId(null)} />
                ) : (
                  <InboxList requests={pending} selectedId={selectedId} nowMs={nowMs} onSelect={setSelectedId} />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
