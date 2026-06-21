import { useState, useCallback, useEffect } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Settings2,
  Plug,
  Terminal,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import type { ApprovalApi } from "../api";
import type { AppConfig, AgentSummary } from "../types";
import { ProvidersScreen } from "./Providers";

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: "limits", label: "Set your limits", icon: <Settings2 className="h-4 w-4" strokeWidth={1.75} aria-hidden /> },
  { id: "providers", label: "Providers", icon: <Plug className="h-4 w-4" strokeWidth={1.75} aria-hidden />, optional: true },
  { id: "connect", label: "Connect your agent", icon: <Terminal className="h-4 w-4" strokeWidth={1.75} aria-hidden /> },
  { id: "done", label: "Done", icon: <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden /> },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--subtle)" }}>
    {children}
  </label>
);

const inputCls =
  "w-full rounded-[var(--radius-md)] border bg-transparent px-3 py-2 text-sm outline-none";

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="rounded-[var(--radius-md)] p-1.5 cursor-pointer transition-colors hover:opacity-80"
      style={{ color: "var(--subtle)" }}
      aria-label="Copy"
    >
      {copied ? <Check className="h-4 w-4" style={{ color: "var(--ok)" }} /> : <Copy className="h-4 w-4" />}
    </button>
  );
};

const CodeBlock = ({ code }: { code: string }) => (
  <div
    className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 py-2"
    style={{ background: "var(--surface-2)" }}
  >
    <code className="mono text-sm truncate select-all" style={{ color: "var(--text)" }}>
      {code}
    </code>
    <CopyButton text={code} />
  </div>
);

// ─── Step 1 — Limits ─────────────────────────────────────────────────────────

const centsToDisplay = (minor: number | null | undefined): string =>
  minor == null || minor === 0 ? "" : (minor / 100).toFixed(2).replace(/\.00$/, "");

const displayToCents = (val: string): number | null => {
  const n = parseFloat(val.replace(/[$,]/g, ""));
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n * 100);
};

const LimitsStep = ({ api, onSaved }: { api: ApprovalApi; onSaved: () => void }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local dollar-string state for pay mandate fields
  const [agentName, setAgentName] = useState("");
  const [stepUpAmount, setStepUpAmount] = useState("");
  const [monthlyCapAmount, setMonthlyCapAmount] = useState("");

  useEffect(() => {
    api
      .getConfig()
      .then((l) => {
        setConfig(l.config);
        setAgentName(l.config.agent.displayName);
        const pay = l.config.agent.mandates.find((m) => m.capability === "pay");
        setStepUpAmount(centsToDisplay(pay?.stepUpThresholdMinor));
        setMonthlyCapAmount(centsToDisplay(pay?.scope.limitPerPeriodMinor as number | undefined));
      })
      .catch((err) => {
        console.error(err);
        setError("Connection failed. Make sure the backend is reachable.");
      });
  }, [api]);

  const save = async () => {
    if (config === null) return;
    setBusy(true);
    try {
      const stepUpMinor = displayToCents(stepUpAmount);
      const monthlyCapMinor = displayToCents(monthlyCapAmount);

      const mandates = config.agent.mandates.map((m) => {
        if (m.capability !== "pay") return m;
        return {
          ...m,
          stepUpThresholdMinor: stepUpMinor,
          scope: {
            ...m.scope,
            limitPerPeriodMinor: monthlyCapMinor ?? 0,
          },
        };
      });

      const updated: AppConfig = {
        ...config,
        agent: { ...config.agent, displayName: agentName, mandates },
      };
      const r = await api.saveConfig(updated);
      if (r.ok) { setSaved(true); onSaved(); }
    } finally {
      setBusy(false);
    }
  };

  if (error !== null) {
    return (
      <div
        className="rounded-[var(--radius-md)] border px-4 py-3 text-sm"
        style={{ background: "var(--danger-dim)", borderColor: "var(--danger)", color: "var(--danger)" }}
      >
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  if (config === null) {
    return <p className="text-sm animate-pulse" style={{ color: "var(--muted)" }}>Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Agent name</FieldLabel>
        <input
          className={inputCls}
          style={{ borderColor: "var(--line)", color: "var(--text)" }}
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="My AI Assistant"
        />
      </div>

      <div
        className="rounded-[var(--radius-md)] border px-4 py-4 flex flex-col gap-4"
        style={{ borderColor: "var(--line)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Payment limits</p>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Ask me before any payment over</FieldLabel>
          <div className="relative max-w-48">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--muted)" }}
            >$</span>
            <input
              className={inputCls}
              style={{ borderColor: "var(--line)", color: "var(--text)", paddingLeft: "1.5rem" }}
              inputMode="decimal"
              value={stepUpAmount}
              onChange={(e) => setStepUpAmount(e.target.value)}
              placeholder="e.g. 20"
            />
          </div>
          <p className="text-xs" style={{ color: "var(--subtle)" }}>
            Leave blank to always approve, or enter 0.01 to ask every time.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Monthly payment cap</FieldLabel>
          <div className="relative max-w-48">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--muted)" }}
            >$</span>
            <input
              className={inputCls}
              style={{ borderColor: "var(--line)", color: "var(--text)", paddingLeft: "1.5rem" }}
              inputMode="decimal"
              value={monthlyCapAmount}
              onChange={(e) => setMonthlyCapAmount(e.target.value)}
              placeholder="e.g. 100"
            />
          </div>
          <p className="text-xs" style={{ color: "var(--subtle)" }}>
            The agent cannot spend more than this total per month.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={busy}
          onClick={() => void save()}
          className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          Save and continue
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--ok)" }}>
            <Check className="h-4 w-4" aria-hidden /> Saved
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Step 2 — Providers ──────────────────────────────────────────────────────

const ProvidersStep = ({ api }: { api: ApprovalApi }) => (
  <ProvidersScreen api={api} compact />
);

// ─── Step 3 — Connect your agent ─────────────────────────────────────────────

const buildTokenSnippet = (token: string): string =>
  JSON.stringify(
    {
      mcpServers: {
        agentgrid: {
          command: "agent-grid-mcp",
          env: { AGENTGRID_TOKEN: token },
        },
      },
    },
    null,
    2,
  );

const ConnectStep = ({
  api,
  agents,
  onConnected,
}: {
  api: ApprovalApi;
  agents: readonly AgentSummary[];
  onConnected: () => void;
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);

  const connected = agents.length > 0;

  useEffect(() => {
    api
      .issueAgentToken()
      .then((r) => setToken(r.token))
      .catch((err) => {
        console.error(err);
        setTokenError("Could not create a connection token.");
      });
  }, [api]);

  // Auto-advance when agent connects
  useEffect(() => {
    if (connected) onConnected();
  }, [connected, onConnected]);

  const snippet = token !== null ? buildTokenSnippet(token) : "";

  const copySnippet = () => {
    void navigator.clipboard.writeText(snippet);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 1500);
  };

  if (connected) {
    return (
      <div
        className="rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-2 text-sm"
        style={{ background: "var(--ok-dim)", color: "var(--ok)" }}
      >
        <Check className="h-4 w-4" aria-hidden />
        <span className="font-semibold">Agent connected!</span>
        <span className="opacity-80">Advancing…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Run these two commands in your terminal. The login command will open this browser and connect your agent automatically.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Step 1 — Install</FieldLabel>
          <CodeBlock code="npm install -g agent-grid-mcp" />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Step 2 — Authenticate</FieldLabel>
          <CodeBlock code="agent-grid-mcp login" />
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}>
        <span
          className="relative flex h-2 w-2 shrink-0"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--warn)" }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--warn)" }} />
        </span>
        <span className="text-sm">Waiting for your agent to connect…</span>
      </div>

      {/* Manual token fallback — for AI clients that can't do browser OAuth */}
      <div className="border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <button
          onClick={() => setShowFallback((v) => !v)}
          className="flex items-center gap-1.5 text-xs cursor-pointer"
          style={{ color: "var(--subtle)" }}
        >
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform"
            style={{ transform: showFallback ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden
          />
          Using an AI client that can't do browser OAuth? Paste a token instead.
        </button>

        {showFallback && (
          <div className="mt-3 flex flex-col gap-2">
            {tokenError !== null ? (
              <p className="text-xs" style={{ color: "var(--danger)" }}>{tokenError}</p>
            ) : token === null ? (
              <p className="text-xs animate-pulse" style={{ color: "var(--muted)" }}>Minting token…</p>
            ) : (
              <>
                <p className="text-xs" style={{ color: "var(--subtle)" }}>
                  Paste this into your AI client's MCP config and restart it. Keep the token private.
                </p>
                <div className="flex items-start gap-2">
                  <pre
                    className="mono flex-1 overflow-x-auto rounded-[var(--radius-md)] p-3 text-xs"
                    style={{ background: "var(--surface-2)", color: "var(--text)" }}
                  >
                    {snippet}
                  </pre>
                  <button
                    onClick={copySnippet}
                    className="shrink-0 flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-xs cursor-pointer"
                    style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                  >
                    {snippetCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {snippetCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Step 4 — Done ────────────────────────────────────────────────────────────

const DoneStep = ({ agentName, onFinish }: { agentName: string; onFinish: () => void }) => (
  <div className="flex flex-col items-center gap-4 py-6 text-center">
    <span
      className="grid h-16 w-16 place-items-center rounded-full"
      style={{ background: "var(--ok-dim)" }}
    >
      <ShieldCheck className="h-8 w-8" style={{ color: "var(--ok)" }} strokeWidth={1.5} aria-hidden />
    </span>
    <div>
      <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
        {agentName || "Your agent"} is connected
      </h3>
      <p className="mt-1 text-sm max-w-xs" style={{ color: "var(--muted)" }}>
        Approval requests will appear in your inbox whenever the agent needs to step up. You're in control.
      </p>
    </div>
    <button
      onClick={onFinish}
      className="mt-2 rounded-[var(--radius-md)] px-5 py-2.5 text-sm font-semibold cursor-pointer"
      style={{ background: "var(--text)", color: "var(--bg)" }}
    >
      Go to dashboard
    </button>
  </div>
);

// ─── OnboardingFlow shell ─────────────────────────────────────────────────────

export interface OnboardingFlowProps {
  readonly api: ApprovalApi;
  readonly agents: readonly AgentSummary[];
  readonly onDone: () => void;
}

export const OnboardingFlow = ({ api, agents, onDone }: OnboardingFlowProps) => {
  const [step, setStep] = useState<StepId>("limits");
  const [limitsSaved, setLimitsSaved] = useState(false);
  const [agentName, setAgentName] = useState("");

  const currentIdx = STEPS.findIndex((s) => s.id === step);
  const isLast = currentIdx === STEPS.length - 1;

  const goNext = useCallback(() => {
    if (isLast) { onDone(); return; }
    setStep(STEPS[currentIdx + 1]!.id);
  }, [isLast, currentIdx, onDone]);

  // Capture agent name after it's saved so DoneStep can show it
  useEffect(() => {
    if (agents.length > 0 && agentName === "") {
      setAgentName(agents[0]!.displayName);
    }
  }, [agents, agentName]);

  const canAdvance = step !== "limits" || limitsSaved;
  const isOptional = "optional" in (STEPS[currentIdx] ?? {}) && (STEPS[currentIdx] as { optional?: boolean }).optional === true;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl"
          style={{ background: "var(--surface-2)" }}
        >
          <ShieldCheck className="h-7 w-7" style={{ color: "var(--text)" }} strokeWidth={1.5} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Set up Agent Grid
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Step {currentIdx + 1} of {STEPS.length} — {STEPS[currentIdx]?.label}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className="h-1 flex-1 rounded-full"
            style={{
              background:
                i < currentIdx
                  ? "var(--ok)"
                  : i === currentIdx
                    ? "var(--text)"
                    : "var(--line)",
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div
        className="rounded-[var(--radius-xl)] border px-6 py-6"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text)" }}>
          {STEPS[currentIdx]?.label}
          {isOptional && (
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--subtle)" }}>
              (optional)
            </span>
          )}
        </h2>

        {step === "limits" && (
          <LimitsStep
            api={api}
            onSaved={() => {
              setLimitsSaved(true);
              // capture name for DoneStep
              api.getConfig().then((l) => setAgentName(l.config.agent.displayName)).catch(() => {});
            }}
          />
        )}
        {step === "providers" && <ProvidersStep api={api} />}
        {step === "connect" && (
          <ConnectStep api={api} agents={agents} onConnected={goNext} />
        )}
        {step === "done" && <DoneStep agentName={agentName} onFinish={onDone} />}
      </div>

      {/* Footer nav — hide on done step */}
      {step !== "done" && (
        <div className="mt-4 flex items-center justify-between">
          {isOptional ? (
            <button
              onClick={goNext}
              className="text-sm cursor-pointer hover:opacity-80"
              style={{ color: "var(--muted)" }}
            >
              Skip for now
            </button>
          ) : (
            <span />
          )}

          {step !== "connect" && (
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-40"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
