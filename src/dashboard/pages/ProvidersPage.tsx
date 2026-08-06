import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { ShieldCheck, Ban, Plus, X, CreditCard, MessageSquare, Cloud, Database } from "lucide-react";
import { useStore, timeAgo, type Provider } from "../data";
import { Chip, PageHeader } from "../ui";

// Premium UI Component imports from the installed blocks
import { Button } from "@/components/ui/button";



// Stagger wrapper for cards



import { stagger, fadeUp } from "./shared";
// ============================================================
// Providers
// ============================================================
const provIcon = (c: Provider["category"]) =>
  c === "payments" ? <CreditCard size={20} /> : c === "comms" ? <MessageSquare size={20} /> : c === "data" ? <Database size={20} /> : <Cloud size={20} />;

// Credential fields required to connect each provider — keyed by provider id.
// Keep this list aligned with what's actually consumed in the dashboard code
// (Stripe for billing, Vercel for frontend deployment).
//
// Note: Twilio, AgentMail, and AgentCard credentials are now handled in the
// backend / inbuilt — no user-supplied configuration inputs are required for
// them during the connection flow.
//
// Vercel notes: the Vercel REST API authenticates exclusively via an HTTP
// Bearer token (Authorization: Bearer <TOKEN>). teamId/slug are per-operation
// parameters picked at call time, and the API base URL is fixed, so only a
// single Token field is required here.
function getFieldsForProvider(id: string): Array<{
  key: string;
  label: string;
  help?: string;
  placeholder: string;
  type?: string;
}> {
  switch (id) {
    case "stripe":
      return [
        { key: "apiKey", label: "Secret key", help: "starts with sk_live_ or sk_test_", placeholder: "sk_live_…", type: "password" },
      ];
    case "vercel":
      return [
        { key: "token", label: "Token", help: "a Vercel personal access token", placeholder: "vercel_…", type: "password" },
      ];
    case "twilio":
    case "agentmail":
    case "agentcard":
      // Inbuilt — credentials are managed by the backend, not configured here.
      return [];
    default:
      return [];
  }
}

function ConnectProviderModal({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const { connectProvider, toast } = useStore();
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const fields = getFieldsForProvider(provider.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (!values[f.key]?.trim()) {
        toast(`${f.label} is required`, "info");
        return;
      }
    }
    setSubmitting(true);
    setTimeout(() => {
      connectProvider(provider.id, values);
      onClose();
    }, 300);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card text-card-foreground border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center border border-border">
                {provIcon(provider.category)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">Connect {provider.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{provider.desc}</div>
              </div>
              <button type="button" onClick={onClose} className="text-muted-foreground p-1 rounded relative before:absolute before:-inset-2 before:content-[''] active:scale-[0.96] hover:bg-muted/50 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-card-foreground block mb-1.5">
                    {f.label}
                    {f.help && <span className="text-muted-foreground font-normal ml-1.5">· {f.help}</span>}
                  </label>
                  <input
                    type={f.type || "text"}
                    value={values[f.key] || ""}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30"
                  />
                </div>
              ))}

              <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
                <ShieldCheck size={14} className="text-foreground/60 flex-shrink-0 mt-0.5" />
                <span>
                  This form isn't wired to a live endpoint yet — providers are configured server-side via
                  operator environment variables. To actually connect {provider.name}, set the{" "}
                  <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">{provider.envKey}</code>{" "}
                  environment variable on the server and restart it.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/20">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 px-3">Cancel</Button>
              <Button type="submit" size="sm" className="h-8 px-3 gap-1.5" disabled={submitting}>
                {submitting ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ProviderCard({ p, onConnect, onDisconnect }: { p: Provider; onConnect: () => void; onDisconnect: () => void }) {
  const fieldCount = getFieldsForProvider(p.id).length;
  const credWord = fieldCount === 1 ? "credential" : "credentials";
  const metaText = p.connected
    ? (p.detail ?? "Connected")
    : fieldCount === 0
      ? "No credentials required"
      : `${fieldCount} ${credWord} required`;

  return (
    <div 
      data-slot="card"
      className="relative flex flex-col justify-between rounded-2xl border border-black/10 dark:border-white/5 bg-gradient-to-b from-white/90 to-white/70 dark:from-[#141417]/85 dark:to-[#0a0a0c]/95 p-5 shadow-sm dark:shadow-md dark:shadow-black/50 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-black/20 dark:hover:border-white/12 hover:shadow-md dark:hover:shadow-xl dark:hover:shadow-black/80 group active:scale-[0.98]"
    >
      {/* Top highlight glow reflex in dark mode */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none border border-transparent dark:group-hover:border-white/10 dark:border-white/5 transition-all duration-300 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06)]" />

      <div>
        {/* Header: icon + category chip */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center size-8 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/8 text-foreground group-hover:scale-105 transition-transform duration-300">
              {provIcon(p.category)}
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">{p.category}</span>
          </div>
          {p.connected ? (
            <Chip tone="ok" dot>Connected</Chip>
          ) : (
            <Chip tone="muted">Available</Chip>
          )}
        </div>
        
        <div className="text-base font-semibold tracking-tight text-foreground mt-4 text-left" style={{ textWrap: "balance" }}>{p.name}</div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2 text-left" style={{ textWrap: "pretty" }}>{p.desc}</p>
      </div>
      
      <div>
        {/* Meta strip */}
        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck size={12} style={{ color: p.connected ? "var(--d-ok)" : undefined }} className="shrink-0" />
            <span className="truncate">{metaText}</span>
          </div>
          {p.connected && p.connectedAt && (
            <span className="tabular-nums shrink-0">{timeAgo(p.connectedAt)}</span>
          )}
        </div>

        {!p.connected && (
          <div className="mt-1.5 text-[10px] text-muted-foreground/80 leading-relaxed">
            Configured via <code className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">{p.envKey}</code> on the server
          </div>
        )}

        {/* Action */}
        <div className="mt-4">
          {p.connected ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full h-9 justify-center gap-1.5 font-medium rounded-lg"
              onClick={onDisconnect}
            >
              <Ban size={12} /> Disconnect
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-9 justify-center gap-1.5 font-medium rounded-lg text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              onClick={onConnect}
            >
              <Plus size={12} /> Connect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProvidersPage() {
  const { providers, disconnectProvider } = useStore();
  const [connectingProvider, setConnectingProvider] = useState<Provider | null>(null);
  const [category, setCategory] = useState<Provider["category"] | "All">("All");

  const connected = providers.filter((p) => p.connected).length;
  const categories = useMemo(
    () => Array.from(new Set(providers.map((p) => p.category))),
    [providers]
  );

  const filtered = useMemo(
    () => (category === "All" ? providers : providers.filter((p) => p.category === category)),
    [providers, category]
  );

  const categoryFilters: Array<{ key: Provider["category"] | "All"; label: string; count: number; tone: string }> = [
    { key: "All", label: "All", count: providers.length, tone: "muted" },
    { key: "payments", label: "Payments", count: providers.filter((p) => p.category === "payments").length, tone: "payments" },
    { key: "comms", label: "Comms", count: providers.filter((p) => p.category === "comms").length, tone: "comms" },
    { key: "compute", label: "Compute", count: providers.filter((p) => p.category === "compute").length, tone: "compute" },
    { key: "data", label: "Data", count: providers.filter((p) => p.category === "data").length, tone: "data" },
  ];

  return (
    <>
      <PageHeader
        title="Providers"
        subtitle={`${connected} of ${providers.length} connected — credentials stay vaulted, never exposed to the agent.`}
      />
      <div className="ad-scroll overflow-y-auto flex-1 p-6">
        <motion.div
          className="flex flex-col gap-5"
          variants={stagger}
          initial="visible"
          animate="visible"
        >
          {/* Stats strip */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Connected", value: connected },
              { label: "Available", value: providers.length - connected },
              { label: "Categories", value: categories.length },
              { label: "Vaulted", value: connected },
            ].map((stat) => (
              <div key={stat.label} data-slot="card" className="ad-card pad flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{stat.label}</span>
                <span className="text-2xl font-bold text-card-foreground tabular-nums">{stat.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Category filter chips */}
          {providers.length > 0 && (
            <motion.div variants={fadeUp} className="flex items-center gap-1.5 flex-wrap">
              {categoryFilters.map((f) => {
                const active = category === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setCategory(f.key)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-all relative before:absolute before:-inset-1 before:content-[''] active:scale-[0.96] ${
                      active
                        ? "bg-foreground/8 text-foreground border-foreground/15 font-medium"
                        : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                    }`}
                  >
                    {f.key !== "All" && (
                      <span className={`size-1.5 rounded-full ad-cat-dot ad-cat-dot-${f.tone}`} />
                    )}
                    <span>{f.label}</span>
                    <span className="font-medium tabular-nums text-foreground/80">{f.count}</span>
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Provider grid */}
          {filtered.length === 0 ? (
            <motion.div variants={fadeUp} className="ad-empty-lg">
              <div className="ad-empty-ico"><Cloud size={22} /></div>
              <div className="ad-empty-title">No providers in this category</div>
              <div className="text-xs text-muted-foreground">
                Add a new provider or pick a different filter.
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              variants={stagger}
              initial="visible"
              animate="visible"
            >
              {filtered.map((p) => (
                <motion.div key={p.id} variants={fadeUp}>
                  <ProviderCard
                    p={p}
                    onConnect={() => setConnectingProvider(p)}
                    onDisconnect={() => disconnectProvider(p.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
      <AnimatePresence>
        {connectingProvider && (
          <ConnectProviderModal
            provider={connectingProvider}
            onClose={() => setConnectingProvider(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}


