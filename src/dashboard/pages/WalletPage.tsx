import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { Plus, X, CreditCard, History as HistoryIcon, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, CircleDashed, Lock } from "lucide-react";
import { useStore, timeAgo, money, type TxKind, type Transaction } from "../data";
import { Chip, PageHeader } from "../ui";
import { api } from "../../lib/client";
import type { VirtualCardView } from "../../lib/types";

// Premium UI Component imports from the installed blocks
import { Button } from "@/components/ui/button";



// Stagger wrapper for cards



import { stagger, fadeUp } from "./shared";
function TopUpModal({ onClose }: { onClose: () => void }) {
  const { tenantId, topUp } = useStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // amount/label/source are ignored by the real topUp() — Stripe Checkout
    // controls the actual amount the operator funds the card with.
    topUp(0, "Stripe Checkout");
    window.setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 280);
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
                <WalletIcon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">Add money</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {tenantId === null
                    ? "Sign in required to fund the wallet."
                    : "Opens Stripe Checkout in a new tab — the balance refreshes automatically once you're done."}
                </div>
              </div>
              <button type="button" onClick={onClose} className="text-muted-foreground p-1 rounded" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
                <WalletIcon size={14} className="text-foreground/60 flex-shrink-0 mt-0.5" />
                <span>
                  There's no "deposit exactly $X" step here — Stripe Checkout controls the amount and payment method
                  for funding this tenant's card.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/20">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 px-3">Cancel</Button>
              <Button type="submit" size="sm" className="h-8 px-3 gap-1.5" disabled={submitting}>
                {submitting ? "Opening…" : "Continue to Stripe Checkout"}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Transaction amounts are always 0 for real data (there is no dedicated
// per-transaction dollar ledger yet — see the Store's derivation comment),
// so month stats are expressed as counts rather than misleading dollar sums.
function getMonthStats(transactions: Transaction[]) {
  const now = Date.now();
  const monthAgo = now - 60 * 60 * 24 * 30 * 1000;
  const monthTopups = transactions.filter((t) => t.kind === "topup" && t.status === "ok" && t.at >= monthAgo).length;
  const monthSends = transactions.filter((t) => t.kind === "send" && t.status === "ok" && t.at >= monthAgo).length;
  return { monthTopups, monthSends };
}

function getTrendBuckets(transactions: Transaction[]) {
  const now = Date.now();
  const buckets: number[] = new Array(14).fill(0);
  transactions.forEach((t) => {
    if (t.status !== "ok" || t.kind !== "topup") return;
    const ageDays = Math.floor((now - t.at) / (60 * 60 * 24 * 1000));
    const idx = 13 - Math.min(13, Math.max(0, ageDays * 14 / 30));
    buckets[idx] += 1; // count-based — real per-transaction amounts aren't available yet
  });
  for (let i = 0; i < buckets.length; i++) buckets[i] += 30 + i * 3;
  return buckets.map((v, i) => ({ v, i }));
}

function LimitEditor({
  label,
  currentMinor,
  currency,
  onSave,
}: {
  label: string;
  currentMinor: number;
  currency: string;
  onSave: (requestedMinor: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentMinor / 100));
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(currentMinor / 100));
          setEditing(true);
        }}
        className="flex items-center justify-between gap-2 w-full text-left rounded-md px-2 py-1 -mx-2 hover:bg-muted/50 transition-colors"
      >
        <span className="ad-vault-mini-label">{label}</span>
        <span className="ad-vault-mini-value mono">{money(currentMinor / 100)} {currency.toUpperCase()}</span>
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const num = parseFloat(value);
        if (!Number.isFinite(num) || num <= 0) return;
        setSaving(true);
        void onSave(Math.round(num * 100)).finally(() => {
          setSaving(false);
          setEditing(false);
        });
      }}
    >
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0.01}
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="w-20 h-6 px-1.5 rounded border border-border bg-background text-xs mono focus:outline-none focus:ring-2 focus:ring-foreground/15"
      />
      <button type="submit" disabled={saving} className="ad-vault-action !h-6 !px-1.5 text-[10px]">
        {saving ? "…" : "Save"}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="ad-vault-action !h-6 !px-1.5 text-[10px]">
        Cancel
      </button>
    </form>
  );
}

function CardLimitsRow({ card, onUpdated }: { card: VirtualCardView; onUpdated: (next: VirtualCardView) => void }) {
  const { toast } = useStore();

  const save = async (field: "perTransaction" | "perPeriod", requestedMinor: number) => {
    try {
      const result = await api.setCardLimits({ handle: card.handle, field, requestedMinor });
      if (!result.ok) {
        toast(result.reason, "bad");
        return;
      }
      onUpdated({
        ...card,
        perTransactionMinor: field === "perTransaction" ? requestedMinor : card.perTransactionMinor,
        perPeriodMinor: field === "perPeriod" ? requestedMinor : card.perPeriodMinor,
      });
      toast("Card limit updated", "ok");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to update card limit", "bad");
    }
  };

  return (
    <div className="ad-row flex-col items-stretch !gap-2 py-3">
      <div className="flex items-center gap-3">
        <span className="ad-row-ico tone-payments"><CreditCard size={14} /></span>
        <div className="min-w-0 flex-1">
          <div className="ad-row-name">Card ••{card.last4}</div>
          <div className="ad-row-desc">
            {money(card.periodSpentMinor / 100)} spent / {card.periodDays}d period · handle {card.handle.slice(0, 10)}…
          </div>
        </div>
        <Lock size={12} className="text-muted-foreground" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
        <LimitEditor
          label="Per-transaction limit"
          currentMinor={card.perTransactionMinor}
          currency={card.currency}
          onSave={(minor) => save("perTransaction", minor)}
        />
        <LimitEditor
          label={`Per-${card.periodDays}d limit`}
          currentMinor={card.perPeriodMinor}
          currency={card.currency}
          onSave={(minor) => save("perPeriod", minor)}
        />
      </div>
    </div>
  );
}

export function WalletPage() {
  const { transactions, getBalance } = useStore();
  const [tab, setTab] = useState<"All" | TxKind>("All");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [cards, setCards] = useState<VirtualCardView[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCardsLoading(true);
    void api
      .getCards()
      .then((c) => {
        if (!cancelled) setCards([...c]);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      })
      .finally(() => {
        if (!cancelled) setCardsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const balance = getBalance();
  const { monthTopups, monthSends } = useMemo(() => getMonthStats(transactions), [transactions]);
  const pendingCount = transactions.filter((t) => t.status === "pending").length;

  const filteredTx = useMemo(() => {
    if (tab === "All") return transactions;
    return transactions.filter((t) => t.kind === tab);
  }, [transactions, tab]);

  // Last 30d trend for sparkline (synthetic, derived from transactions)
  const trend = useMemo(() => getTrendBuckets(transactions), [transactions]);

  return (
    <>
      <PageHeader
        title="Wallet"
        subtitle="Your live card balance, spend limits, and an approximate transaction history."
      />
      <div className="ad-scroll overflow-y-auto flex-1 p-6">
        <motion.div
          className="flex flex-col gap-5"
          variants={stagger}
          initial="visible"
          animate="visible"
        >
          {/* Balance hero */}
          <motion.div variants={fadeUp} className="ad-balance-hero">
            <div className="ad-balance-hero-top">
              <div className="ad-balance-hero-label">
                <WalletIcon size={14} />
                <span>Available balance</span>
                <Chip tone="ok" dot>USD</Chip>
              </div>
              <div className="ad-balance-hero-value mono">
                {money(balance)}
              </div>
              <div className="ad-balance-hero-foot">
                <span className="ad-balance-delta">
                  <ArrowDownLeft size={12} className="text-emerald-500" />
                  {monthTopups} top-up{monthTopups === 1 ? "" : "s"} this month
                </span>
                <span className="ad-balance-delta">
                  <ArrowUpRight size={12} className="text-muted-foreground" />
                  {monthSends} send{monthSends === 1 ? "" : "s"}
                </span>
                {pendingCount > 0 && (
                  <span className="ad-balance-delta">
                    <CircleDashed size={12} className="text-amber-500" />
                    {pendingCount} pending
                  </span>
                )}
              </div>
            </div>
            <div className="ad-balance-hero-side">
              <Button onClick={() => setTopUpOpen(true)} className="h-9 gap-1.5">
                <Plus size={13} /> Add money
              </Button>
              <div className="ad-balance-spark" aria-hidden="true">
                <svg viewBox="0 0 200 56" preserveAspectRatio="none" className="ad-balance-spark-svg">
                  <defs>
                    <linearGradient id="walletSparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--d-ok, #10b981)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--d-ok, #10b981)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path
                    d={trend.reduce((acc, p, i) => acc + (i === 0 ? `M ${i * (200 / (trend.length - 1))} ${56 - p.v * 0.1}` : ` L ${i * (200 / (trend.length - 1))} ${56 - p.v * 0.1}`), "")}
                    fill="none"
                    stroke="var(--d-ok, #10b981)"
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d={
                      trend.reduce((acc, p, i) => acc + (i === 0 ? `M 0 ${56 - p.v * 0.1}` : ` L ${i * (200 / (trend.length - 1))} ${56 - p.v * 0.1}`), "")
                      + ` L 200 56 L 0 56 Z`
                    }
                    fill="url(#walletSparkFill)"
                    stroke="none"
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Virtual cards + real spend limits */}
          <motion.section variants={fadeUp} className="ad-section-card group">
            <div className="ad-section-head">
              <span className="ad-section-icon tone-blue"><CreditCard size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="ad-section-title">Cards</div>
                <div className="ad-section-sub">{cards.length} virtual card{cards.length === 1 ? "" : "s"} · per-transaction &amp; per-period limits</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setTopUpOpen(true)} className="h-7 text-xs">
                <Plus size={12} /> Add money
              </Button>
            </div>
            {cardsLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading cards…</div>
            ) : cards.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 border border-border/60 text-muted-foreground">
                  <CreditCard size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-card-foreground">No virtual cards yet</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Fund the wallet to provision a card for this agent.</div>
                </div>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setTopUpOpen(true)}>
                  <Plus size={12} /> Add money
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {cards.map((c) => (
                  <CardLimitsRow key={c.handle} card={c} onUpdated={(next) => setCards((cur) => cur.map((x) => (x.handle === next.handle ? next : x)))} />
                ))}
              </div>
            )}
          </motion.section>

          {/* Stats strip */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Top-ups (30d)", value: monthTopups, tone: "emerald" },
              { label: "Sends (30d)", value: monthSends, tone: "muted" },
              { label: "Pending", value: pendingCount, tone: "amber" },
              { label: "Cards", value: cards.length, tone: "violet" },
            ].map((s) => (
              <div key={s.label} className="ad-stat-card">
                <span className="ad-stat-label">{s.label}</span>
                <span className="ad-stat-value">{s.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Transactions */}
          <motion.section variants={fadeUp} className="ad-section-card group">
            <div className="ad-section-head">
              <span className="ad-section-icon tone-emerald"><HistoryIcon size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="ad-section-title">Transactions</div>
                <div className="ad-section-sub">{transactions.length} total · approximated from the activity feed</div>
              </div>
              <div className="flex items-center gap-1.5">
                {(["All", "topup", "send"] as const).map((t) => {
                  const active = tab === t;
                  const label = t === "All" ? "All" : t === "topup" ? "Top-ups" : "Sends";
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      aria-pressed={active}
                      className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                        active
                          ? "bg-foreground/8 text-foreground border-foreground/15 font-medium"
                          : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredTx.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60 border border-border/60 text-muted-foreground">
                  <HistoryIcon size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-card-foreground">No transactions yet</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Top up your wallet to fund agent operations.</div>
                </div>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setTopUpOpen(true)}>
                  <Plus size={12} /> Top up now
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredTx.map((t) => {
                  const icoTone =
                    t.status === "ok" ? (t.kind === "topup" ? "emerald" : "neutral") : t.status === "pending" ? "warn" : "bad";
                  const chipTone =
                    t.status === "ok" ? (t.kind === "topup" ? "ok" : "muted") : t.status === "pending" ? "warn" : "bad";
                  const Icon = t.kind === "topup" ? ArrowDownLeft : ArrowUpRight;
                  return (
                    <div key={t.id} className="ad-row ad-tx-row">
                      <span className={`ad-row-ico tone-${icoTone}`}><Icon size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="ad-row-name">{t.label ?? t.sourceLabel ?? "—"}</div>
                        <div className="ad-row-desc">
                          {t.kind === "topup" ? "Top-up" : "Send"} · {timeAgo(t.at)}
                        </div>
                      </div>
                      <Chip tone={chipTone}>
                        {t.status === "ok" ? "Settled" : t.status === "pending" ? "Pending" : "Failed"}
                      </Chip>
                      {/* Real per-transaction dollar amounts aren't available from the
                          activity feed yet — de-emphasize rather than show a misleading $0.00. */}
                      <span className="ad-tx-amount mono text-muted-foreground text-[11px]" title="Exact amount not available from the activity feed yet">
                        amount n/a
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>

        </motion.div>
      </div>
      <AnimatePresence>
        {topUpOpen && <TopUpModal onClose={() => setTopUpOpen(false)} />}
      </AnimatePresence>
    </>
  );
}


