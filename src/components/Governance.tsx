import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Snowflake,
  ShieldCheck,
  ScrollText,
  KeyRound,
  CreditCard,
  FileCheck2,
  BadgeCheck,
  Activity as ActivityIcon,
  ArrowUpRight,
  Download,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import type { ApprovalApi, PolicyFilter } from "../api";
import type {
  ActivityResponse,
  AgentSummary,
  AuditView,
  GovernanceOverview,
  IdentityView,
  MandateView,
  PolicyDecisionView,
  PrimitiveKind,
  Verdict,
  VaultEntryView,
  VirtualCardView,
  ServiceAccountView,
} from "../types";
import { shortDid, formatClock } from "../lib/format";

/** Format integer minor units as a currency amount. */
const money = (minor: number, currency: string): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);

type Section = PrimitiveKind | "activity" | "overview" | "wallet";

const SECTIONS: readonly { id: Section; label: string; icon: typeof ShieldCheck }[] = [
  { id: "mandate", label: "Mandates", icon: ScrollText },
  { id: "policy", label: "Policy", icon: ShieldCheck },
  { id: "hardLimits", label: "Cards", icon: CreditCard },
  { id: "vault", label: "Vault", icon: KeyRound },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "audit", label: "Audit", icon: FileCheck2 },
  { id: "identity", label: "Passport", icon: BadgeCheck },
  { id: "activity", label: "Live activity", icon: ActivityIcon },
];

/** A fixed educational statement, rendered from the model (never hard-coded copy). */
const Statement = ({ text }: { text: string }) => (
  <p
    className="rounded-[var(--radius-md)] border px-3.5 py-2.5 text-xs leading-relaxed text-[var(--muted)]"
    style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
  >
    {text}
  </p>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-5">
    <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">{title}</h2>
    <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div
    className="rounded-[var(--radius-lg)] border py-12 text-center text-sm text-[var(--subtle)]"
    style={{ borderColor: "var(--line)" }}
  >
    {text}
  </div>
);

/** Always-available kill switch (R8.1) — present in the overview and every view. */
const FreezeControl = ({
  agent,
  busy,
  onFreeze,
  onUnfreeze,
}: {
  agent: AgentSummary | undefined;
  busy: boolean;
  onFreeze: (params: { agentDid: string; reason: string }) => void;
  onUnfreeze: (params: { agentDid: string }) => void;
}) => {
  const [reason, setReason] = useState("");
  if (agent === undefined) return null;
  const frozen = agent.status.frozen;
  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-[var(--radius-lg)] border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: frozen ? "var(--danger)" : "var(--line)",
        background: frozen ? "var(--danger-dim)" : "var(--surface)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <Snowflake
          className="h-5 w-5"
          style={{ color: frozen ? "var(--danger)" : "var(--muted)" }}
          strokeWidth={1.75}
          aria-hidden
        />
        <div>
          <p className="text-sm font-medium text-[var(--text)]">
            {frozen ? "Agent halted" : "Kill switch"}
          </p>
          <p className="text-xs text-[var(--subtle)]">
            {frozen
              ? `Frozen${agent.status.reason === null ? "" : `: ${agent.status.reason}`}`
              : "Halt every consequential action immediately."}
          </p>
        </div>
      </div>
      {frozen ? (
        <button
          disabled={busy}
          onClick={() => onUnfreeze({ agentDid: agent.did })}
          className="rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
          style={{ background: "var(--surface-3)", color: "var(--text)" }}
        >
          Resume agent
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="reason (1–500 chars)"
            maxLength={500}
            className="w-44 rounded-[var(--radius-md)] border bg-transparent px-2.5 py-2 text-sm text-[var(--text)] outline-none"
            style={{ borderColor: "var(--line)" }}
          />
          <button
            disabled={busy || reason.trim() === ""}
            onClick={() => {
              onFreeze({ agentDid: agent.did, reason });
              setReason("");
            }}
            className="rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: "var(--danger)", color: "white" }}
          >
            Freeze
          </button>
        </div>
      )}
    </div>
  );
};

const STATUS_COLOR: Record<"ok" | "attention" | "unavailable", string> = {
  ok: "var(--ok)",
  attention: "var(--warn)",
  unavailable: "var(--danger)",
};

const KIND_ICON: Record<PrimitiveKind, typeof ShieldCheck> = {
  mandate: ScrollText,
  policy: ShieldCheck,
  vault: KeyRound,
  hardLimits: CreditCard,
  audit: FileCheck2,
  identity: BadgeCheck,
};

const KIND_SECTION: Record<PrimitiveKind, Section> = {
  mandate: "mandate",
  policy: "policy",
  vault: "vault",
  hardLimits: "hardLimits",
  audit: "audit",
  identity: "identity",
};

const OverviewView = ({
  overview,
  onOpen,
}: {
  overview: GovernanceOverview;
  onOpen: (s: Section) => void;
}) => (
  <>
    <SectionTitle
      title="Governance overview"
      subtitle="What this agent may do, what it has done, and how it is held to it."
    />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {overview.primitives.map((p) => {
        const Icon = KIND_ICON[p.kind];
        return (
          <button
            key={p.kind}
            onClick={() => onOpen(KIND_SECTION[p.kind])}
            className="flex flex-col gap-2 rounded-[var(--radius-lg)] border px-4 py-4 text-left transition-colors cursor-pointer hover:bg-[var(--surface-2)]"
            style={{ borderColor: "var(--line)" }}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <Icon className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.75} aria-hidden />
                {p.label}
              </span>
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[p.status] }} aria-hidden />
            </div>
            <span className="text-sm text-[var(--muted)]">{p.detail}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--subtle)]">
              Open <ArrowUpRight className="h-3 w-3" aria-hidden />
            </span>
          </button>
        );
      })}
    </div>
    <div className="mt-6 flex flex-col gap-2">
      <Statement text={overview.statements.agentUntrusted} />
      <Statement text={overview.statements.operatorTrustAnchor} />
    </div>
  </>
);

const MANDATE_STATUS_COLOR: Record<MandateView["status"], string> = {
  active: "var(--ok)",
  revoked: "var(--danger)",
  expired: "var(--subtle)",
  "not-yet-active": "var(--warn)",
};

const MandatesView = ({
  mandates,
  busy,
  onRevoke,
}: {
  mandates: readonly MandateView[];
  busy: boolean;
  onRevoke: (mandateId: string) => void;
}) => (
  <>
    <SectionTitle title="Mandates" subtitle="Operator-signed authority, root to leaf. Read and revoke only." />
    {mandates.length === 0 ? (
      <Empty text="No mandates issued." />
    ) : (
      <div className="flex flex-col gap-3">
        {mandates.map((m) => (
          <div key={m.id} className="rounded-[var(--radius-lg)] border px-4 py-3.5" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="mono text-xs text-[var(--subtle)]">#{m.chainIndex}</span>
                <span className="text-sm font-semibold capitalize text-[var(--text)]">{m.capability}</span>
                <span
                  className="rounded-[var(--radius-full)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: MANDATE_STATUS_COLOR[m.status], background: "var(--surface-2)" }}
                >
                  {m.status}
                </span>
              </div>
              {m.status === "active" && (
                <button
                  disabled={busy}
                  onClick={() => onRevoke(m.id)}
                  className="rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--danger-dim)", color: "var(--danger)" }}
                >
                  Revoke
                </button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[var(--muted)] sm:grid-cols-3">
              <span>Operator-signed · {shortDid(m.issuerOperatorDid)}</span>
              <span>Trust: {m.trustDomain}</span>
              {m.parentId !== null && <span>Parent: {m.parentId}</span>}
              {m.stepUpThresholdMinor !== null && <span>Step-up ≥ {(m.stepUpThresholdMinor / 100).toFixed(2)}</span>}
              {m.paySpend !== null && (
                <span className="col-span-2 sm:col-span-3 text-[var(--text)]">
                  Spend this period: {money(m.paySpend.periodSpentMinor, m.paySpend.currency)} /{" "}
                  {money(m.paySpend.limitPerPeriodMinor, m.paySpend.currency)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </>
);

const VERDICT_META: Record<Verdict, { label: string; color: string; bg: string }> = {
  ALLOW: { label: "Allowed", color: "var(--ok)", bg: "var(--ok-dim)" },
  ALLOW_WITH_NOTICE: { label: "Allowed · notice", color: "var(--text)", bg: "var(--surface-2)" },
  STEP_UP: { label: "Step-up", color: "var(--warn)", bg: "var(--warn-dim)" },
  DENY: { label: "Denied", color: "var(--danger)", bg: "var(--danger-dim)" },
};

const VERDICTS: readonly Verdict[] = ["ALLOW", "ALLOW_WITH_NOTICE", "STEP_UP", "DENY"];

const PolicyFeed = ({
  decisions,
  statement,
  filter,
  onFilter,
}: {
  decisions: readonly PolicyDecisionView[];
  statement: string;
  filter: PolicyFilter;
  onFilter: (f: PolicyFilter) => void;
}) => (
  <>
    <SectionTitle title="Policy decisions" subtitle="Every verdict the deterministic engine reached, newest first." />
    <div className="mb-4"><Statement text={statement} /></div>
    <div className="mb-4 flex flex-wrap gap-1.5">
      <button
        onClick={() => onFilter({})}
        className="rounded-[var(--radius-full)] px-3 py-1 text-xs font-medium cursor-pointer"
        style={{
          background: filter.verdict === undefined ? "var(--surface-3)" : "transparent",
          color: filter.verdict === undefined ? "var(--text)" : "var(--muted)",
        }}
      >
        All
      </button>
      {VERDICTS.map((v) => (
        <button
          key={v}
          onClick={() => onFilter({ verdict: v })}
          className="rounded-[var(--radius-full)] px-3 py-1 text-xs font-medium cursor-pointer"
          style={{
            background: filter.verdict === v ? VERDICT_META[v].bg : "transparent",
            color: filter.verdict === v ? VERDICT_META[v].color : "var(--muted)",
          }}
        >
          {VERDICT_META[v].label}
        </button>
      ))}
    </div>
    {decisions.length === 0 ? (
      <Empty text="No decisions match this filter." />
    ) : (
      <div className="flex flex-col gap-2">
        {decisions.map((d) => {
          const meta = VERDICT_META[d.verdict];
          const isDeny = d.verdict === "DENY";
          return (
            <div
              key={d.seq}
              className="flex items-start gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5"
              style={{ borderColor: isDeny ? "var(--danger)" : "var(--line)", background: isDeny ? "var(--danger-dim)" : "transparent" }}
            >
              <span
                className="mt-0.5 rounded-[var(--radius-full)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: meta.color, background: meta.bg }}
              >
                {meta.label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text)]">
                  <span className="capitalize">{d.capability ?? "—"}</span> · {d.action}
                </p>
                <p className="text-xs text-[var(--muted)]">{d.reason}</p>
                {d.pendingApprovalId !== null && (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--warn)" }}>
                    Awaiting approval → {d.pendingApprovalId}
                  </p>
                )}
              </div>
              <span className="mono shrink-0 text-[11px] text-[var(--subtle)]">{formatClock(d.decidedAt)}</span>
            </div>
          );
        })}
      </div>
    )}
  </>
);

const HardLimitsView = ({
  cards,
  statement,
  busy,
  onSetCap,
}: {
  cards: readonly VirtualCardView[];
  statement: string;
  busy: boolean;
  onSetCap: (p: { handle: string; field: "perTransaction" | "perPeriod"; requestedMinor: number }) => Promise<string | null>;
}) => {
  const [edit, setEdit] = useState<{ handle: string; field: "perTransaction" | "perPeriod"; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <SectionTitle title="Virtual cards" subtitle="Issuer-enforced spend caps. Card numbers never leave the issuer." />
      <div className="mb-4"><Statement text={statement} /></div>
      {cards.length === 0 ? (
        <Empty text="None — no virtual cards issued for this agent." />
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map((c) => (
            <div key={c.handle} className="rounded-[var(--radius-lg)] border px-4 py-3.5" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between">
                <span className="mono text-sm text-[var(--text)]">•••• {c.last4}</span>
                <span className="text-xs text-[var(--muted)]">
                  {money(c.periodSpentMinor, c.currency)} / {money(c.perPeriodMinor, c.currency)} · {c.periodDays}d
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                <span>Per-txn cap: {money(c.perTransactionMinor, c.currency)}</span>
                <span>Per-period cap: {money(c.perPeriodMinor, c.currency)}</span>
                <span className="col-span-2">
                  Categories: {c.allowedCategories.length === 0 ? "none" : c.allowedCategories.join(", ")}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                {(["perTransaction", "perPeriod"] as const).map((field) => (
                  <button
                    key={field}
                    onClick={() => { setError(null); setEdit({ handle: c.handle, field, value: "" }); }}
                    className="rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                    style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                  >
                    Set {field === "perTransaction" ? "per-txn" : "per-period"} cap
                  </button>
                ))}
              </div>
              {edit !== null && edit.handle === c.handle && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={edit.value}
                    onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                    placeholder="amount (minor units)"
                    inputMode="numeric"
                    className="w-44 rounded-[var(--radius-md)] border bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)] outline-none"
                    style={{ borderColor: "var(--line)" }}
                  />
                  <button
                    disabled={busy}
                    onClick={async () => {
                      const requestedMinor = Number.parseInt(edit.value, 10);
                      const reason = await onSetCap({ handle: edit.handle, field: edit.field, requestedMinor });
                      if (reason === null) { setEdit(null); setError(null); } else setError(reason);
                    }}
                    className="rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
                    style={{ background: "var(--text)", color: "var(--bg)" }}
                  >
                    Apply
                  </button>
                  <button onClick={() => { setEdit(null); setError(null); }} className="text-xs text-[var(--subtle)] cursor-pointer">Cancel</button>
                </div>
              )}
              {error !== null && edit?.handle === c.handle && (
                <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>{error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const VaultView = ({ entries, statement }: { entries: readonly VaultEntryView[]; statement: string }) => (
  <>
    <SectionTitle title="Vault" subtitle="Credential handles only — the agent never sees a secret value." />
    <div className="mb-4"><Statement text={statement} /></div>
    {entries.length === 0 ? (
      <Empty text="No stored credentials." />
    ) : (
      <div className="flex flex-col gap-2">
        {entries.map((v) => (
          <div key={v.handle} className="flex items-center justify-between rounded-[var(--radius-md)] border px-3.5 py-2.5" style={{ borderColor: "var(--line)" }}>
            <div className="min-w-0">
              <p className="text-sm text-[var(--text)]">{v.label}</p>
              <p className="mono truncate text-xs text-[var(--subtle)]">{v.handle} · [secret]</p>
            </div>
            <div className="shrink-0 text-right text-xs text-[var(--muted)]">
              <p>{v.lastUsedAt === null ? "never used" : `used ${formatClock(v.lastUsedAt)}`}</p>
              <p className="text-[var(--subtle)]">{v.grantingMandateId === null ? "no granting mandate" : v.grantingMandateId}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
);

const WalletView = ({ accounts }: { accounts: readonly ServiceAccountView[] }) => (
  <>
    <SectionTitle title="Wallet" subtitle="Sites and logins the agent has recorded — credential values are never stored here." />
    {accounts.length === 0 ? (
      <Empty text="No saved accounts yet. The agent will add entries here when it signs up or logs in to a site." />
    ) : (
      <div className="flex flex-col gap-2">
        {accounts.map((acc) => (
          <div key={acc.service} className="flex items-center justify-between rounded-[var(--radius-md)] border px-3.5 py-2.5" style={{ borderColor: "var(--line)" }}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text)]">{acc.service}</p>
              <p className="truncate text-xs text-[var(--subtle)]">{acc.loginEmail}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-[var(--muted)]">
              <p>{acc.ownership === "agent-owned" ? "agent-owned" : "user-provided"}</p>
              <p className="text-[var(--subtle)]"
                style={{ color: acc.status === "active" ? "var(--ok)" : acc.status === "pending" ? "var(--warn)" : "var(--muted)" }}>
                {acc.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
);

const AuditViewPanel = ({ audit, onExport }: { audit: AuditView; onExport: () => void }) => (
  <>
    <SectionTitle title="Audit ledger" subtitle="Hash-chained, signed record of everything the agent did." />
    <div
      className="mb-4 flex items-center justify-between rounded-[var(--radius-md)] border px-3.5 py-2.5"
      style={{ borderColor: audit.verified ? "var(--ok)" : "var(--danger)", background: audit.verified ? "var(--ok-dim)" : "var(--danger-dim)" }}
    >
      <span className="text-sm font-medium" style={{ color: audit.verified ? "var(--ok)" : "var(--danger)" }}>
        {audit.empty ? "Empty ledger — nothing recorded yet" : audit.verified ? "Chain verified" : `Tampered — broken at #${String(audit.brokenAtSeq)}`}
      </span>
      <button onClick={onExport} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold cursor-pointer" style={{ background: "var(--surface-3)", color: "var(--text)" }}>
        <Download className="h-3.5 w-3.5" aria-hidden /> Export
      </button>
    </div>
    {audit.empty ? (
      <Empty text="No audit entries." />
    ) : (
      <div className="flex flex-col gap-1.5">
        {audit.entries.map((e) => (
          <div
            key={e.seq}
            className="flex items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2 text-xs"
            style={{ borderColor: audit.brokenAtSeq !== null && e.seq >= audit.brokenAtSeq ? "var(--danger)" : "var(--line)" }}
          >
            <span className="mono w-8 text-[var(--subtle)]">#{e.seq}</span>
            <span className="w-32 text-[var(--muted)]">{e.eventType}</span>
            <span className="flex-1 text-[var(--text)]">{e.action ?? "—"}</span>
            <span className="mono truncate text-[var(--subtle)]" style={{ maxWidth: "8rem" }}>{e.entryHash.slice(0, 12)}</span>
            <span className="mono text-[var(--subtle)]">{formatClock(e.ts)}</span>
          </div>
        ))}
      </div>
    )}
  </>
);

const IdentityViewPanel = ({ identity, statement }: { identity: IdentityView; statement: string }) => (
  <>
    <SectionTitle title="Passport" subtitle="The agent's public identity and its operator trust anchor." />
    <div className="mb-4"><Statement text={statement} /></div>
    {identity.status !== "active" && (
      <div className="mb-4 rounded-[var(--radius-md)] border px-3.5 py-2.5 text-sm" style={{ borderColor: "var(--danger)", background: "var(--danger-dim)", color: "var(--danger)" }}>
        Passport {identity.status} — every action by this agent is denied.
      </div>
    )}
    <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border px-4 py-4 text-sm" style={{ borderColor: "var(--line)" }}>
      <div className="flex justify-between"><span className="text-[var(--subtle)]">Display name</span><span className="text-[var(--text)]">{identity.displayName}</span></div>
      <div className="flex justify-between"><span className="text-[var(--subtle)]">Agent DID</span><span className="mono text-[var(--text)]">{shortDid(identity.passportId)}</span></div>
      <div className="flex justify-between"><span className="text-[var(--subtle)]">Operator DID</span><span className="mono text-[var(--text)]">{shortDid(identity.operatorDid)}</span></div>
      <div className="flex justify-between"><span className="text-[var(--subtle)]">Status</span><span className="capitalize text-[var(--text)]">{identity.status}</span></div>
    </div>
  </>
);

const LIFECYCLE_META: Record<ActivityResponse["state"]["status"], { label: string; color: string; bg: string }> = {
  idle: { label: "Idle", color: "var(--subtle)", bg: "var(--surface-2)" },
  active: { label: "Active", color: "var(--ok)", bg: "var(--ok-dim)" },
  "waiting-on-input": { label: "Waiting on input", color: "var(--warn)", bg: "var(--warn-dim)" },
  frozen: { label: "Halted", color: "var(--danger)", bg: "var(--danger-dim)" },
};

const LiveActivityView = ({ activity, stale }: { activity: ActivityResponse | null; stale: boolean }) => {
  if (activity === null) return <Empty text="Live activity unavailable." />;
  const { state, timeline } = activity;
  const meta = LIFECYCLE_META[state.status];
  return (
    <>
      <SectionTitle title="Live activity" subtitle="What the agent is doing right now, from trusted-server signals only." />
      {stale && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border px-3.5 py-2.5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-dim)", color: "var(--warn)" }}>
          <AlertTriangle className="h-4 w-4" aria-hidden /> Not live — showing the last known state.
        </div>
      )}
      <div className="rounded-[var(--radius-lg)] border px-4 py-4" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center justify-between">
          <span className="rounded-[var(--radius-full)] px-3 py-1 text-sm font-semibold" style={{ color: meta.color, background: meta.bg }}>
            {meta.label}
          </span>
          <span className="mono text-xs text-[var(--subtle)]">updated {formatClock(state.lastUpdatedAt)}</span>
        </div>
        {state.mostRecentAction !== null && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Most recent:{" "}
            <span className="text-[var(--text)] capitalize">{state.mostRecentAction.capability ?? "action"}</span>
            {state.mostRecentAction.target !== null && <> → {state.mostRecentAction.target}</>}{" "}
            <span className="mono text-xs text-[var(--subtle)]">{formatClock(state.mostRecentAction.timestamp)}</span>
          </p>
        )}
        {state.currentWait !== null && (
          <p className="mt-2 text-sm" style={{ color: "var(--warn)" }}>
            {state.currentWait.description}
            {state.currentWait.pendingApprovalId !== null && <> → {state.currentWait.pendingApprovalId}</>}
          </p>
        )}
      </div>
      <h3 className="mb-2 mt-6 text-sm font-semibold text-[var(--text)]">Activity timeline</h3>
      {timeline.length === 0 ? (
        <Empty text="No activity yet." />
      ) : (
        <ol className="flex flex-col gap-1.5">
          {timeline.map((t) => (
            <li key={t.seq} className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-xs" style={{ background: "var(--surface-2)" }}>
              <span className="mono w-7 text-[var(--subtle)]">#{t.seq}</span>
              <span className="flex-1 text-[var(--text)]">{t.summary}</span>
              <span className="mono text-[var(--subtle)]">{formatClock(t.ts)}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
};

const STALE_MS = 30_000;

/**
 * The operator Governance Console (R1, R2–R7, R11). Polls the read model on the
 * same 2s cadence as the approval inbox; an unavailable read surfaces an error
 * state that renders NO governance values (R1.6, R9.7).
 */
export const GovernanceConsole = ({
  api,
  agents,
  busy,
  onFreeze,
  onUnfreeze,
}: {
  api: ApprovalApi;
  agents: readonly AgentSummary[];
  busy: boolean;
  onFreeze: (params: { agentDid: string; reason: string }) => void;
  onUnfreeze: (params: { agentDid: string }) => void;
}) => {
  const [section, setSection] = useState<Section>("overview");
  const [overview, setOverview] = useState<GovernanceOverview | null>(null);
  const [mandates, setMandates] = useState<readonly MandateView[]>([]);
  const [policy, setPolicy] = useState<readonly PolicyDecisionView[]>([]);
  const [cards, setCards] = useState<readonly VirtualCardView[]>([]);
  const [vault, setVault] = useState<readonly VaultEntryView[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<readonly ServiceAccountView[]>([]);
  const [audit, setAudit] = useState<AuditView | null>(null);
  const [identity, setIdentity] = useState<IdentityView | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [policyFilter, setPolicyFilter] = useState<PolicyFilter>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityOk = useRef<number>(Date.now());
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const agent = agents[0];

  const refresh = useCallback(async () => {
    try {
      const [ov, md, pol, cd, vt, wl, au, id, act] = await Promise.all([
        api.getOverview(),
        api.getMandates(),
        api.getPolicy(policyFilter),
        api.getCards(),
        api.getVault(),
        api.getWallet(),
        api.getAudit(),
        api.getIdentity(),
        api.getActivity(),
      ]);
      setOverview(ov);
      setMandates(md);
      setPolicy(pol);
      setCards(cd);
      setVault(vt);
      setWalletAccounts(wl);
      setAudit(au);
      setIdentity(id);
      setActivity(act);
      lastActivityOk.current = Date.now();
      setError(null);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "governance unavailable");
      setLoading(false);
    }
  }, [api, policyFilter]);

  useEffect(() => {
    void refresh();
    const handle = setInterval(() => {
      setNowMs(Date.now());
      void refresh();
    }, 2000);
    return () => clearInterval(handle);
  }, [refresh]);

  const stale = useMemo(() => nowMs - lastActivityOk.current > STALE_MS, [nowMs]);

  const revoke = useCallback(
    async (mandateId: string) => {
      await api.revokeMandate({ mandateId });
      await refresh();
    },
    [api, refresh],
  );

  const setCap = useCallback(
    async (p: { handle: string; field: "perTransaction" | "perPeriod"; requestedMinor: number }): Promise<string | null> => {
      const result = await api.setCardLimits(p);
      await refresh();
      return result.ok ? null : result.reason;
    },
    [api, refresh],
  );

  const exportAudit = useCallback(async () => {
    const data = await api.exportAudit();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agentgrid-audit-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [api]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-8 w-2/3 rounded-[var(--radius-md)]" style={{ background: "var(--surface-2)" }} />
        <div className="h-4 w-1/2 rounded-[var(--radius-md)]" style={{ background: "var(--surface-2)" }} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-[var(--radius-lg)]" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      </div>
    );
  }

  // Unavailable error state: render NO governance values (R1.6, R9.7).
  if (error !== null && overview === null) {
    return (
      <div className="rounded-[var(--radius-lg)] border py-16 text-center" style={{ borderColor: "var(--danger)" }}>
        <AlertTriangle className="mx-auto h-6 w-6" style={{ color: "var(--danger)" }} aria-hidden />
        <p className="mt-3 text-sm font-medium text-[var(--text)]">Governance unavailable</p>
        <p className="mt-1 text-xs text-[var(--subtle)]">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-nav across the primitives + live activity */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        <button
          onClick={() => setSection("overview")}
          className="rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium cursor-pointer"
          style={{ background: section === "overview" ? "var(--surface-3)" : "transparent", color: section === "overview" ? "var(--text)" : "var(--muted)" }}
        >
          Overview
        </button>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium cursor-pointer"
            style={{ background: section === s.id ? "var(--surface-3)" : "transparent", color: section === s.id ? "var(--text)" : "var(--muted)" }}
          >
            <s.icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {s.label}
          </button>
        ))}
      </div>

      {/* Always-available freeze control (R8.1). */}
      <FreezeControl agent={agent} busy={busy} onFreeze={onFreeze} onUnfreeze={onUnfreeze} />

      {error !== null && (
        <div className="mb-4 rounded-[var(--radius-md)] border px-3.5 py-2 text-xs" style={{ borderColor: "var(--warn)", color: "var(--warn)" }}>
          Last refresh failed: {error}. Showing the last known model.
        </div>
      )}

      {section === "overview" && overview !== null && <OverviewView overview={overview} onOpen={setSection} />}
      {section === "mandate" && <MandatesView mandates={mandates} busy={busy} onRevoke={revoke} />}
      {section === "policy" && overview !== null && (
        <PolicyFeed decisions={policy} statement={overview.statements.policyDeterministic} filter={policyFilter} onFilter={setPolicyFilter} />
      )}
      {section === "hardLimits" && overview !== null && (
        <HardLimitsView cards={cards} statement={overview.statements.issuerEnforcedCaps} busy={busy} onSetCap={setCap} />
      )}
      {section === "vault" && overview !== null && <VaultView entries={vault} statement={overview.statements.vaultNeverReachesAgent} />}
      {section === "wallet" && <WalletView accounts={walletAccounts} />}
      {section === "audit" && audit !== null && <AuditViewPanel audit={audit} onExport={exportAudit} />}
      {section === "identity" && identity !== null && overview !== null && (
        <IdentityViewPanel identity={identity} statement={overview.statements.operatorTrustAnchor} />
      )}
      {section === "activity" && <LiveActivityView activity={activity} stale={stale} />}
    </div>
  );
};
