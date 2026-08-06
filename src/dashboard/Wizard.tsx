import { useEffect, useRef, useState } from "react";
import {
  X, ArrowRight, ArrowLeft, Check, Cpu, Plug, Copy, Terminal, KeyRound,
} from "lucide-react";
import { useStore } from "./data";
import { Toggle } from "./ui";
import { Button } from "@/components/ui/button";
import { getStored, setStored } from "@/lib/storage";
import type { RouteKey } from "./Dashboard";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/client";

const STEPS = [
  { title: "License", description: "Activate your Agenttag key", optional: true },
  { title: "Agent setup", description: "Name and mint your agent", optional: false },
  { title: "Providers", description: "Connect the tools it can use", optional: true },
  { title: "Connect AI", description: "Add the MCP server", optional: false },
];

export function Wizard({ onClose, onFinish, onNav }: { onClose: () => void; onFinish: () => void; onNav: (k: RouteKey) => void }) {
  const { settings, updateSettings, providers, toggleProvider, toast, refresh } = useStore();
  const [step, setStep] = useState(() => Number(getStored("aeg-dash-wizard-step") || "0"));
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setStepPersisted = (s: number | ((prev: number) => number)) => {
    setStep((prev) => {
      const nextVal = typeof s === "function" ? s(prev) : s;
      setStored("aeg-dash-wizard-step", String(Math.min(nextVal, STEPS.length - 1)));
      return nextVal;
    });
  };

  const [license, setLicense] = useState("");
  const [activatingLicense, setActivatingLicense] = useState(false);
  const [agentName, setAgentName] = useState("Research Agent");
  const [client, setClient] = useState<"claude" | "chatgpt" | "custom">("claude");
  const [copied, setCopied] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [agentToken, setAgentToken] = useState<string | null>(null);

  // Real providers, not mock-only ids — connecting one is intentionally a
  // "not connected yet" no-op for now (see Store's toggleProvider).
  const setupProviders = providers;
  const last = step === STEPS.length - 1;

  const next = () => setStepPersisted((s) => s + 1);
  const back = () => setStepPersisted((s) => Math.max(0, s - 1));
  const finish = () => {
    toast("Setup complete", "ok");
    onFinish();
    onNav("dashboard");
  };

  const activateLicense = async () => {
    const key = license.trim();
    if (!key) return;
    setActivatingLicense(true);
    try {
      const result = await api.activateLicense({ key });
      if (result.ok) {
        updateSettings({ licenseKey: key });
        toast("License activated", "ok");
        next();
      } else {
        toast(result.reason ?? "License activation failed", "bad");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "License activation failed", "bad");
    } finally {
      setActivatingLicense(false);
    }
  };

  const createAgent = async () => {
    const displayName = agentName.trim();
    if (!displayName) return;
    setCreatingAgent(true);
    try {
      const { token } = await api.createAgent({ displayName });
      setAgentToken(token);
      toast(`${displayName} — connection token issued`, "ok");
      void refresh();
      next();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to create agent", "bad");
    } finally {
      setCreatingAgent(false);
    }
  };

  const cmd = agentToken
    ? `agenttag mcp add --client ${client} --agent "${agentName}" --token ${agentToken}`
    : `agenttag mcp add --client ${client} --agent "${agentName}"`;

  const stepIcons = [
    <KeyRound size={18} key="0" />,
    <Cpu size={18} key="1" />,
    <Plug size={18} key="2" />,
    <Terminal size={18} key="3" />,
  ];

  return (
    <motion.div
      className="ad-wizmask-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Background ambient glowing orbs */}
      <div className="ad-wiz-orb ad-wiz-orb1" />
      <div className="ad-wiz-orb ad-wiz-orb2" />

      <div ref={dialogRef} className="ad-wiz ad-wiz-full" role="dialog" aria-modal="true" aria-label="Agenttag setup wizard">
        <button className="ad-wiz-close" onClick={onClose} aria-label="Skip wizard"><X size={18} /></button>

        <div className="ad-wiz-top">
          <div className="flex items-center gap-2.5">
            <span className="ad-brand-mark"><Cpu size={14} /></span>
            <b className="text-sm">Connect Agent</b>
          </div>
          <div className="ad-wiz-progress">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className={`ad-wiz-step ad-wiz-progress-dot ${i === step ? "is-active" : i < step ? "done" : ""}`}
                onClick={() => setStepPersisted(i)}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="ad-wiz-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="ad-wiz-step-panel"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="ad-wiz-step-hero">
                <motion.span
                  className="ad-wiz-step-icon"
                  initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  key={`icon-${step}`}
                >
                  {stepIcons[step]}
                </motion.span>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  key={`title-${step}`}
                >
                  {STEPS[step].title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  key={`desc-${step}`}
                >
                  {STEPS[step].description}
                </motion.p>
              </div>

              {step === 0 && (
                <div className="ad-wiz-card">
                  <p className="ad-wiz-card-lead">Activate a key to enforce policies in production. You can skip this — the agent runs without a license while enforcement is in testing mode.</p>
                  {settings.licenseKey && (
                    <p className="ad-wiz-card-lead" style={{ color: "var(--primary)" }}>Currently active: {settings.licenseKey}</p>
                  )}
                  <label className="ad-field-label">License key</label>
                  <div className="flex gap-2">
                    <input className="ad-input" placeholder="paste your license key" value={license} onChange={(e) => setLicense(e.target.value)} />
                    <Button disabled={!license.trim() || activatingLicense} onClick={() => void activateLicense()}>
                      {activatingLicense ? "Activating…" : "Activate"}
                    </Button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="ad-wiz-card">
                  <label className="ad-field-label">Agent name</label>
                  <input className="ad-input" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="e.g., Research Agent" disabled={agentToken !== null} />

                  {/* Premium ID Card Live Preview */}
                  <div className="ad-row mt-3 bg-muted/30 p-3 rounded-lg border border-border flex items-center gap-3">
                    <span className="ad-row-ico text-primary"><Cpu size={17} /></span>
                    <div style={{ flex: 1 }}>
                      <div className="ad-row-name font-medium text-sm">{agentName || "Unnamed agent"}</div>
                      <div className="ad-row-desc text-xs text-muted-foreground font-mono">
                        {agentToken ? "connecting… minted a real connection token" : "did:key:z6Mk… minted once the agent daemon enrolls"}
                      </div>
                    </div>
                  </div>

                  <div className="ad-wiz-summary">
                    <div>
                      <span className="ad-wiz-summary-label">Identity</span>
                      <span className="ad-wiz-summary-value mono">did:key:z6Mk…</span>
                    </div>
                    <div>
                      <span className="ad-wiz-summary-label">Scope</span>
                      <span className="ad-wiz-summary-value">Self-sovereign & revocable</span>
                    </div>
                  </div>

                  {agentToken === null && (
                    <Button className="mt-3" disabled={!agentName.trim() || creatingAgent} onClick={() => void createAgent()}>
                      {creatingAgent ? "Minting…" : "Mint agent & continue"}
                    </Button>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="ad-wiz-card flat">
                  <p className="ad-wiz-card-lead">Connect the tools your agent will use. Credentials are vaulted.</p>
                  <div className="ad-stack">
                    {setupProviders.map((p) => (
                      <div key={p.id} className="ad-row">
                        <span className="ad-row-ico" style={{ color: p.connected ? "var(--primary)" : "var(--muted-foreground)" }}><Plug size={17} /></span>
                        <div style={{ flex: 1 }}>
                          <div className="ad-row-name">{p.name}</div>
                          <div className="ad-row-desc">{p.desc}</div>
                        </div>
                        <Toggle on={p.connected} onClick={() => toggleProvider(p.id)} label={`connect ${p.name}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="ad-wiz-card flat">
                  <p className="ad-wiz-card-lead">Run the command in your AI client. The MCP tools will appear automatically.</p>
                  <div className="ad-seg ad-wiz-seg">
                    {(["claude", "chatgpt", "custom"] as const).map((c) => (
                      <button key={c} className={client === c ? "is-active" : ""} onClick={() => setClient(c)}>
                        {c === "claude" ? "Claude" : c === "chatgpt" ? "ChatGPT" : "Custom"}
                      </button>
                    ))}
                  </div>
                  <div className="ad-wiz-terminal rounded-xl border border-border/80 bg-zinc-950 overflow-hidden shadow-lg mt-3">
                    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/60">
                      <div className="flex gap-1.5">
                        <span className="size-2 rounded-full bg-red-500/80" />
                        <span className="size-2 rounded-full bg-yellow-500/80" />
                        <span className="size-2 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 select-none">agenttag-mcp-install</span>
                      <div className="w-8" />
                    </div>
                    <div className="ad-wiz-snippet bg-transparent border-none p-4">
                      <code className="mono text-zinc-100"><span className="ad-wiz-snippet-prompt text-zinc-600">$</span> {cmd}</code>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50" onClick={() => { navigator.clipboard?.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 2000); toast("Copied to clipboard", "ok"); }} aria-label="Copy command">
                        <Copy size={15} />
                      </Button>
                      {copied && <span className="ad-wiz-copied copied-tooltip">Copied!</span>}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="ad-wiz-foot-full">
          <div className="flex gap-2">
            {step < STEPS.length - 1 && (
              <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">Skip setup</Button>
            )}
            {step > 0 && (
              <Button variant="ghost" onClick={back} className="gap-1.5">
                <ArrowLeft size={15} /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {STEPS[step].optional && step < STEPS.length - 1 && (
              <Button variant="ghost" onClick={next} className="text-muted-foreground hover:text-foreground">Skip this step</Button>
            )}
            {!(step === 1 && agentToken === null) && (
              <Button onClick={last ? finish : next} className="gap-1.5">
                {last ? <>Finish setup <Check size={15} /></> : <>Next <ArrowRight size={15} /></>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

