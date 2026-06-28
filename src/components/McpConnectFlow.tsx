import { useState } from "react";
import {
  Shield,
  Check,
  Copy,
  User,
  ArrowRight,
  Zap,
  ChevronRight,
  Bot,
} from "lucide-react";
import type { ApprovalApi, MandateSpecInput } from "../api";
import type { AgentSummary } from "../types";
import { shortDid } from "../lib/format";

interface MandateForm {
  capability: string;
  enabled: boolean;
  stepUpThresholdMinor: number;
  scope: {
    limitPerTransactionMinor?: number;
    allowedRegions?: string[];
    allowedDomains?: string[];
  };
}

/**
 * Translate the simplified mandate checklist into full `MandateSpecInput`s the
 * relay enrolls with. Each capability's scope is filled out to a valid
 * `MandateScope` (mirroring the server's defaults) so the operator only ever
 * toggles + sets thresholds/limits in the UI.
 */
const buildMandateSpecs = (forms: readonly MandateForm[]): MandateSpecInput[] =>
  forms
    .filter((m) => m.enabled)
    .map((m): MandateSpecInput => {
      const stepUp = m.stepUpThresholdMinor;
      switch (m.capability) {
        case "pay":
          return {
            capability: "pay",
            stepUpThresholdMinor: stepUp,
            scope: {
              capability: "pay",
              currency: "USD",
              limitPerTransactionMinor: m.scope.limitPerTransactionMinor ?? 2000,
              limitPerPeriodMinor: m.scope.limitPerTransactionMinor ?? 2000,
              periodDays: 30,
              allowedCategories: ["saas", "compute", "data"],
              allowedMerchants: ["*"],
              deniedMerchants: [],
            },
          };
        case "browse":
          return {
            capability: "browse",
            stepUpThresholdMinor: stepUp,
            scope: {
              capability: "browse",
              allowedDomains: (m.scope.allowedDomains?.length ?? 0) > 0 ? m.scope.allowedDomains : ["*"],
              deniedDomains: [],
              maxSessionMinutes: 60,
            },
          };
        case "comms":
          return {
            capability: "comms",
            stepUpThresholdMinor: stepUp,
            scope: {
              capability: "comms",
              maySendEmail: true,
              maySendSms: true,
              allowedRecipientDomains: ["*"],
            },
          };
        case "deploy":
          return {
            capability: "deploy",
            stepUpThresholdMinor: stepUp,
            scope: {
              capability: "deploy",
              providers: ["agentgrid-cloud"],
              monthlyBudgetMinor: 10000,
              allowedRegions: (m.scope.allowedRegions?.length ?? 0) > 0 ? m.scope.allowedRegions : ["iad1", "sfo1"],
              mayPurchaseDomains: false,
            },
          };
        default:
          return {
            capability: m.capability as MandateSpecInput["capability"],
            stepUpThresholdMinor: stepUp,
            scope: { capability: m.capability },
          };
      }
    });

interface McpConnectFlowProps {
  readonly api: ApprovalApi;
  readonly agents: readonly AgentSummary[];
  /** The full callbackUrl from ?callbackUrl= query param */
  readonly callbackUrl: string;
}

// ─── Step A: Choose mode ─────────────────────────────────────────────────────

function ModeSelect({
  agents,
  onCreateNew,
  onUseExisting,
}: {
  agents: readonly AgentSummary[];
  onCreateNew: () => void;
  onUseExisting: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onCreateNew}
        className="group w-full rounded-[var(--radius-md)] border p-5 text-left transition-all duration-200 hover:border-indigo-500/50 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_4px_20px_rgba(99,102,241,0.08)] cursor-pointer"
        style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md">
              <Bot className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">Create a new agent</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Name it, configure mandates, connect locally
              </p>
            </div>
          </div>
          <ChevronRight
            className="h-4 w-4 text-[var(--muted)] transition-transform duration-200 group-hover:translate-x-1"
            strokeWidth={2}
          />
        </div>
      </button>

      {agents.length > 0 && (
        <button
          type="button"
          onClick={onUseExisting}
          className="group w-full rounded-[var(--radius-md)] border p-5 text-left transition-all duration-200 hover:border-emerald-500/50 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_20px_rgba(16,185,129,0.08)] cursor-pointer"
          style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md">
                <Zap className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text)]">Use an existing agent</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {agents.length} agent{agents.length !== 1 ? "s" : ""} already registered
                </p>
              </div>
            </div>
            <ChevronRight
              className="h-4 w-4 text-[var(--muted)] transition-transform duration-200 group-hover:translate-x-1"
              strokeWidth={2}
            />
          </div>
        </button>
      )}
    </div>
  );
}

// ─── Step B: Pick existing agent ─────────────────────────────────────────────

function ExistingAgentPicker({
  agents,
  onSelect,
  onBack,
  callbackUrl,
}: {
  agents: readonly AgentSummary[];
  onSelect: (agent: AgentSummary) => void;
  onBack: () => void;
  callbackUrl: string;
}) {
  const [picked, setPicked] = useState<string>(agents[0]?.did ?? "");
  const [loading, setLoading] = useState(false);

  const fire = async () => {
    const agent = agents.find((a) => a.did === picked);
    if (!agent) return;
    setLoading(true);
    // Build the callback URL with agentId + agentName params
    const url = new URL(callbackUrl);
    url.searchParams.set("agentId", agent.did);
    url.searchParams.set("agentName", agent.displayName);
    // Give the browser a tick to show the loading state before navigating
    await new Promise((r) => setTimeout(r, 80));
    onSelect(agent);
    window.location.href = url.toString();
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-[var(--radius-sm)] border px-4 py-3 text-xs text-[var(--muted)] leading-relaxed"
        style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
      >
        <strong className="text-[var(--text)]">Heads up:</strong> if you originally enrolled this agent with
        a recovery passphrase, your terminal will prompt for it after you click Connect. It can&apos;t recover
        the key on this device without the passphrase you set at enrollment time.
      </div>
      <div
        className="rounded-[var(--radius-md)] border p-5"
        style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
      >
        <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
          Select Agent
        </label>
        <div className="space-y-2">
          {agents.map((agent) => (
            <label
              key={agent.did}
              className={`flex items-center gap-3 rounded-[var(--radius-sm)] border p-3 cursor-pointer transition-all duration-150 ${
                picked === agent.did
                  ? "border-indigo-500/40 bg-indigo-500/5"
                  : "border-transparent hover:border-[var(--line)]"
              }`}
            >
              <input
                type="radio"
                name="agent-pick"
                value={agent.did}
                checked={picked === agent.did}
                onChange={() => setPicked(agent.did)}
                className="accent-indigo-500"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text)] truncate">
                  {agent.displayName}
                </p>
                <p className="text-[11px] font-mono text-[var(--muted)]">
                  {shortDid(agent.did)}
                </p>
              </div>
              {agent.status.frozen && (
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                  FROZEN
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void fire()}
        disabled={!picked || loading}
        className="w-full rounded-[var(--radius-md)] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
      >
        {loading ? "Connecting…" : "Connect this agent"}
        <ArrowRight className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors py-1 cursor-pointer"
      >
        ← Back
      </button>
    </div>
  );
}

// ─── Step C: Create new agent form ───────────────────────────────────────────

function CreateAgentForm({
  api,
  onBack,
  callbackUrl,
}: {
  api: ApprovalApi;
  onBack: () => void;
  callbackUrl: string;
}) {
  const [name, setName] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [passphraseConfirm, setPassphraseConfirm] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultToken, setResultToken] = useState("");

  const [mandates, setMandates] = useState<MandateForm[]>([
    {
      capability: "pay",
      enabled: true,
      stepUpThresholdMinor: 1000,
      scope: { limitPerTransactionMinor: 5000 },
    },
    {
      capability: "browse",
      enabled: true,
      stepUpThresholdMinor: 0,
      scope: { allowedDomains: ["polar.sh", "github.com"] },
    },
    {
      capability: "comms",
      enabled: false,
      stepUpThresholdMinor: 0,
      scope: {},
    },
    {
      capability: "deploy",
      enabled: false,
      stepUpThresholdMinor: 0,
      scope: { allowedRegions: ["iad1", "sfo1"] },
    },
  ]);

  const trimmed = name.trim();
  // Passphrase is optional — but if the operator starts typing one, both
  // fields must agree. Empty passphrase falls back to the MCP's local prompt.
  const passphraseTouched = passphrase.length > 0 || passphraseConfirm.length > 0;
  const passphraseValid = !passphraseTouched || passphrase === passphraseConfirm;
  const valid = trimmed.length > 0 && passphraseValid;

  const toggleMandate = (index: number) => {
    setMandates((prev) =>
      prev.map((m, i) => (i === index ? { ...m, enabled: !m.enabled } : m)),
    );
  };

  const updateThreshold = (index: number, val: number) => {
    setMandates((prev) =>
      prev.map((m, i) => (i === index ? { ...m, stepUpThresholdMinor: val } : m)),
    );
  };

  const updateLimit = (index: number, val: number) => {
    setMandates((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, scope: { ...m.scope, limitPerTransactionMinor: val } } : m,
      ),
    );
  };

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const mandateSpecs = buildMandateSpecs(mandates);
      const result = await api.createAgent({ displayName: trimmed, mandateSpecs });
      setResultToken(result.token);
      setDone(true);

      // Fire the callback with the real token + agent name + the chosen mandate
      // specs (base64url JSON) so the local MCP enrolls under exactly these
      // mandates — not the relay's defaults.
      const url = new URL(callbackUrl);
      url.searchParams.set("token", result.token);
      url.searchParams.set("agentName", trimmed);
      if (mandateSpecs.length > 0) {
        url.searchParams.set(
          "mandates",
          btoa(JSON.stringify(mandateSpecs)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
        );
      }
      // Pass the recovery passphrase if the operator provided one. The MCP
      // uses it to encrypt the new agent's private key into a cloud backup
      // so a fresh device can later recover the key by re-typing it. Empty
      // passphrase → MCP prompts locally instead. Base64url so any bytes
      // (including unicode) survive the URL round-trip unchanged.
      if (passphrase.length > 0) {
        url.searchParams.set(
          "passphrase",
          btoa(unescape(encodeURIComponent(passphrase)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, ""),
        );
      }
      // Small delay so user sees the success state flash
      await new Promise((r) => setTimeout(r, 600));
      window.location.href = url.toString();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    void navigator.clipboard.writeText(resultToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (done) {
    return (
      <div className="rounded-[var(--radius-md)] border p-6 bg-emerald-500/5 border-emerald-500/20 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
            <Check className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
            Agent created — redirecting…
          </h2>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Agent <strong className="text-[var(--text)]">"{trimmed}"</strong> was registered.
          Your terminal will complete the connection automatically.
        </p>
        {resultToken && (
          <div className="mt-4 p-3 rounded-lg bg-black/40 border" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-[var(--muted)] uppercase">Connection token</span>
              <button
                type="button"
                onClick={copyToken}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                {copied ? <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy className="h-3 w-3" /><span>Copy</span></>}
              </button>
            </div>
            <pre className="text-[12px] text-indigo-300 font-mono overflow-x-auto select-all">
              {resultToken}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Name */}
      <div
        className="rounded-[var(--radius-md)] border p-5"
        style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-400">
            1
          </span>
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
            Identity Details
          </h2>
        </div>
        <label htmlFor="agent-name-mcp" className="block text-xs font-medium text-[var(--muted)] mb-2">
          Agent Display Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
          <input
            id="agent-name-mcp"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && valid) void submit(); }}
            placeholder="e.g. Research Bot"
            autoFocus
            className="w-full rounded-[var(--radius-sm)] border pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
          />
        </div>
      </div>

      {/* Mandates */}
      {/* Recovery passphrase (Step 2) */}
      <div
        className="rounded-[var(--radius-md)] border p-5"
        style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-400">
            2
          </span>
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
            Recovery passphrase <span className="text-[var(--muted)] normal-case font-normal">(optional)</span>
          </h2>
        </div>
        <p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
          Set a passphrase to encrypt this agent&apos;s private key for cross-device recovery. The cloud never sees
          it — encryption happens locally in your terminal — but you&apos;ll need to re-type it on any new device
          that binds to this agent. Leave blank to have your terminal prompt you instead.
        </p>
        <label htmlFor="agent-passphrase-mcp" className="block text-xs font-medium text-[var(--muted)] mb-2">
          Passphrase
        </label>
        <div className="relative">
          <input
            id="agent-passphrase-mcp"
            type={showPassphrase ? "text" : "password"}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="e.g. correct horse battery staple"
            autoComplete="new-password"
            className="w-full rounded-[var(--radius-sm)] border px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono"
            style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={() => setShowPassphrase((v) => !v)}
            className="absolute right-2 top-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
          >
            {showPassphrase ? "Hide" : "Show"}
          </button>
        </div>
        <label htmlFor="agent-passphrase-confirm-mcp" className="block text-xs font-medium text-[var(--muted)] mt-3 mb-2">
          Confirm passphrase
        </label>
        <div className="relative">
          <input
            id="agent-passphrase-confirm-mcp"
            type={showPassphrase ? "text" : "password"}
            value={passphraseConfirm}
            onChange={(e) => setPassphraseConfirm(e.target.value)}
            placeholder="re-type the same passphrase"
            autoComplete="new-password"
            className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono"
            style={{
              borderColor: passphraseValid ? "var(--line)" : "rgb(239 68 68)",
              background: "var(--surface-2)",
              color: "var(--text)",
            }}
          />
        </div>
        {passphraseTouched && !passphraseValid && (
          <p className="text-xs text-red-400 mt-2">Passphrases don&apos;t match.</p>
        )}
        {passphrase.length > 0 && (
          <p className="text-[10px] text-[var(--muted)] mt-2 leading-relaxed">
            Forgetting this passphrase is unrecoverable on a new device. Pick something memorable — or note it
            in your password manager.
          </p>
        )}
      </div>

      <div
        className="rounded-[var(--radius-md)] border p-5"
        style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-400">
            3
          </span>
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
            Mandates &amp; Thresholds
          </h2>
        </div>
        <div className="space-y-3">
          {mandates.map((m, idx) => (
            <div
              key={m.capability}
              className={`rounded-[var(--radius-sm)] border p-4 transition-all duration-200 ${
                m.enabled ? "bg-indigo-500/5 border-indigo-500/20" : ""
              }`}
              style={{ borderColor: m.enabled ? undefined : "var(--line)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`mcp-cb-${m.capability}`}
                    checked={m.enabled}
                    onChange={() => toggleMandate(idx)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  />
                  <label
                    htmlFor={`mcp-cb-${m.capability}`}
                    className="text-sm font-medium text-[var(--text)] capitalize cursor-pointer"
                  >
                    {m.capability}
                  </label>
                </div>
                <span className="text-[11px] text-[var(--muted)] font-mono uppercase px-2 py-0.5 rounded bg-black/20">
                  {m.capability === "pay" ? "Consequential" : "Standard"}
                </span>
              </div>
              {m.enabled && (
                <div className="mt-4 pt-4 border-t border-[var(--line)] grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                      Step-up Threshold (minor units)
                    </label>
                    <input
                      type="number"
                      value={m.stepUpThresholdMinor}
                      onChange={(e) => updateThreshold(idx, parseInt(e.target.value) || 0)}
                      className="w-full rounded border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                    />
                  </div>
                  {m.capability === "pay" && (
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                        Transaction Budget (minor units)
                      </label>
                      <input
                        type="number"
                        value={m.scope.limitPerTransactionMinor ?? 0}
                        onChange={(e) => updateLimit(idx, parseInt(e.target.value) || 0)}
                        className="w-full rounded border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-sm)] px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!valid || loading}
        className="w-full rounded-[var(--radius-md)] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
      >
        {loading ? "Creating agent…" : "Create agent & connect"}
        <ArrowRight className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors py-1 cursor-pointer"
      >
        ← Back
      </button>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

type Mode = "choose" | "create" | "existing";

export function McpConnectFlow({ api, agents, callbackUrl }: McpConnectFlowProps) {
  const [mode, setMode] = useState<Mode>("choose");

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-15 blur-[120px]"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Header card */}
        <div
          className="rounded-[var(--radius-lg)] border p-8 shadow-2xl"
          style={{
            borderColor: "var(--line)",
            background: "var(--surface)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          }}
        >
          {/* Logo + title */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25">
              <Shield className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
                Connect MCP Agent
              </h1>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                AgentGrid · Secure local tunnel
              </p>
            </div>
          </div>

          {/* Inline notice */}
          <div
            className="mt-5 mb-6 rounded-[var(--radius-sm)] border px-4 py-3 text-xs text-[var(--muted)] leading-relaxed"
            style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
          >
            Your terminal is waiting. {mode === "choose" ? "Create a new agent or select one you've already registered." : mode === "create" ? "Fill in the details below — the terminal will connect automatically." : "Pick an existing agent to connect to your terminal."}
          </div>

          {mode === "choose" && (
            <ModeSelect
              agents={agents}
              onCreateNew={() => setMode("create")}
              onUseExisting={() => setMode("existing")}
            />
          )}

          {mode === "create" && (
            <CreateAgentForm
              api={api}
              onBack={() => setMode("choose")}
              callbackUrl={callbackUrl}
            />
          )}

          {mode === "existing" && (
            <ExistingAgentPicker
              agents={agents}
              onSelect={() => undefined}
              onBack={() => setMode("choose")}
              callbackUrl={callbackUrl}
            />
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-[var(--muted)]">
          Closing this window without connecting will leave the terminal waiting.
        </p>
      </div>
    </div>
  );
}
