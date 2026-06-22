import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Inbox,
  History as HistoryIcon,
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
import { SignedIn, SignedOut, SignIn, UserButton, useAuth } from "@clerk/clerk-react";
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
import { OnboardingFlow } from "./components/Wizard";

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


interface AppProps {
  readonly getClerkToken?: () => Promise<string | null>;
}

export default function App({ getClerkToken }: AppProps = {}) {
  // Clerk mode is active whenever the auth token getter is wired in (see
  // ClerkAppContent). Demo/seed mode passes no getter, so the Clerk-only UI
  // (sign-out UserButton) stays hidden and never renders outside ClerkProvider.
  const clerkMode = getClerkToken !== undefined;

  useEffect(() => {
    if (getClerkToken && api instanceof HttpApi) {
      api.setGetClerkToken(getClerkToken);
    }
  }, [getClerkToken]);

  const [pending, setPending] = useState<readonly ApprovalRequest[]>([]);
  const [history, setHistory] = useState<readonly ResolvedApproval[]>([]);
  const [agents, setAgents] = useState<readonly AgentSummary[]>([]);
  const [activity, setActivity] = useState<readonly ActivityEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAgentDid, setSelectedAgentDid] = useState<string | null>(null);
  const [view, setView] = useState<View>("governance");
  const [busy, setBusy] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const isLg = useMediaQuery("(min-width: 1024px)");
  const nowMs = useNow(1000);

  // Track whether the first data fetch has completed so we don't flash onboarding before agents load
  const [dataLoaded, setDataLoaded] = useState(false);
  // Persist dismissed state in localStorage so it survives reloads
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem("agentgrid_onboarding_done") === "1",
  );

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
      setDataLoaded(true);
      // Set selected agent DID if not already set
      if (selectedAgentDid === null && ag.length > 0) {
        const firstAgentDid = ag[0]!.did;
        setSelectedAgentDid(firstAgentDid);
        if (api instanceof HttpApi) {
          api.setAgentDid(firstAgentDid);
        }
      }
      // Auto-dismiss onboarding once we know agents exist — prevents the screen
      // from toggling back to OnboardingFlow if a poll briefly returns []
      if (ag.length > 0) {
        localStorage.setItem("agentgrid_onboarding_done", "1");
        setOnboardingDismissed(true);
      }
    } catch (err) {
      console.error(err);
      setConnectionError("Backend connection failed — retrying. Check that the relay is reachable.");
      setDataLoaded(true);
    }
  }, [selectedAgentDid]);

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

  // CLI Login redirect handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let cliPort = params.get("login_cli_port");

    if (cliPort) {
      sessionStorage.setItem("agentgrid_login_cli_port", cliPort);
    } else {
      cliPort = sessionStorage.getItem("agentgrid_login_cli_port");
    }

    if (!cliPort) return;

    if (getClerkToken) {
      void (async () => {
        try {
          const { token } = await api.issueAgentToken();
          sessionStorage.removeItem("agentgrid_login_cli_port");
          sessionStorage.removeItem("agentgrid_login_cli_port_ts");
          const redirectUrl = `http://localhost:${cliPort}/callback?token=${encodeURIComponent(token)}`;
          window.location.href = redirectUrl;
        } catch (err) {
          sessionStorage.removeItem("agentgrid_login_cli_port");
          sessionStorage.removeItem("agentgrid_login_cli_port_ts");
          console.error("Failed to issue token for CLI login:", err);
        }
      })();
    }
  }, [clerkMode, getClerkToken]);

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

  // Only show onboarding after the first fetch completes — prevents flashing on reload
  const showOnboarding = dataLoaded && clerkMode && !demo && agents.length === 0 && !onboardingDismissed;

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem("agentgrid_onboarding_done", "1");
    setOnboardingDismissed(true);
  }, []);

  if (showOnboarding) {
    return (
      <div className="flex h-screen overflow-y-auto" style={{ background: "var(--bg)" }}>
        <OnboardingFlow
          api={api}
          agents={agents}
          onDone={dismissOnboarding}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
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

        <div className="mt-auto space-y-3">
          {clerkMode && (
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-3" style={{ borderColor: "var(--line)" }}>
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
          {agents.length > 0 && (
            <div style={{ borderColor: "var(--line)" }} className="rounded-[var(--radius-md)] border px-3 py-3">
              <label className="block text-xs font-medium text-[var(--muted)] mb-2">Agent</label>
              <select
                value={selectedAgentDid || ""}
                onChange={(e) => {
                  const did = e.target.value;
                  setSelectedAgentDid(did);
                  if (api instanceof HttpApi) {
                    api.setAgentDid(did);
                  }
                  void refresh();
                }}
                className="w-full rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm cursor-pointer"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                }}
              >
                {agents.map((agent) => (
                  <option key={agent.did} value={agent.did}>
                    {agent.displayName} ({shortDid(agent.did)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b px-5 py-4 lg:hidden" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--text)]" strokeWidth={1.75} aria-hidden />
            <span className="font-semibold tracking-tight text-[var(--text)]">Agent Grid</span>
            {clerkMode && <UserButton afterSignOutUrl="/" />}
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

export function ClerkAppWrapper() {
  return (
    <>
      <SignedIn>
        <ClerkAppContent />
      </SignedIn>
      <SignedOut>
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0c] font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
          {/* Ambient light blobs */}
          <div className="absolute top-[-10%] left-[-10%] h-[45%] w-[45%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] h-[45%] w-[45%] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
          
          <div className="relative z-10 w-full max-w-md p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-[0_0_40px_rgba(99,102,241,0.25)]">
                <ShieldCheck className="h-9 w-9 text-white" strokeWidth={1.5} />
              </div>
              <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Agent Grid Console
              </h2>
              <p className="mt-3 text-sm text-[#8c8c9e] max-w-sm">
                A secure multi-tenant operator interface for human-in-the-loop autonomous AI agents.
              </p>
            </div>
            
            <div className="mt-10 overflow-hidden rounded-3xl border border-white/[0.06] bg-black/45 backdrop-blur-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <SignIn 
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent shadow-none p-0 border-none w-full",
                    headerTitle: "text-white font-bold",
                    headerSubtitle: "text-[#8c8c9e]",
                    socialButtonsBlockButton: "bg-[#16161a] border border-white/[0.08] hover:bg-[#1e1e24] text-white transition-all duration-200",
                    socialButtonsBlockButtonText: "text-white font-medium",
                    formButtonPrimary: "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold transition-all duration-200 shadow-[0_4px_20px_rgba(99,102,241,0.15)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.25)] border-none",
                    formFieldLabel: "text-xs font-semibold text-[#8c8c9e] uppercase tracking-wider",
                    formFieldInput: "bg-[#16161a] border border-white/[0.08] text-white focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200",
                    footerActionText: "text-[#8c8c9e]",
                    footerActionLink: "text-indigo-400 hover:text-indigo-300 font-semibold transition-all duration-200",
                    dividerLine: "bg-white/[0.08]",
                    dividerText: "text-[#8c8c9e] text-xs font-medium",
                    identityPreviewText: "text-white",
                    identityPreviewEditButtonIcon: "text-[#8c8c9e] hover:text-white"
                  }
                }}
              />
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  );
}

function ClerkAppContent() {
  const { getToken } = useAuth();
  return <App getClerkToken={getToken} />;
}
