import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Inbox,
  History as HistoryIcon,
  Bot,
  ShieldQuestion,
  LayoutDashboard,
  Landmark,
  Settings as SettingsIcon,
  Plug,
  Smartphone,
  KeyRound,
} from "lucide-react";
import { HttpApi, SeedApi, type ApprovalApi } from "./api";
import type { ActivityEntry, AgentSummary, ApprovalDecision, ApprovalRequest, LicenseStatus, ResolvedApproval } from "./types";
import { shortDid } from "./lib/format";
import { useMediaQuery, useNow } from "./lib/useMediaQuery";
import { InboxList } from "./components/InboxList";
import { ApprovalCard } from "./components/ApprovalCard";
import { History } from "./components/History";
import { Dashboard } from "./components/Dashboard";
import { GovernanceConsole } from "./components/Governance";
import { Settings } from "./components/Settings";
import { ProvidersScreen } from "./components/Providers";
import { DevicesScreen } from "./components/Devices";
import { SetupWizard, useWizardVisible } from "./components/Wizard";

type View = "governance" | "dashboard" | "inbox" | "history" | "settings" | "providers" | "devices";

const resolveApiBase = (): string => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const qApi = params.get("api");
  const qPort = params.get("port");

  if (qApi) {
    localStorage.setItem("agentgrid_api_base", qApi);
    const url = new URL(window.location.href);
    url.searchParams.delete("api");
    window.history.replaceState({}, "", url.toString());
    return qApi;
  }

  if (qPort) {
    const localBase = `http://localhost:${qPort}`;
    localStorage.setItem("agentgrid_api_base", localBase);
    const url = new URL(window.location.href);
    url.searchParams.delete("port");
    window.history.replaceState({}, "", url.toString());
    return localBase;
  }

  return localStorage.getItem("agentgrid_api_base") || (import.meta.env.VITE_AGENTGRID_API as string) || "";
};

const apiBase = resolveApiBase();
const demo = (import.meta.env.VITE_AGENTGRID_DEMO as string | undefined) === "1";
const api: ApprovalApi = demo
  ? new SeedApi()
  : new HttpApi(apiBase);
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

// Unlicensed-state banner (task 4.8): shown prominently when enforcement is on
// and the license is not operable.
const UnlicensedBanner = ({ onGoToLicense }: { onGoToLicense: () => void }) => (
  <div
    className="mb-5 flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border px-4 py-3"
    style={{ borderColor: "var(--danger)", background: "var(--danger-dim)" }}
  >
    <div className="flex items-center gap-3">
      <KeyRound className="h-5 w-5 shrink-0" style={{ color: "var(--danger)" }} strokeWidth={1.75} aria-hidden />
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Agent gated — no active license</p>
        <p className="text-xs" style={{ color: "var(--danger)", opacity: 0.8 }}>All tools are blocked until you activate a license key.</p>
      </div>
    </div>
    <button
      onClick={onGoToLicense}
      className="shrink-0 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
      style={{ background: "var(--danger)", color: "var(--bg)" }}
    >
      Activate
    </button>
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
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const isLg = useMediaQuery("(min-width: 1024px)");
  const nowMs = useNow(1000);

  // First-run wizard
  const [wizardVisible, dismissWizard] = useWizardVisible();

  const refresh = useCallback(async () => {
    try {
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
      setConnectionError(null);
    } catch (err) {
      console.error(err);
      setConnectionError("Connection failed. Make sure your Railway backend is online.");
    }
  }, []);

  // Periodically check license status for the unlicensed-state banner (task 4.8)
  const refreshLicense = useCallback(async () => {
    try {
      setLicenseStatus(await api.getLicense());
      setConnectionError(null);
    } catch {
      // Handled by main refresh
    }
  }, []);

  const freeze = useCallback(
    async (params: { agentDid: string; reason: string }) => {
      setBusy(true);
      try { await api.freeze(params); await refresh(); } finally { setBusy(false); }
    },
    [refresh],
  );

  const unfreeze = useCallback(
    async (params: { agentDid: string }) => {
      setBusy(true);
      try { await api.unfreeze(params); await refresh(); } finally { setBusy(false); }
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
    void refreshLicense();
    const handleRefresh = setInterval(() => void refresh(), 2000);
    const handleLicense = setInterval(() => void refreshLicense(), 10000);
    return () => { clearInterval(handleRefresh); clearInterval(handleLicense); };
  }, [refresh, refreshLicense]);

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
      } finally { setBusy(false); }
    },
    [selected, refresh],
  );

  const mobileShowCard = !isLg && selected !== null && view === "inbox";

  // Show the unlicensed banner only when enforcement is on and not operable
  const showUnlicensedBanner =
    licenseStatus !== null &&
    licenseStatus.mode === "enforced" &&
    !licenseStatus.operable;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* First-run wizard overlay */}
      {wizardVisible && (
        <SetupWizard
          api={api}
          onDone={() => { dismissWizard(); }}
        />
      )}

      {/* Desktop rail */}
      <aside
        className="hidden w-60 shrink-0 flex-col border-r px-4 py-6 lg:flex"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2.5 px-2">
          <ShieldCheck className="h-6 w-6 text-[var(--text)]" strokeWidth={1.75} aria-hidden />
          <span className="text-base font-semibold tracking-tight text-[var(--text)]">Agent Grid</span>
        </div>
        <p className="mb-7 mt-1 px-2 text-xs text-[var(--subtle)]">Approvals</p>

        <nav className="flex flex-col gap-1">
          <NavButton active={view === "governance"} onClick={() => setView("governance")} label="Governance" icon={<Landmark className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
          <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")} label="Dashboard" icon={<LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
          <NavButton active={view === "inbox"} onClick={() => setView("inbox")} label="Inbox" count={pending.length} icon={<Inbox className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
          <NavButton active={view === "history"} onClick={() => setView("history")} label="History" icon={<HistoryIcon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />

          {/* Settings section */}
          <div className="mt-4 mb-1 px-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle)]">Setup</p>
          </div>
          <NavButton active={view === "providers"} onClick={() => setView("providers")} label="Providers" icon={<Plug className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
          <NavButton active={view === "devices"} onClick={() => setView("devices")} label="Devices" icon={<Smartphone className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
          <NavButton active={view === "settings"} onClick={() => setView("settings")} label="Settings" icon={<SettingsIcon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />} />
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-3" style={{ borderColor: "var(--line)" }}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-full)]" style={{ background: "var(--surface-3)" }}>
            <Bot className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--text)]">Agent Grid Agent</p>
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
            <span className="font-semibold tracking-tight text-[var(--text)]">Agent Grid</span>
          </div>
          <div className="flex gap-1 rounded-[var(--radius-md)] p-1" style={{ background: "var(--surface-2)" }}>
            {(["governance", "dashboard", "inbox", "history", "providers", "devices", "settings"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium cursor-pointer capitalize"
                style={{
                  background: view === v ? "var(--surface-3)" : "transparent",
                  color: view === v ? "var(--text)" : "var(--muted)",
                }}
              >
                {v === "governance" ? "Gov" : v === "dashboard" ? "Dash" : v === "providers" ? "Prov" : v === "devices" ? "Dev" : v === "settings" ? "Config" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            {/* Connection error warning banner */}
            {connectionError !== null && (
              <div className="mb-6 rounded-[var(--radius-md)] border px-4 py-3 text-sm" style={{ background: "var(--danger-dim)", borderColor: "var(--danger)", color: "var(--danger)" }}>
                <p className="font-semibold">{connectionError}</p>
                <p className="mt-1 text-xs opacity-90">
                  The dashboard is trying to connect to the backend at: <code className="mono bg-black/30 px-1 py-0.5 rounded">{import.meta.env.VITE_AGENTGRID_API || "same-origin (Vercel host)"}</code>
                </p>
                <p className="mt-2 text-xs opacity-80">
                  Ensure the Railway backend is running, and that you have configured <code>VITE_AGENTGRID_API</code> in Vercel to point to your Railway URL.
                </p>
              </div>
            )}

            {/* Unlicensed-state UX banner (task 4.8) */}
            {showUnlicensedBanner && (
              <UnlicensedBanner onGoToLicense={() => setView("settings")} />
            )}

            {view === "settings" ? (
              <Settings api={api} />
            ) : view === "governance" ? (
              <GovernanceConsole api={api} agents={agents} busy={busy} onFreeze={freeze} onUnfreeze={unfreeze} />
            ) : view === "dashboard" ? (
              <Dashboard agents={agents} activity={activity} busy={busy} onFreeze={freeze} onUnfreeze={unfreeze} />
            ) : view === "providers" ? (
              <ProvidersScreen api={api} />
            ) : view === "devices" ? (
              <DevicesScreen api={api} />
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
