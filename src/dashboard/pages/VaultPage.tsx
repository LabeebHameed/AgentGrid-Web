import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { ShieldCheck, Plus, X, Search, CreditCard, KeyRound, Trash2, Globe, Fingerprint } from "lucide-react";
import { useStore, timeAgo, type VaultItem, type VaultItemType } from "../data";
import { PageHeader } from "../ui";

// Premium UI Component imports from the installed blocks
import { Button } from "@/components/ui/button";



// Stagger wrapper for cards



import { stagger, fadeUp } from "./shared";
// ============================================================
// Vault
// ============================================================
const VAULT_TYPE_META: Record<VaultItemType, { label: string; icon: React.ReactNode; tone: string }> = {
  card: { label: "Card", icon: <CreditCard size={16} />, tone: "payments" },
  login: { label: "Login", icon: <Globe size={16} />, tone: "compute" },
  apikey: { label: "API key", icon: <KeyRound size={16} />, tone: "data" },
};

function VaultItemCard({
  item,
  onRemove,
}: {
  item: VaultItem;
  onRemove: () => void;
}) {
  const meta = VAULT_TYPE_META[item.type];

  return (
    <div className="ad-vault-card-wrap">
      <div className="ad-vault-card">
        <div className={`ad-vault-face ad-vault-face--front tone-${meta.tone}`}>
          <div className="ad-vault-face-row">
            <span className={`ad-vault-icon tone-${meta.tone}`}>{meta.icon}</span>
            <span className="ad-vault-type-chip">{meta.label}</span>
          </div>
          <div className="ad-vault-name">{item.name}</div>
          <div className="ad-vault-subtitle">{item.trustDomain ?? "—"}</div>
          <div className="ad-vault-masked mono">
            <Fingerprint size={11} className="inline mr-1 align-[-1px]" />
            {item.id}
          </div>
          <div className="ad-vault-face-foot two">
            <div>
              <div className="ad-vault-mini-label">Namespace</div>
              <div className="ad-vault-mini-value">{item.namespace ?? "—"}</div>
            </div>
            <div>
              <div className="ad-vault-mini-label">Added</div>
              <div className="ad-vault-mini-value">{timeAgo(item.addedAt)}</div>
            </div>
          </div>
          <div className="ad-vault-face-foot">
            <span className="ad-vault-reveal-hint">
              <ShieldCheck size={11} /> Secret material stays in the vault
            </span>
          </div>
        </div>
      </div>
      <div className="ad-vault-card-actions">
        <button
          type="button"
          className="ad-vault-action ad-vault-action--danger"
          onClick={onRemove}
          aria-label="Remove"
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>
    </div>
  );
}

function AddVaultItemModal({ onClose }: { onClose: () => void }) {
  const { addVaultItem } = useStore();
  const [type, setType] = useState<VaultItemType>("card");
  const [name, setName] = useState("");
  // Card
  const [brand, setBrand] = useState("Visa");
  const [holder, setHolder] = useState("");
  const [last4, setLast4] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  // Login
  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // API key
  const [service, setService] = useState("");
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(""); setBrand("Visa"); setHolder(""); setLast4(""); setExpiry(""); setCvv("");
    setSite(""); setUsername(""); setPassword("");
    setService(""); setKey("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (type === "card") {
      if (!holder.trim() || !last4.trim() || !expiry.trim() || !cvv.trim()) return;
      addVaultItem({
        type: "card",
        name: name.trim(),
        card: {
          last4: last4.trim().slice(-4),
          expiry: expiry.trim(),
          brand: brand.trim(),
          network: brand.trim(),
          holder: holder.trim(),
          cvv: cvv.trim(),
        },
      });
    } else if (type === "login") {
      if (!site.trim() || !username.trim() || !password.trim()) return;
      addVaultItem({
        type: "login",
        name: name.trim(),
        login: { site: site.trim(), username: username.trim(), password: password.trim() },
      });
    } else {
      if (!service.trim() || !key.trim()) return;
      addVaultItem({
        type: "apikey",
        name: name.trim(),
        apiKey: { service: service.trim(), key: key.trim() },
      });
    }
    setSubmitting(true);
    setTimeout(() => {
      reset();
      onClose();
    }, 220);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
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
                <ShieldCheck size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">Add to Vault</div>
                <div className="text-xs text-muted-foreground mt-0.5">Manual add isn't connected to a real endpoint yet — this stays local.</div>
              </div>
              <button type="button" onClick={onClose} className="text-muted-foreground p-1 rounded relative before:absolute before:-inset-2 before:content-[''] hover:bg-muted/50 transition-colors active:scale-[0.96]" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Type picker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["card", "login", "apikey"] as VaultItemType[]).map((t) => {
                  const m = VAULT_TYPE_META[t];
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        active
                          ? "bg-foreground/8 border-foreground/20 text-foreground"
                          : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      <span className={`ad-vault-icon tone-${m.tone} mx-auto`}>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-medium text-card-foreground block mb-1.5">
                  Display name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={type === "card" ? "e.g. Operator card" : type === "login" ? "e.g. GitHub" : "e.g. OpenAI"}
                  autoComplete="off"
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30"
                />
              </div>

              {type === "card" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Brand</label>
                      <select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30"
                      >
                        <option>Visa</option>
                        <option>Mastercard</option>
                        <option>Amex</option>
                        <option>Discover</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Holder</label>
                      <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Full name" autoComplete="off" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Last 4</label>
                      <input value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4242" inputMode="numeric" autoComplete="off" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30" />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Expiry</label>
                      <input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" autoComplete="off" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30" />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">CVV</label>
                      <input type="password" value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="•••" autoComplete="off" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30" />
                    </div>
                  </div>
                </>
              )}

              {type === "login" && (
                <>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Site</label>
                    <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="github.com" autoComplete="off" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Username</label>
                      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@example.com" autoComplete="off" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30" />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Password</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="off" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30" />
                    </div>
                  </div>
                </>
              )}

              {type === "apikey" && (
                <>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Service</label>
                    <input value={service} onChange={(e) => setService(e.target.value)} placeholder="OpenAI" autoComplete="off" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30" />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Key</label>
                    <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" autoComplete="off" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm placeholder:text-muted-foreground mono focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30" />
                  </div>
                </>
              )}

              <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
                <ShieldCheck size={14} className="text-foreground/60 flex-shrink-0 mt-0.5" />
                <span>Not connected yet — the vault never accepts operator-submitted secrets in production. This form is a placeholder.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/20">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 px-3">Cancel</Button>
              <Button type="submit" size="sm" className="h-8 px-3 gap-1.5" disabled={submitting}>
                {submitting ? "Saving…" : "Add to Vault"}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function VaultPage() {
  const { vaultItems, removeVaultItem } = useStore();
  const [filter, setFilter] = useState<"All" | VaultItemType>("All");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => {
    const c = { All: vaultItems.length, card: 0, login: 0, apikey: 0 };
    for (const v of vaultItems) c[v.type]++;
    return c;
  }, [vaultItems]);

  const filtered = useMemo(() => {
    let list = vaultItems;
    if (filter !== "All") list = list.filter((v) => v.type === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((v) => {
        if (v.name.toLowerCase().includes(q)) return true;
        if (v.card && (v.card.brand + " " + v.card.holder + " " + v.card.last4).toLowerCase().includes(q)) return true;
        if (v.login && (v.login.site + " " + v.login.username).toLowerCase().includes(q)) return true;
        if (v.apiKey && (v.apiKey.service + " " + v.apiKey.key).toLowerCase().includes(q)) return true;
        return false;
      });
    }
    return list;
  }, [vaultItems, filter, query]);

  const stats: Array<{ label: string; value: number; icon: React.ReactNode; tone: string }> = [
    { label: "Total items", value: counts.All, icon: <ShieldCheck size={14} />, tone: "emerald" },
    { label: "Cards", value: counts.card, icon: <CreditCard size={14} />, tone: "blue" },
    { label: "Logins", value: counts.login, icon: <Globe size={14} />, tone: "amber" },
    { label: "API keys", value: counts.apikey, icon: <KeyRound size={14} />, tone: "violet" },
  ];

  return (
    <>
      <PageHeader
        title="Vault"
        subtitle="Entries held in the agent's vault. Secret material never reaches this console — only the handle, label, and trust scope are shown."
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
            {stats.map((s) => (
              <div key={s.label} data-slot="card" className="ad-stat-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="ad-stat-label">
                    <span className={`ad-stat-ico ad-stat-ico--${s.tone}`}>{s.icon}</span>
                    {s.label}
                  </span>
                </div>
                <span className="ad-stat-value">{s.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Toolbar: filter chips + search + add */}
          <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["All", "card", "login", "apikey"] as const).map((f) => {
                const active = filter === f;
                const label = f === "All" ? "All" : VAULT_TYPE_META[f as VaultItemType].label;
                const tone = f === "All" ? "muted" : VAULT_TYPE_META[f as VaultItemType].tone;
                const count = counts[f];
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-all relative before:absolute before:-inset-1 before:content-[''] active:scale-[0.96] ${
                      active
                        ? "bg-foreground/8 text-foreground border-foreground/15 font-medium"
                        : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                    }`}
                  >
                    {f !== "All" && (
                      <span className={`size-1.5 rounded-full ad-cat-dot ad-cat-dot-${tone}`} />
                    )}
                    <span>{label}</span>
                    <span className="font-medium tabular-nums text-foreground/80">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 ml-auto flex-1 sm:flex-none">
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search vault…"
                  aria-label="Search vault"
                  className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-background text-xs text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/30"
                />
              </div>
              <Button size="sm" onClick={() => setAdding(true)} className="h-8 gap-1.5 shrink-0">
                <Plus size={12} /> Add item
              </Button>
            </div>
          </motion.div>

          {/* Vault grid */}
          {filtered.length === 0 ? (
            <motion.div variants={fadeUp} className="ad-empty-lg">
              <div className="ad-empty-ico"><ShieldCheck size={22} /></div>
              <div className="ad-empty-title">Your vault is empty</div>
              <div className="text-xs text-muted-foreground max-w-xs">
                Vault entries are provisioned server-side for the active agent. Manually adding one from the console isn't wired up yet.
              </div>
              <Button size="sm" onClick={() => setAdding(true)} className="mt-3 h-8 gap-1.5">
                <Plus size={12} /> Add your first item
              </Button>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              variants={stagger}
              initial="visible"
              animate="visible"
            >
              {filtered.map((v) => (
                <motion.div key={v.id} variants={fadeUp}>
                  <VaultItemCard item={v} onRemove={() => removeVaultItem(v.id)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
      <AnimatePresence>
        {adding && <AddVaultItemModal onClose={() => setAdding(false)} />}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// Wallet
// ============================================================

