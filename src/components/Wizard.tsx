/**
 * First-run setup wizard (task 4.7).
 *
 * A multi-step overlay that guides a new user from zero → connected:
 *   Step 1 → License (activate or skip)
 *   Step 2 → Agent config (name + mandates)
 *   Step 3 → Providers (review which are connected)
 *   Step 4 → Devices (link phone — optional)
 *   Step 5 → Connect your AI (copy MCP snippet)
 *
 * The wizard is shown when `?wizard=1` is in the URL (set by the CLI launcher
 * on first run) or when `localStorage.aegis_wizard_done` is not set.
 * Completing or skipping sets the flag and calls `onDone()`.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Check, ChevronRight, X, KeyRound, Settings2, Plug, Smartphone, Link2 } from "lucide-react";
import type { ApprovalApi } from "../api";
import type { AppConfig, ConnectSnippet, LicenseStatus } from "../types";
import { ProvidersScreen } from "./Providers";
import { DevicesScreen } from "./Devices";

const WIZARD_DONE_KEY = "aegis_wizard_done";

const STEPS = [
  { id: "license", label: "License", icon: <KeyRound className="h-4 w-4" strokeWidth={1.75} aria-hidden />, optional: true },
  { id: "config", label: "Agent setup", icon: <Settings2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />, optional: false },
  { id: "providers", label: "Providers", icon: <Plug className="h-4 w-4" strokeWidth={1.75} aria-hidden />, optional: true },
  { id: "devices", label: "Link phone", icon: <Smartphone className="h-4 w-4" strokeWidth={1.75} aria-hidden />, optional: true },
  { id: "connect", label: "Connect AI", icon: <Link2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />, optional: false },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ─── Step components ─────────────────────────────────────────────────────────

const num = (scope: Record<string, unknown>, key: string): number =>
  typeof scope[key] === "number" ? (scope[key] as number) : 0;

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle)]">{children}</span>
);

const inputClass =
  "w-full rounded-[var(--radius-md)] border bg-transparent px-2.5 py-2 text-sm text-[var(--text)] outline-none";

const LicenseStep = ({ api }: { api: ApprovalApi }) => {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { void api.getLicense().then(setStatus); }, [api]);

  const activate = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.activateLicense({ key });
      setMsg(r.ok ? "✓ Activated!" : `Could not activate: ${r.reason ?? "unknown"}`);
      if (r.ok) { setKey(""); void api.getLicense().then(setStatus); }
    } finally { setBusy(false); }
  };

  if (status === null) return null;
  const disabled = status.mode === "disabled";

  return (
    <div className="flex flex-col gap-4">
      {disabled ? (
        <div className="rounded-[var(--radius-md)] px-4 py-3 text-sm" style={{ background: "var(--warn-dim)", color: "var(--warn)" }}>
          <p className="font-semibold">Testing mode: enforcement is OFF</p>
          <p className="mt-1 text-xs opacity-80">
            The agent runs fully without a license right now. You can activate a key later in Settings → License.
          </p>
        </div>
      ) : status.operable ? (
        <div className="rounded-[var(--radius-md)] px-4 py-3 text-sm" style={{ background: "var(--ok-dim)", color: "var(--ok)" }}>
          <p className="font-semibold">Licensed — {status.plan ?? "active"}</p>
          {status.expiresAt !== null && <p className="mt-0.5 text-xs">Expires {new Date(status.expiresAt).toLocaleDateString()}</p>}
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] px-4 py-3 text-sm" style={{ background: "var(--danger-dim)", color: "var(--danger)" }}>
          <p className="font-semibold">Not licensed — {status.reason}</p>
          <p className="mt-0.5 text-xs">Activate a key below to enable the agent.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={inputClass}
          style={{ borderColor: "var(--line)", maxWidth: 280 }}
          placeholder="paste your license key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button
          disabled={busy || key.trim() === ""}
          onClick={() => void activate()}
          className="rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          Activate
        </button>
      </div>
      {msg !== null && <p className="text-xs text-[var(--muted)]">{msg}</p>}
      <p className="text-xs text-[var(--subtle)]">
        Don't have a key? You can skip this — the agent runs without a license while enforcement is off.
      </p>
    </div>
  );
};

const ConfigStep = ({ api, onSaved }: { api: ApprovalApi; onSaved: () => void }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { void api.getConfig().then((l) => setConfig(l.config)); }, [api]);

  const save = async () => {
    if (config === null) return;
    setBusy(true);
    try {
      const r = await api.saveConfig(config);
      if (r.ok) { setSaved(true); onSaved(); }
    } finally { setBusy(false); }
  };

  if (config === null) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label>Agent name</Label>
        <input
          className={inputClass}
          style={{ borderColor: "var(--line)", maxWidth: 320 }}
          value={config.agent.displayName}
          onChange={(e) => setConfig({ ...config, agent: { ...config.agent, displayName: e.target.value } })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Capability limits</Label>
        {config.agent.mandates.map((m, i) => {
          const isPay = m.scope.capability === "pay";
          return (
            <div key={m.capability} className="rounded-[var(--radius-md)] border px-3 py-3" style={{ borderColor: "var(--line)" }}>
              <p className="mb-2 text-sm font-semibold capitalize text-[var(--text)]">{m.capability}</p>
              <div className="grid grid-cols-2 gap-2">
                {isPay && (
                  <>
                    <div className="flex flex-col gap-1">
                      <Label>Per-transaction cap (minor)</Label>
                      <input
                        className={inputClass} style={{ borderColor: "var(--line)" }} inputMode="numeric"
                        value={num(m.scope, "limitPerTransactionMinor")}
                        onChange={(e) => {
                          const next = config.agent.mandates.map((x, j) =>
                            j === i ? { ...x, scope: { ...x.scope, limitPerTransactionMinor: Number.parseInt(e.target.value || "0", 10) } } : x
                          );
                          setConfig({ ...config, agent: { ...config.agent, mandates: next } });
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Per-period cap (minor)</Label>
                      <input
                        className={inputClass} style={{ borderColor: "var(--line)" }} inputMode="numeric"
                        value={num(m.scope, "limitPerPeriodMinor")}
                        onChange={(e) => {
                          const next = config.agent.mandates.map((x, j) =>
                            j === i ? { ...x, scope: { ...x.scope, limitPerPeriodMinor: Number.parseInt(e.target.value || "0", 10) } } : x
                          );
                          setConfig({ ...config, agent: { ...config.agent, mandates: next } });
                        }}
                      />
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-1">
                  <Label>Step-up ≥ (minor, blank = never)</Label>
                  <input
                    className={inputClass} style={{ borderColor: "var(--line)" }} inputMode="numeric"
                    value={m.stepUpThresholdMinor ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      const next = config.agent.mandates.map((x, j) =>
                        j === i ? { ...x, stepUpThresholdMinor: v === "" ? null : Number.parseInt(v, 10) } : x
                      );
                      setConfig({ ...config, agent: { ...config.agent, mandates: next } });
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={busy}
          onClick={() => void save()}
          className="rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          Save configuration
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

const ConnectStep = ({ api }: { api: ApprovalApi }) => {
  const [snippet, setSnippet] = useState<ConnectSnippet | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { void api.getConnect().then(setSnippet); }, [api]);
  const text = useMemo(() => snippet === null ? "" : JSON.stringify(snippet.snippet, null, 2), [snippet]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--muted)]">
        Paste this JSON block into your AI client's MCP settings (Claude Desktop, Cursor, etc.) and restart it.
        Aegis will then show up as a tool set your AI can use.
      </p>
      <pre
        className="mono overflow-x-auto rounded-[var(--radius-md)] p-3 text-xs text-[var(--text)]"
        style={{ background: "var(--surface-2)" }}
      >
        {text}
      </pre>
      <button
        onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="self-start inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium cursor-pointer"
        style={{ background: "var(--surface-2)", color: "var(--muted)" }}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {copied ? "Copied!" : "Copy snippet"}
      </button>
      <div className="rounded-[var(--radius-md)] px-4 py-3 text-sm" style={{ background: "var(--ok-dim)", color: "var(--ok)" }}>
        <p className="font-semibold">You're all set! 🎉</p>
        <p className="mt-0.5 text-xs opacity-80">
          Keep Aegis running in the background. Your AI now has governed access to the capabilities you enabled.
        </p>
      </div>
    </div>
  );
};

// ─── Wizard shell ─────────────────────────────────────────────────────────────

export const useWizardVisible = (): [boolean, () => void] => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has("wizard")) return true;
    return localStorage.getItem(WIZARD_DONE_KEY) === null;
  });

  const dismiss = useCallback(() => {
    localStorage.setItem(WIZARD_DONE_KEY, "1");
    // Remove ?wizard from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("wizard");
    window.history.replaceState({}, "", url.toString());
    setVisible(false);
  }, []);

  return [visible, dismiss];
};

export const SetupWizard = ({ api, onDone }: { api: ApprovalApi; onDone: () => void }) => {
  const [step, setStep] = useState<StepId>("license");
  const [configSaved, setConfigSaved] = useState(false);

  const currentIdx = STEPS.findIndex((s) => s.id === step);
  const isLast = currentIdx === STEPS.length - 1;

  const next = () => {
    if (isLast) { onDone(); return; }
    setStep(STEPS[currentIdx + 1]!.id);
  };
  const skip = () => next();

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Aegis setup wizard"
    >
      <div
        className="relative flex w-full max-w-lg flex-col rounded-[var(--radius-xl)] border shadow-xl"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        {/* Close */}
        <button
          onClick={onDone}
          className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-[var(--radius-md)] cursor-pointer"
          style={{ color: "var(--muted)" }}
          aria-label="Skip wizard"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--subtle)]">
            Setup wizard · step {currentIdx + 1} of {STEPS.length}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
            {STEPS[currentIdx]?.label}
          </h2>

          {/* Progress steps */}
          <div className="mt-4 flex gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className="flex-1 rounded-full cursor-pointer"
                style={{
                  height: 4,
                  background: i < currentIdx
                    ? "var(--ok)"
                    : i === currentIdx
                      ? "var(--text)"
                      : "var(--line)",
                }}
                aria-label={`Go to step: ${s.label}`}
              />
            ))}
          </div>
        </div>

        {/* Step nav pills */}
        <div className="flex gap-2 overflow-x-auto px-6 pb-3">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-medium cursor-pointer"
              style={{
                background: s.id === step ? "var(--surface-2)" : "transparent",
                color: i <= currentIdx ? "var(--text)" : "var(--subtle)",
              }}
            >
              {i < currentIdx ? <Check className="h-3 w-3" style={{ color: "var(--ok)" }} aria-hidden /> : s.icon}
              {s.label}
              {s.optional && <span className="opacity-60">(optional)</span>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2" style={{ maxHeight: "50vh" }}>
          {step === "license" && <LicenseStep api={api} />}
          {step === "config" && <ConfigStep api={api} onSaved={() => setConfigSaved(true)} />}
          {step === "providers" && <ProvidersScreen api={api} compact />}
          {step === "devices" && <DevicesScreen api={api} compact />}
          {step === "connect" && <ConnectStep api={api} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: "var(--line)" }}>
          {STEPS[currentIdx]?.optional ? (
            <button
              onClick={skip}
              className="text-sm text-[var(--muted)] cursor-pointer hover:text-[var(--text)]"
            >
              Skip this step
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={next}
            disabled={step === "config" && !configSaved}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && <ChevronRight className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
};
