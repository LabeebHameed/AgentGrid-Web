import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Settings2, Plug, Check, AlertTriangle, Copy } from "lucide-react";
import type { ApprovalApi } from "../api";
import type { AppConfig, ConnectSnippet, LicenseStatus, MandateConfig } from "../types";

/** Read a numeric scope field with a fallback. */
const num = (scope: Record<string, unknown>, key: string): number =>
  typeof scope[key] === "number" ? (scope[key] as number) : 0;

const SectionTitle = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="mb-4 flex items-start gap-3">
    <span className="mt-0.5 text-[var(--muted)]">{icon}</span>
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">{title}</h2>
      <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
    </div>
  </div>
);

const Card = ({ children, accent }: { children: React.ReactNode; accent?: string }) => (
  <div
    className="rounded-[var(--radius-lg)] border px-4 py-4"
    style={{ borderColor: accent ?? "var(--line)" }}
  >
    {children}
  </div>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle)]">{children}</span>
);

const input =
  "w-full rounded-[var(--radius-md)] border bg-transparent px-2.5 py-2 text-sm text-[var(--text)] outline-none";

// ─── License section ──────────────────────────────────────────────────────────

const LicenseSection = ({ api }: { api: ApprovalApi }) => {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => setStatus(await api.getLicense()), [api]);
  useEffect(() => { void refresh(); }, [refresh]);

  const activate = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.activateLicense({ key });
      setMsg(r.ok ? "Activated." : `Could not activate: ${r.reason ?? "unknown error"}`);
      if (r.ok) setKey("");
      await refresh();
    } finally { setBusy(false); }
  };
  const deactivate = async () => {
    setBusy(true); setMsg(null);
    try { await api.deactivateLicense(); await refresh(); } finally { setBusy(false); }
  };

  if (status === null) return null;
  const disabled = status.mode === "disabled";

  return (
    <Card accent={disabled ? "var(--warn)" : status.operable ? "var(--ok)" : "var(--danger)"}>
      <SectionTitle
        icon={<KeyRound className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
        title="License"
        subtitle={disabled ? "Enforcement is OFF — the agent runs without a license while you test." : "Your Agent Grid license."}
      />
      {disabled ? (
        <p className="rounded-[var(--radius-md)] px-3 py-2 text-sm" style={{ background: "var(--warn-dim)", color: "var(--warn)" }}>
          Testing mode: license checks are deactivated. Everything is fully operable. Activation will take effect once enforcement is switched on.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><Label>Status</Label><p style={{ color: status.operable ? "var(--ok)" : "var(--danger)" }}>{status.operable ? "Active" : status.reason}</p></div>
          <div><Label>Plan</Label><p className="text-[var(--text)]">{status.plan ?? "—"}</p></div>
          {status.expiresAt !== null && <div><Label>Expires</Label><p className="text-[var(--text)]">{new Date(status.expiresAt).toLocaleDateString()}</p></div>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input className={input} style={{ borderColor: "var(--line)", maxWidth: 280 }} placeholder="paste your license key" value={key} onChange={(e) => setKey(e.target.value)} />
        <button disabled={busy || key.trim() === ""} onClick={() => void activate()} className="rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50" style={{ background: "var(--text)", color: "var(--bg)" }}>Activate</button>
        <button disabled={busy} onClick={() => void deactivate()} className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium cursor-pointer disabled:opacity-50" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>Deactivate</button>
      </div>
      {msg !== null && <p className="mt-2 text-xs text-[var(--muted)]">{msg}</p>}
    </Card>
  );
};

// ─── Agent config section ─────────────────────────────────────────────────────

const MandateEditor = ({
  mandate,
  onChange,
}: {
  mandate: MandateConfig;
  onChange: (next: MandateConfig) => void;
}) => {
  const setScope = (patch: Record<string, unknown>) =>
    onChange({ ...mandate, scope: { ...mandate.scope, ...patch } });
  const isPay = mandate.scope.capability === "pay";
  const isBrowse = mandate.scope.capability === "browse";
  return (
    <div className="rounded-[var(--radius-md)] border px-3.5 py-3" style={{ borderColor: "var(--line)" }}>
      <p className="mb-2 text-sm font-semibold capitalize text-[var(--text)]">{mandate.capability}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Step-up ≥ (minor units, blank = never)</Label>
          <input
            className={input}
            style={{ borderColor: "var(--line)" }}
            inputMode="numeric"
            value={mandate.stepUpThresholdMinor ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              onChange({ ...mandate, stepUpThresholdMinor: v === "" ? null : Number.parseInt(v, 10) });
            }}
          />
        </div>
        {isPay && (
          <>
            <div className="flex flex-col gap-1">
              <Label>Per-transaction cap (minor)</Label>
              <input className={input} style={{ borderColor: "var(--line)" }} inputMode="numeric" value={num(mandate.scope, "limitPerTransactionMinor")} onChange={(e) => setScope({ limitPerTransactionMinor: Number.parseInt(e.target.value || "0", 10) })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Per-period cap (minor)</Label>
              <input className={input} style={{ borderColor: "var(--line)" }} inputMode="numeric" value={num(mandate.scope, "limitPerPeriodMinor")} onChange={(e) => setScope({ limitPerPeriodMinor: Number.parseInt(e.target.value || "0", 10) })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Period (days)</Label>
              <input className={input} style={{ borderColor: "var(--line)" }} inputMode="numeric" value={num(mandate.scope, "periodDays")} onChange={(e) => setScope({ periodDays: Number.parseInt(e.target.value || "0", 10) })} />
            </div>
          </>
        )}
        {isBrowse && (
          <div className="col-span-2 flex flex-col gap-1">
            <Label>Allowed domains (comma-separated, * = any)</Label>
            <input
              className={input}
              style={{ borderColor: "var(--line)" }}
              value={(Array.isArray(mandate.scope["allowedDomains"]) ? (mandate.scope["allowedDomains"] as string[]) : []).join(", ")}
              onChange={(e) => setScope({ allowedDomains: e.target.value.split(",").map((s) => s.trim()).filter((s) => s !== "") })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const AgentConfigSection = ({ api }: { api: ApprovalApi }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; errors?: readonly string[]; restartRequired?: boolean } | null>(null);

  useEffect(() => { void api.getConfig().then((l) => setConfig(l.config)); }, [api]);

  const save = async () => {
    if (config === null) return;
    setBusy(true); setResult(null);
    try { setResult(await api.saveConfig(config)); } finally { setBusy(false); }
  };

  if (config === null) return null;
  return (
    <Card>
      <SectionTitle
        icon={<Settings2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
        title="Agent configuration"
        subtitle="Your agent's name and what it's allowed to do — no code editing."
      />
      <div className="mb-4 flex flex-col gap-1">
        <Label>Agent name</Label>
        <input className={input} style={{ borderColor: "var(--line)", maxWidth: 320 }} value={config.agent.displayName} onChange={(e) => setConfig({ ...config, agent: { ...config.agent, displayName: e.target.value } })} />
      </div>
      <div className="flex flex-col gap-3">
        {config.agent.mandates.map((m, i) => (
          <MandateEditor
            key={m.capability}
            mandate={m}
            onChange={(next) => setConfig({ ...config, agent: { ...config.agent, mandates: config.agent.mandates.map((x, j) => (j === i ? next : x)) } })}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button disabled={busy} onClick={() => void save()} className="rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50" style={{ background: "var(--text)", color: "var(--bg)" }}>Save configuration</button>
        {result?.ok === true && (
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--ok)" }}>
            <Check className="h-4 w-4" aria-hidden /> Saved{result.restartRequired ? " — restart Agent Grid to apply" : ""}
          </span>
        )}
        {result?.ok === false && (
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--danger)" }}>
            <AlertTriangle className="h-4 w-4" aria-hidden /> {(result.errors ?? []).join("; ")}
          </span>
        )}
      </div>
    </Card>
  );
};

// ─── Connect section ──────────────────────────────────────────────────────────

const ConnectSection = ({ api }: { api: ApprovalApi }) => {
  const [snippet, setSnippet] = useState<ConnectSnippet | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { void api.getConnect().then(setSnippet); }, [api]);
  const text = useMemo(() => (snippet === null ? "" : JSON.stringify(snippet.snippet, null, 2)), [snippet]);
  return (
    <Card>
      <SectionTitle
        icon={<Plug className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
        title="Connect your AI"
        subtitle="Paste this into your AI client's MCP config (Claude Desktop, Cursor, …)."
      />
      <pre className="mono overflow-x-auto rounded-[var(--radius-md)] p-3 text-xs text-[var(--text)]" style={{ background: "var(--surface-2)" }}>{text}</pre>
      <button
        onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium cursor-pointer"
        style={{ background: "var(--surface-2)", color: "var(--muted)" }}
      >
        <Copy className="h-4 w-4" aria-hidden /> {copied ? "Copied" : "Copy"}
      </button>
    </Card>
  );
};

export const Settings = ({ api }: { api: ApprovalApi }) => (
  <div>
    <h1 className="mb-1 text-xl font-semibold tracking-tight text-[var(--text)]">Settings</h1>
    <p className="mb-6 text-sm text-[var(--muted)]">License, agent configuration, and how to connect your AI.</p>
    <div className="flex flex-col gap-5">
      <LicenseSection api={api} />
      <AgentConfigSection api={api} />
      <ConnectSection api={api} />
    </div>
  </div>
);
