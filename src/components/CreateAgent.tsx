import { useState } from "react";
import { Shield, Check, Copy, User, ArrowRight } from "lucide-react";

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

export const CreateAgent = ({ onDone }: { onDone?: () => void }) => {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mandates checklist & configuration
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
  const valid = trimmed.length > 0;

  const toggleMandate = (index: number) => {
    const updated = [...mandates];
    if (updated[index]) {
      updated[index].enabled = !updated[index].enabled;
      setMandates(updated);
    }
  };

  const updateThreshold = (index: number, val: number) => {
    const updated = [...mandates];
    if (updated[index]) {
      updated[index].stepUpThresholdMinor = val;
      setMandates(updated);
    }
  };

  const updateLimit = (index: number, val: number) => {
    const updated = [...mandates];
    if (updated[index] && updated[index].scope) {
      updated[index].scope.limitPerTransactionMinor = val;
      setMandates(updated);
    }
  };

  const stage = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      // Mock call logic or local storage staging
      sessionStorage.setItem("agentgrid_pending_agent_name", trimmed);
      const generatedToken = "ag_token_" + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("agentgrid_pending_agent_token", generatedToken);
      setToken(generatedToken);
      setSaved(true);
      onDone?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyCommand = () => {
    void navigator.clipboard.writeText("agent-grid-mcp login");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 animate-fade-in">
      {/* Title block with gradient text */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 text-white shadow-lg">
          <Shield className="h-6 w-6" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] bg-gradient-to-r from-[var(--text)] to-[var(--muted)] bg-clip-text">
            New Agent Identity
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Configure mandates, limits, and authorize a new secure local keypair.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Step 1: Naming */}
        <div className="rounded-[var(--radius-md)] border p-6 transition-all duration-300 hover:shadow-md" style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-400">1</span>
            <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Identity Details</h2>
          </div>
          <label htmlFor="agent-name" className="block text-xs font-medium text-[var(--muted)] mb-2">
            Agent Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
            <input
              id="agent-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              placeholder="e.g. Research Bot"
              className="w-full rounded-[var(--radius-sm)] border pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
            />
          </div>
        </div>

        {/* Step 2: Mandates and Scopes */}
        <div className="rounded-[var(--radius-md)] border p-6 transition-all duration-300 hover:shadow-md" style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-400">2</span>
            <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Configure Mandates & Thresholds</h2>
          </div>

          <div className="space-y-4">
            {mandates.map((m, idx) => (
              <div
                key={m.capability}
                className={`rounded-[var(--radius-sm)] border p-4 transition-all duration-200 ${m.enabled ? "bg-indigo-500/5 border-indigo-500/20" : "bg-black/10 border-transparent"}`}
                style={{ borderColor: m.enabled ? undefined : "var(--line)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`cb-${m.capability}`}
                      checked={m.enabled}
                      onChange={() => toggleMandate(idx)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor={`cb-${m.capability}`} className="text-sm font-medium text-[var(--text)] capitalize cursor-pointer">
                      {m.capability}
                    </label>
                  </div>
                  <span className="text-[11px] text-[var(--muted)] font-mono uppercase px-2 py-0.5 rounded bg-black/20">
                    {m.capability === "pay" ? "Consequential" : "Standard"}
                  </span>
                </div>

                {m.enabled && (
                  <div className="mt-4 pt-4 border-t border-[var(--line)] space-y-4 animate-slide-down">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                          Step-up Threshold (Minor Units)
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
                            Transaction Budget (Minor Units)
                          </label>
                          <input
                            type="number"
                            value={m.scope.limitPerTransactionMinor || 0}
                            onChange={(e) => updateLimit(idx, parseInt(e.target.value) || 0)}
                            className="w-full rounded border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action button */}
        {!saved && (
          <button
            type="button"
            onClick={stage}
            disabled={!valid || loading}
            className="w-full rounded-[var(--radius-md)] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
          >
            {loading ? "Generating Token..." : "Register & Generate Connection Token"}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {/* Step 3: Connection Instructions */}
        {saved && (
          <div className="rounded-[var(--radius-md)] border p-6 bg-emerald-500/5 border-emerald-500/20 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-400">
                <Check className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Agent Registered Successfully</h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              The agent profile <strong className="text-[var(--text)]">“{trimmed}”</strong> is registered and ready to connect.
            </p>

            <div className="mt-5 p-4 rounded-lg bg-black/40 border" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[var(--muted)]">RUN COMMAND IN TERMINAL</span>
                <button
                  type="button"
                  onClick={copyCommand}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Command</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto text-[13px] text-indigo-300 font-mono select-all">
                <code>agent-grid-mcp login</code>
              </pre>
            </div>

            <p className="mt-4 text-xs text-[var(--muted)] leading-relaxed">
              Once you run the command, the local MCP server will automatically generate its Ed25519 keypair and enroll under this configuration. 
              You can also select it directly with: <code className="text-indigo-400 font-mono">agent-grid-mcp agents use {slugify(trimmed)}</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug === "" ? "default" : slug;
}
