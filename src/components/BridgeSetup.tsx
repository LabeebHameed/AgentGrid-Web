/**
 * Bridge setup instructions — shown when the backend is unreachable.
 * Guides users through:
 *  1. Installing the agent-grid-mcp package
 *  2. Running the bridge server locally
 *  3. Confirming the connection works
 */

import { useState, useEffect } from "react";
import { Copy, Check, AlertTriangle, Terminal, Zap } from "lucide-react";

type SetupStep = "install" | "run" | "verify";

export const BridgeSetup = ({ apiBase, onConnected }: { apiBase: string; onConnected: () => void }) => {
  const [step, setStep] = useState<SetupStep>("install");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connected, setConnected] = useState(false);

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Try to verify connection every 3 seconds when on verify step
  useEffect(() => {
    if (step !== "verify") return;
    const check = async () => {
      setChecking(true);
      try {
        const res = await fetch(`${apiBase}/api/approvals`, {
          method: "GET",
          headers: { "Accept": "application/json" },
        });
        if (res.ok) {
          setConnected(true);
          onConnected();
        }
      } catch {
        setConnected(false);
      } finally {
        setChecking(false);
      }
    };
    void check();
    const interval = setInterval(() => void check(), 3000);
    return () => clearInterval(interval);
  }, [step, apiBase, onConnected]);

  const installCmd = "npm install -g agent-grid-mcp && agent-grid-mcp";
  const npxCmd = "npx -y agent-grid-mcp";
  const connectionUrl = apiBase || "http://localhost:8787";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} role="dialog" aria-modal="true">
      <div className="relative flex w-full max-w-2xl flex-col rounded-[var(--radius-xl)] border shadow-xl overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5" style={{ color: "var(--text)" }} strokeWidth={1.75} aria-hidden />
            <div>
              <h1 className="text-lg font-semibold text-[var(--text)]">Set up Agent Grid Bridge</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">Connect your AI to governed capabilities</p>
            </div>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-2 px-6 pt-4" style={{ borderBottom: `1px solid var(--line)` }}>
          {[
            { id: "install", label: "1. Install", icon: Terminal },
            { id: "run", label: "2. Run bridge", icon: Zap },
            { id: "verify", label: "3. Verify", icon: Check },
          ].map((s) => {
            const isActive = s.id === step;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id as SetupStep)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium cursor-pointer rounded-t-[var(--radius-md)]"
                style={{
                  color: isActive ? "var(--text)" : "var(--muted)",
                  borderBottom: isActive ? "2px solid var(--text)" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {s.icon && <s.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-[300px]">
          {step === "install" && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-[var(--muted)] mb-4">
                  The Agent Grid bridge server runs locally on your machine, giving your AI governed access to tools while keeping approvals simple.
                </p>
                <p className="text-sm text-[var(--muted)]">Choose your installation method:</p>
              </div>

              {/* npm install -g */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">Option 1: Install globally</p>
                <div className="flex items-stretch gap-2">
                  <pre
                    className="flex-1 mono overflow-x-auto rounded-[var(--radius-md)] p-3 text-xs text-[var(--text)]"
                    style={{ background: "var(--surface-2)" }}
                  >
                    {installCmd}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(installCmd)}
                    className="px-3 py-2 rounded-[var(--radius-md)] cursor-pointer flex items-center gap-1.5"
                    style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="text-xs font-medium">{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-xs text-[var(--subtle)]">Installs globally, then runs immediately.</p>
              </div>

              {/* npx */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">Option 2: Run with npx (no install)</p>
                <div className="flex items-stretch gap-2">
                  <pre
                    className="flex-1 mono overflow-x-auto rounded-[var(--radius-md)] p-3 text-xs text-[var(--text)]"
                    style={{ background: "var(--surface-2)" }}
                  >
                    {npxCmd}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(npxCmd)}
                    className="px-3 py-2 rounded-[var(--radius-md)] cursor-pointer flex items-center gap-1.5"
                    style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="text-xs font-medium">{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-xs text-[var(--subtle)]">Runs without installing globally.</p>
              </div>

              <div className="rounded-[var(--radius-md)] px-4 py-3 text-sm" style={{ background: "var(--ok-dim)", color: "var(--ok)" }}>
                <p className="text-xs font-semibold">ℹ️ Node.js 20+ required</p>
                <p className="mt-1 text-xs opacity-90">Make sure you have Node.js installed on your machine.</p>
              </div>

              <button
                onClick={() => setStep("run")}
                className="w-full rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold cursor-pointer"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                Next: Run bridge
              </button>
            </div>
          )}

          {step === "run" && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-[var(--muted)] mb-4">
                  Open a terminal and paste one of the commands from the previous step. The bridge will start and show you the connection URL.
                </p>
              </div>

              <div className="rounded-[var(--radius-md)] border p-4" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)] mb-3">Terminal output</p>
                <pre className="mono text-xs text-[var(--muted)] overflow-x-auto whitespace-pre-wrap break-words">
{`$ agent-grid-mcp
[agentgrid] Bootstrapping...
[agentgrid] Agent did:key:z6... provisioned
[agentgrid] MCP server up
Agent Grid approval console up on http://localhost:8787
(open this in a browser)`}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">What happens next</p>
                <ul className="text-sm text-[var(--muted)] space-y-2">
                  <li className="flex gap-2">
                    <span className="text-[var(--text)] font-semibold shrink-0">1.</span>
                    <span>The bridge server starts on <code className="mono bg-black/30 px-1 py-0.5 rounded">{connectionUrl}</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--text)] font-semibold shrink-0">2.</span>
                    <span>Your AI gains access to governed tools</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--text)] font-semibold shrink-0">3.</span>
                    <span>This console will connect and show approvals</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setStep("verify")}
                className="w-full rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold cursor-pointer"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                Next: Verify connection
              </button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-[var(--muted)] mb-4">
                  Waiting for the bridge to come online. This will automatically detect when your server is running.
                </p>
              </div>

              <div className="rounded-[var(--radius-md)] border px-4 py-6 text-center" style={{ borderColor: connected ? "var(--ok)" : "var(--line)", background: connected ? "var(--ok-dim)" : "var(--surface-2)" }}>
                <div className="flex justify-center mb-3">
                  {connected ? (
                    <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "var(--ok)" }}>
                      <Check className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
                    </div>
                  ) : checking ? (
                    <div className="h-8 w-8 rounded-full flex items-center justify-center animate-spin" style={{ borderColor: "var(--muted)", borderWidth: 2 }}>
                      <div style={{ borderTopColor: "var(--text)", borderRightColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "transparent", borderWidth: 2, width: 8, height: 8, borderRadius: "50%" }} />
                    </div>
                  ) : (
                    <AlertTriangle className="h-8 w-8" style={{ color: "var(--warn)" }} aria-hidden />
                  )}
                </div>
                <p className="text-sm font-semibold" style={{ color: connected ? "var(--ok)" : "var(--muted)" }}>
                  {connected ? "✓ Connected!" : checking ? "Checking..." : "Waiting for bridge..."}
                </p>
                <p className="text-xs mt-2" style={{ color: connected ? "var(--ok)" : "var(--subtle)" }}>
                  {connected ? `Connected to ${connectionUrl}` : "Make sure the bridge is running"}
                </p>
              </div>

              {!connected && (
                <div className="rounded-[var(--radius-md)] px-4 py-3 text-sm" style={{ background: "var(--warn-dim)", color: "var(--warn)" }}>
                  <p className="font-semibold text-xs">Troubleshooting</p>
                  <ul className="mt-2 text-xs space-y-1 opacity-90">
                    <li>• Paste the command from step 1 into your terminal</li>
                    <li>• Make sure the server shows "console up on..."</li>
                    <li>• This page will detect the connection automatically</li>
                  </ul>
                </div>
              )}

              {connected && (
                <button
                  onClick={onConnected}
                  className="w-full rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold cursor-pointer"
                  style={{ background: "var(--ok)", color: "white" }}
                >
                  Enter console
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
