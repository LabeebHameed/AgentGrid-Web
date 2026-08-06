import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { ShieldCheck, Inbox as InboxIcon, Check, X, Clock, Fingerprint, ArrowLeft } from "lucide-react";
import { useStore, timeAgo } from "../data";
import { Btn, EmptyState, PageHeader, CountdownRing, JsonTree, BiometricOverlay } from "../ui";
import type { RouteKey } from "../Dashboard";

// Premium UI Component imports from the installed blocks
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";



// Stagger wrapper for cards



export function InboxPage({ onNav }: { onNav: (k: RouteKey) => void }) {
  const { approvals, resolveApproval, activeAgentId, agents } = useStore();
  const [filter] = useState<"all" | "STEP_UP" | "NOTICE">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bioTarget, setBioTarget] = useState<string | null>(null);
  // Live clock so the countdown rings tick (and to keep render pure).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeAgent = agents.find((a) => a.id === activeAgentId);
  const shown = approvals.filter(
    (a) =>
      (filter === "all" || a.kind === filter) &&
      (!activeAgent || a.agent === activeAgent.name)
  );
  const selected = shown.find((a) => a.id === selectedId) || null;

  const handleApprove = useCallback((id: string) => {
    setBioTarget(id);
  }, []);

  const handleBioComplete = useCallback(() => {
    if (bioTarget) {
      resolveApproval(bioTarget, "approve");
      setSelectedId(null);
      setBioTarget(null);
    }
  }, [bioTarget, resolveApproval]);

  // JSON payload for detail view
  const policyJson = selected ? {
    request_id: selected.id,
    kind: selected.kind,
    risk_level: selected.risk,
    agent: selected.agent,
    action: selected.title,
    mandate_evaluation: {
      policy_matched: "spend-cap-v2",
      threshold_exceeded: selected.kind === "STEP_UP",
      requires_signature: true,
    },
    timestamp: new Date(selected.createdAt).toISOString(),
  } : null;

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="Pending requests waiting on your signature."
        actions={null}
      />

      {shown.length === 0 ? (
        <div className="ad-scroll overflow-y-auto flex-1 p-6">
          <Card className="bg-card text-card-foreground border-border shadow-none flex flex-col items-center justify-center p-12 relative overflow-hidden">
            {/* Background wireframe decoration */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid-empty" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-empty)" />
              </svg>
            </div>
            
            <div className="flex flex-col items-center text-center relative z-10 max-w-sm gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                <Check size={22} strokeWidth={2.5} />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-card-foreground tracking-tight">Inbox zero</h3>
                <p className="text-xs text-muted-foreground leading-normal">
                  All clear! No pending actions require your signature at the moment.
                </p>
              </div>
              
              <div className="bg-muted/40 border border-border rounded-lg p-4 w-full">
                <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Next Steps</div>
                <div className="text-xs text-muted-foreground leading-normal mb-3">
                  Configure additional governance mandates or connect more service providers to expand coverage.
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onNav("governance")}>Configure mandates</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNav("providers")}>Connect providers</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left: List */}
          <div className={`w-full md:w-[320px] md:max-h-none flex-shrink-0 overflow-y-auto p-4 flex-col gap-3 ${selectedId ? "hidden md:flex" : "flex"}`}>
            <AnimatePresence>
              {shown.map((a) => {
                const selected = selectedId === a.id;
                return (
                  <motion.div
                    key={a.id}
                    data-slot="card"
                    className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer ${selected ? "bg-muted border-border ring-1 ring-inset ring-foreground/15" : "bg-card border-border/40 "}`}
                    onClick={() => setSelectedId(a.id)}
                    initial={{ x: -16 }}
                    animate={{ x: 0 }}
                    exit={{ x: -16 }}
                    transition={{ duration: 0.08, ease: "easeOut" }}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <CountdownRing remaining={Math.max(0, Math.floor((a.createdAt + 3600000 - now) / 1000))} total={3600} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-foreground/70 uppercase">
                          <span className={`size-1.5 rounded-full ${a.kind === "STEP_UP" ? "bg-foreground" : "bg-foreground/40"}`} />
                          {a.kind === "STEP_UP" ? "Step-up" : "Notice"}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          a.risk === "high" ? "bg-foreground/5 text-foreground border border-foreground/15"
                          : a.risk === "medium" ? "bg-foreground/5 text-foreground/80 border border-foreground/15"
                          : "bg-transparent text-foreground/60 border border-foreground/10"
                        }`}>
                          {a.risk}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-card-foreground leading-snug truncate">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{a.agent} · {timeAgo(a.createdAt)}</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Right: Detail */}
          <div className={`flex-1 overflow-y-auto p-4 flex-col min-h-0 bg-muted/10 ${selectedId ? "flex" : "hidden md:flex"}`}>
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ y: 16 }}
                  animate={{ y: 0 }}
                  exit={{ y: 16 }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                  className="flex flex-col min-h-full shrink-0"
                >
                  <Card className="bg-card text-card-foreground border-border shadow-none flex flex-col grow p-6 relative gap-6">
                    <Button variant="ghost" className="md:hidden self-start -ml-2 -mt-2 mb-2 h-8 px-2 text-xs" onClick={() => setSelectedId(null)}>
                      <ArrowLeft className="size-3 mr-1.5" /> Back to list
                    </Button>
                    <div>
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-foreground/70 uppercase">
                          <span className={`size-1.5 rounded-full ${selected.kind === "STEP_UP" ? "bg-foreground" : "bg-foreground/40"}`} />
                          {selected.kind === "STEP_UP" ? "Step-up" : "Notice"}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          selected.risk === "high" ? "bg-foreground/5 text-foreground border border-foreground/15"
                          : selected.risk === "medium" ? "bg-foreground/5 text-foreground/80 border border-foreground/15"
                          : "bg-transparent text-foreground/60 border border-foreground/10"
                        }`}>
                          {selected.risk} risk
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={12} /> {timeAgo(selected.createdAt)}
                        </span>
                      </div>
                      <h2 className="margin-0 text-base font-bold text-card-foreground tracking-tight leading-snug">{selected.title}</h2>
                      <div className="text-xs text-muted-foreground mt-1.5">{selected.agent} · {selected.detail}</div>
                    </div>

                    {selected.imageUrl && (
                      <div className="shrink-0 rounded-xl overflow-hidden border border-border shadow-sm bg-black/5 dark:bg-white/5 flex items-center justify-center">
                        <img src={selected.imageUrl} alt="Request attachment" className="w-full h-auto max-h-[450px] object-contain" />
                      </div>
                    )}

                    {/* JSON policy tree */}
                    <div className="flex-1 min-h-[150px] flex flex-col gap-2 shrink-0">
                      <div className="text-[10px] text-muted-foreground text-uppercase tracking-wider font-semibold">Mandate Evaluation</div>
                      <div className="flex-1 overflow-y-auto bg-muted/40 rounded-lg border border-border p-2">
                        {policyJson && <JsonTree data={policyJson as Record<string, unknown>} />}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-border mt-auto">
                      <Btn variant="ok" icon={<Fingerprint size={14} />} onClick={() => handleApprove(selected.id)}>
                        Approve &amp; sign
                      </Btn>
                      <Btn
                        variant="danger"
                        icon={<X size={14} />}
                        onClick={() => { resolveApproval(selected.id, "deny"); setSelectedId(null); }}
                      >
                        Deny
                      </Btn>
                      <span className="ml-auto text-[10px] text-muted-foreground font-medium tabular-nums">Signed on-device · passkey</span>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  data-slot="card"
                  className="flex flex-col flex-1 h-full items-center justify-center gap-6 p-12"
                >
                  <EmptyState
                    icon={<InboxIcon size={26} />}
                    title="No request selected"
                  >
                    Select a pending request on the left to review the action details, check risk context, and sign or deny with your passkey.
                  </EmptyState>
                  <div className="flex items-start gap-2 bg-muted/40 border border-border rounded-lg p-3 text-left max-w-xs">
                    <ShieldCheck size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-muted-foreground leading-relaxed">
                      All approvals are signed on-device using a passkey. Agenttag never transmits your private key.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <AnimatePresence>
        {bioTarget && <BiometricOverlay onComplete={handleBioComplete} />}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// History
// ============================================================

