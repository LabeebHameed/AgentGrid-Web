/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { api, isHttpApi, setApiAgentDid } from "../lib/client";
import type {
  ActivityEntry,
  AgentSummary,
  ApprovalRequest,
  Capability,
  DeviceEntry,
  MandateView,
  NotificationPreferences,
  ProviderStatus,
} from "../lib/types";
import { riskOf } from "../lib/types";
import type { MandateSpecInput } from "../lib/api";

// ============================================================
// Types — same shape the premium pages were built against. Every field below
// is either a real server value or an explicitly-documented derivation of one;
// see the mapping functions further down for exactly how. Where the mock UI
// assumed a capability the backend does not have, the mutator is kept (so
// pages don't need to change) but resolves to a "not connected yet" toast
// instead of silently faking success (see the toast copy for what's not
// wired up yet — a manual add/remove, a credential form, etc).
// ============================================================
export type Verdict = "ALLOW" | "STEP_UP" | "NOTICE" | "DENY";
export type Risk = "low" | "medium" | "high";

export interface Mandate {
  id: string;
  label: string;
  detail: string;
  active: boolean;
}

export type AgentStatus = "active" | "paused" | "revoked" | "killed" | "connecting";

export interface Agent {
  id: string; // the agent DID (or `pending:<token>` while still connecting)
  name: string;
  did: string;
  status: AgentStatus;
  enforcement: boolean; // !frozen
  spendUsed: number; // sum of this agent's cards' periodSpentMinor, dollars
  spendLimit: number; // sum of this agent's cards' perPeriodMinor, dollars
  tasks: number; // count of this agent's audit-ledger entries (proxy for "tasks")
  mandates: Mandate[];
}

export interface Approval {
  id: string;
  agent: string; // resolved display name (falls back to a truncated DID)
  title: string;
  detail: string;
  amount?: number;
  merchant?: string;
  category: string;
  risk: Risk;
  kind: Verdict;
  createdAt: number;
  imageUrl?: string;
}

export interface LedgerEntry {
  seq: number;
  eventType: "policy" | "action" | "approval" | "cred_use" | "comms";
  action: string;
  verdict: Verdict | "OK" | "-";
  ts: number;
  hash: string;
  agent: string;
}

export interface Provider {
  id: string;
  name: string;
  desc: string;
  connected: boolean;
  category: "payments" | "comms" | "compute" | "data";
  detail: string | null;
  envKey: string;
  // Credentials are never populated for real — providers are wired via operator
  // env vars server-side, not a client-submitted credential form (see envKey).
  credentials?: Record<string, string>;
  connectedAt?: number;
}

export interface Device {
  id: string; // the enrollment token
  name: string;
  kind: "laptop" | "phone" | "security-key";
  lastSeen: number;
  current: boolean;
  credentialId?: string;
  pairedAt?: number;
}

export type NotifyEvent = "approval" | "freeze" | "mandateExpiring" | "licenseIssue";
export type NotifyChannel = "email" | "sms" | "push" | "webhook";

export interface Settings {
  enforcement: boolean; // aggregate: true if NO agent is currently frozen
  licenseKey: string;
  apiUrl: string;
  stepUpThreshold: number; // dollars, from the agent's "pay" mandate config
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
  notifyWebhook: boolean;
  notifyRouting: Record<NotifyEvent, Record<NotifyChannel, boolean>>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTz?: string;
}

export type VaultItemType = "card" | "login" | "apikey";

export interface VaultCard { brand: string; network?: string; holder: string; last4: string; expiry?: string; cvv?: string }
export interface VaultLogin { site: string; username: string; password?: string }
export interface VaultApiKey { service: string; key: string }

export interface VaultItem {
  id: string; // vault entry handle
  type: VaultItemType;
  name: string; // label
  addedAt: number;
  namespace?: string;
  trustDomain?: string;
  // The vault never exposes secret material to the operator console, so these
  // structured views are only ever populated by SeedApi's demo data.
  card?: VaultCard;
  login?: VaultLogin;
  apiKey?: VaultApiKey;
}

export type TxKind = "topup" | "send";
export type TxStatus = "ok" | "pending";

export interface Transaction {
  id: string;
  kind: TxKind;
  status: TxStatus;
  amount: number;
  at: number;
  label?: string;
  source?: string;
  sourceLabel?: string;
}

export interface Toast {
  id: number;
  msg: string;
  tone: "ok" | "bad" | "info" | "warn";
}

const DEFAULT_NOTIFY_ROUTING: Record<NotifyEvent, Record<NotifyChannel, boolean>> = {
  approval: { email: true, sms: false, push: true, webhook: false },
  freeze: { email: true, sms: true, push: true, webhook: false },
  mandateExpiring: { email: true, sms: false, push: false, webhook: false },
  licenseIssue: { email: true, sms: false, push: false, webhook: false },
};

// ============================================================
// Mapping helpers — real server shape -> the premium UI's shape.
// ============================================================
const money = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortDid = (did: string): string => (did.length > 18 ? `${did.slice(0, 14)}…${did.slice(-4)}` : did);

const hashAt = (seed: number) =>
  "0x" + (((seed * 2654435761) >>> 0).toString(16) + "000000").slice(0, 6) + "…";

const mapAgentStatus = (agent: AgentSummary, connecting: boolean): AgentStatus => {
  if (connecting) return "connecting";
  return agent.status.frozen ? "killed" : "active";
};

const mapMandate = (m: MandateView): Mandate => ({
  id: m.id,
  label: m.capability,
  detail: describeMandateScope(m),
  active: m.status === "active",
});

const describeMandateScope = (m: MandateView): string => {
  const scope = m.scope as Record<string, unknown>;
  if (m.capability === "pay" && m.paySpend !== null) {
    return `≤ ${money(m.paySpend.limitPerPeriodMinor / 100)} / ${m.paySpend.periodDays}d · ${money(m.paySpend.limitPerTransactionMinor / 100)} per tx`;
  }
  if (m.capability === "browse") {
    const domains = Array.isArray(scope["allowedDomains"]) ? (scope["allowedDomains"] as string[]).join(", ") : "any domain";
    return `browse: ${domains}`;
  }
  if (m.capability === "comms") return "comms: email + sms";
  if (m.capability === "deploy") return "deploy: agentgrid-cloud";
  return m.status;
};

const approvalTitle = (r: ApprovalRequest): string => {
  if (r.capability === "pay" && r.amountMinor !== null) {
    return `Pay ${money(r.amountMinor / 100)}${r.merchant !== null ? ` to ${r.merchant}` : ""}`;
  }
  if (r.action.toLowerCase().includes("captcha")) return "Solve CAPTCHA";
  if (r.capability === "deploy") return `Deploy · ${r.action}`;
  if (r.capability === "vault") return `Vault: ${r.action}`;
  return r.action;
};

const approvalDetail = (r: ApprovalRequest): string =>
  `${r.rationale}${r.targetService !== null ? ` · ${r.targetService}` : ""}`;

const mapApproval = (r: ApprovalRequest, agentName: string): Approval => ({
  id: r.id,
  agent: agentName,
  title: approvalTitle(r),
  detail: approvalDetail(r),
  amount: r.amountMinor !== null ? r.amountMinor / 100 : undefined,
  merchant: r.merchant ?? undefined,
  category: r.capability,
  risk: riskOf(r) === "high" ? "high" : "medium",
  kind: riskOf(r) === "high" ? "STEP_UP" : "NOTICE",
  createdAt: Date.parse(r.createdAt),
  imageUrl: r.screenshot !== undefined ? `data:image/jpeg;base64,${r.screenshot}` : undefined,
});

const activityEventType = (e: ActivityEntry): LedgerEntry["eventType"] => {
  if (e.eventType === "policy_decision") return "policy";
  if (e.eventType === "approval") return "approval";
  return "action";
};

const activityVerdict = (e: ActivityEntry): LedgerEntry["verdict"] => {
  const payload = e.payload as Record<string, unknown>;
  const v = payload["verdict"];
  if (v === "ALLOW" || v === "ALLOW_WITH_NOTICE") return "ALLOW";
  if (v === "STEP_UP") return "STEP_UP";
  if (v === "DENY") return "DENY";
  if (e.eventType === "approval") {
    return payload["decision"] === "approved" ? "ALLOW" : "DENY";
  }
  return "OK";
};

const activityAction = (e: ActivityEntry): string => {
  const payload = e.payload as Record<string, unknown>;
  const action = typeof payload["action"] === "string" ? (payload["action"] as string) : e.eventType;
  return action;
};

const mapLedgerEntry = (e: ActivityEntry, agentName: string): LedgerEntry => ({
  seq: e.seq,
  eventType: activityEventType(e),
  action: activityAction(e),
  verdict: activityVerdict(e),
  ts: Date.parse(e.ts),
  hash: e.entryHash,
  agent: agentName,
});

const PROVIDER_CATEGORY: Record<ProviderStatus["kind"], Provider["category"]> = {
  browser: "compute",
  email: "comms",
  sms: "comms",
  cloud: "compute",
  payments: "payments",
};

const mapProvider = (p: ProviderStatus): Provider => ({
  id: p.kind,
  name: p.label,
  desc: p.description,
  connected: p.connected,
  category: PROVIDER_CATEGORY[p.kind],
  detail: p.detail,
  envKey: p.envKey,
});

const mapDevice = (d: DeviceEntry): Device => ({
  id: d.token,
  name: `Paired device · ${d.token.slice(0, 8)}…`,
  kind: "phone",
  lastSeen: Date.parse(d.enrolledAt),
  current: false,
  pairedAt: Date.parse(d.enrolledAt),
});

// ============================================================
// Store
// ============================================================
interface StoreShape {
  agents: Agent[];
  approvals: Approval[];
  ledger: LedgerEntry[];
  providers: Provider[];
  devices: Device[];
  settings: Settings;
  toasts: Toast[];
  activeAgentId: string | null;
  loading: boolean;
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
  setActiveAgent: (id: string | null) => void;
  resolveApproval: (id: string, decision: "approve" | "deny") => void;
  toggleAgentEnforcement: (id: string) => void;
  setAgentStatus: (id: string, status: Agent["status"]) => void;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, patch: Partial<Omit<Agent, "id" | "did" | "spendUsed" | "tasks">>) => void;
  toggleMandate: (agentId: string, mandateId: string) => void;
  removeMandate: (agentId: string, mandateId: string) => void;
  addMandate: (agentId: string, label: string, detail: string) => void;
  toggleProvider: (id: string) => void;
  connectProvider: (id: string, credentials: Record<string, string>) => void;
  disconnectProvider: (id: string) => void;
  revokeDevice: (id: string) => void;
  addDevice: (name: string, kind: Device["kind"], opts?: { credentialId?: string; pairedAt?: number }) => void;
  updateSettings: (patch: Partial<Settings>, reason?: string) => void;
  recordSettingChange: (key: keyof Settings, from: unknown, to: unknown, reason?: string) => void;
  toast: (msg: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  vaultItems: VaultItem[];
  transactions: Transaction[];
  walletBalance: number;
  removeVaultItem: (id: string) => void;
  addVaultItem: (item: Omit<VaultItem, "id" | "addedAt">) => void;
  topUp: (amount: number, label: string, source?: string) => void;
  getBalance: () => number;
  bulkSpawn: (opts: {
    namePrefix: string;
    count: number;
    capabilities: string[];
    spendCap: number;
    mandateLabels: string[];
  }) => void;
  refresh: () => Promise<void>;
  enrollQrPayload: string | null;
}

const StoreContext = createContext<StoreShape | null>(null);

/** Pending "connecting" agents, persisted so a reload doesn't lose them. */
interface PendingAgent { displayName: string; issuedAt: number; token: string }
const PENDING_KEY = "aeg-pending-agents";
const readPending = (): PendingAgent[] => {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingAgent[]) : [];
  } catch {
    return [];
  }
};
const writePending = (list: PendingAgent[]) => {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [enrollQrPayload, setEnrollQrPayload] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(1);
  const agentNamesRef = useRef<Map<string, string>>(new Map());

  const [settings, setSettings] = useState<Settings>(() => {
    const defaults: Settings = {
      enforcement: true,
      licenseKey: "",
      apiUrl: (import.meta.env.VITE_AGENTGRID_API as string | undefined) ?? "",
      stepUpThreshold: 200,
      notifyEmail: true,
      notifySms: true,
      notifyPush: false,
      notifyWebhook: false,
      notifyRouting: DEFAULT_NOTIFY_ROUTING,
      quietHoursStart: undefined,
      quietHoursEnd: undefined,
      quietHoursTz: undefined,
    };
    return defaults;
  });

  const toast: StoreShape["toast"] = useCallback((msg, tone = "info") => {
    const id = toastIdRef.current++;
    setToasts((t) => [...t, { id, msg, tone }].slice(-3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const dismissToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  /** Anything the console can't wire to a real endpoint yet (see plan's Future Features). */
  const notConnected = useCallback(
    (what: string) => toast(`${what} — not connected yet`, "info"),
    [toast],
  );

  const setActiveAgent: StoreShape["setActiveAgent"] = (id) => {
    setActiveAgentId(id);
    if (id !== null && !id.startsWith("pending:")) {
      void api.setActiveAgent(id);
    }
  };

  // ── Core refresh: agents (+ per-agent mandates/cards), pending approvals,
  // the global activity/ledger feed, providers, and devices. ──────────────
  const refresh = useCallback(async () => {
    try {
      const [rawAgents, pending, activity, providersView, devicesView] = await Promise.all([
        api.listAgents(),
        api.listPending(),
        api.listActivity(),
        api.getProviders(),
        api.getDevices(),
      ]);

      agentNamesRef.current = new Map(rawAgents.map((a) => [a.did, a.displayName]));

      const pendingList = readPending().filter(
        (p) => !rawAgents.some((a) => a.displayName === p.displayName),
      );
      writePending(pendingList);

      // Per-agent mandates/cards — sequential so the single stateful HttpApi
      // #agentDid field is never read while a different agent's request is in
      // flight. Small consoles (tens of agents, not thousands) make this fine.
      const mapped: Agent[] = [];
      for (const a of rawAgents) {
        if (isHttpApi()) {
          setApiAgentDid(a.did);
        } else {
          await api.setActiveAgent(a.did);
        }
        let mandates: MandateView[] = [];
        let spendUsed = 0;
        let spendLimit = 0;
        try {
          mandates = [...(await api.getMandates())];
          const cards = await api.getCards();
          for (const c of cards) {
            spendUsed += c.periodSpentMinor / 100;
            spendLimit += c.perPeriodMinor / 100;
          }
        } catch {
          /* governance not reachable for this agent yet (e.g. mid-enrollment) */
        }
        mapped.push({
          id: a.did,
          name: a.displayName,
          did: a.did,
          status: mapAgentStatus(a, false),
          enforcement: !a.status.frozen,
          spendUsed,
          spendLimit,
          tasks: 0,
          mandates: mandates.map(mapMandate),
        });
      }
      for (const p of pendingList) {
        mapped.push({
          id: `pending:${p.token}`,
          name: p.displayName,
          did: `pending:${p.token}`,
          status: "connecting",
          enforcement: true,
          spendUsed: 0,
          spendLimit: 0,
          tasks: 0,
          mandates: [],
        });
      }
      setAgents(mapped);

      if (activeAgentId === null && mapped.length > 0) {
        setActiveAgentId(mapped[0]!.id);
      }

      setApprovals(
        pending.map((r) => mapApproval(r, agentNamesRef.current.get(r.agent) ?? shortDid(r.agent))),
      );

      const taskCounts = new Map<string, number>();
      for (const e of activity) taskCounts.set(e.agentDid, (taskCounts.get(e.agentDid) ?? 0) + 1);
      setAgents((cur) => cur.map((a) => ({ ...a, tasks: taskCounts.get(a.did) ?? a.tasks })));

      setLedger(
        activity
          .map((e) => mapLedgerEntry(e, agentNamesRef.current.get(e.agentDid) ?? shortDid(e.agentDid)))
          .sort((a, b) => a.seq - b.seq)
          .slice(-200),
      );

      setProviders(providersView.providers.map(mapProvider));
      setDevices(devicesView.devices.map(mapDevice));
      setEnrollQrPayload(devicesView.enrollQrPayload);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to refresh from the server", "bad");
    } finally {
      setLoading(false);
    }
  }, [activeAgentId, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Polling cadence: approvals feel live (2s); everything else is cheaper (5s).
  useEffect(() => {
    const fast = window.setInterval(() => {
      api.listPending().then(
        (pending) =>
          setApprovals(pending.map((r) => mapApproval(r, agentNamesRef.current.get(r.agent) ?? shortDid(r.agent)))),
        () => undefined,
      );
    }, 2000);
    const slow = window.setInterval(() => void refresh(), 5000);
    return () => {
      window.clearInterval(fast);
      window.clearInterval(slow);
    };
  }, [refresh]);

  // License + agent config → Settings (real, round-trips through /api/config).
  useEffect(() => {
    void (async () => {
      try {
        const [{ config }, license] = await Promise.all([api.getConfig(), api.getLicense()]);
        const payMandate = config.agent.mandates.find((m) => m.capability === "pay");
        setSettings((s) => ({
          ...s,
          licenseKey: license.mode === "enforced" && license.operable ? "•••• active" : "",
          stepUpThreshold: payMandate?.stepUpThresholdMinor !== null && payMandate?.stepUpThresholdMinor !== undefined
            ? payMandate.stepUpThresholdMinor / 100
            : s.stepUpThreshold,
          notifyRouting: config.notifications?.routing ?? s.notifyRouting,
          quietHoursStart: config.notifications?.quietHoursStart ?? undefined,
          quietHoursEnd: config.notifications?.quietHoursEnd ?? undefined,
          quietHoursTz: config.notifications?.quietHoursTz ?? undefined,
        }));
      } catch {
        /* config endpoint unreachable — keep defaults */
      }
    })();
  }, []);

  useEffect(() => {
    setSettings((s) => ({ ...s, enforcement: agents.length === 0 || agents.every((a) => a.status !== "killed") }));
  }, [agents]);

  // Vault (read-only, real) — refetched whenever the active agent changes.
  useEffect(() => {
    if (activeAgentId === null || activeAgentId.startsWith("pending:")) return;
    void (async () => {
      try {
        if (isHttpApi()) {
          setApiAgentDid(activeAgentId);
        }
        const vault = await api.getVault();
        setVaultItems(
          vault.map((v) => ({
            id: v.handle,
            type: "login",
            name: v.label,
            addedAt: v.lastUsedAt !== null ? Date.parse(v.lastUsedAt) : Date.now(),
            namespace: v.namespace,
            trustDomain: v.trustDomain,
          })),
        );
      } catch {
        setVaultItems([]);
      }
    })();
  }, [activeAgentId]);

  // Wallet transaction history — approximated from the real activity/audit
  // feed filtered to `pay`-related entries (there is no dedicated transaction
  // ledger endpoint; see the plan's Future Features list for the gap this
  // leaves — free-form transaction tagging beyond this derivation).
  useEffect(() => {
    setTransactions(
      ledger
        .filter((e) => e.action.toLowerCase().includes("pay") || e.action.toLowerCase().includes("checkout"))
        .map(
          (e): Transaction => ({
            id: `ledger_${e.seq}`,
            kind: e.action.toLowerCase().includes("checkout") ? "topup" : "send",
            status: e.verdict === "DENY" ? "pending" : "ok",
            amount: 0,
            at: e.ts,
            label: e.action,
            source: e.agent,
          }),
        )
        .reverse(),
    );
  }, [ledger]);

  // Wallet balance — real AgentCard B2B2C cardholder balance, requires a tenantId (Clerk userId).
  useEffect(() => {
    if (tenantId === null) return;
    const load = () => {
      void api
        .getCardholderBalance({ tenantId })
        .then((b) => setWalletBalance(b.availableMinor / 100))
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(load, 8000);
    return () => window.clearInterval(id);
  }, [tenantId]);

  const resolveApproval: StoreShape["resolveApproval"] = (id, decision) => {
    const item = approvals.find((a) => a.id === id);
    setApprovals((list) => list.filter((a) => a.id !== id));
    void api
      .decide({ id, decision: decision === "approve" ? "approved" : "denied", reason: decision === "approve" ? "approved via console" : "denied via console" })
      .then(() => {
        toast(decision === "approve" ? "Approved" : `Denied${item ? ` · ${item.agent}` : ""}`, decision === "approve" ? "ok" : "bad");
        void refresh();
      })
      .catch((error: unknown) => {
        toast(error instanceof Error ? error.message : "Decision failed", "bad");
        void refresh();
      });
  };

  const toggleAgentEnforcement: StoreShape["toggleAgentEnforcement"] = (id) => {
    const a = agents.find((x) => x.id === id);
    if (!a || a.id.startsWith("pending:")) return;
    const willFreeze = a.status !== "killed";
    void (willFreeze
      ? api.freeze({ agentDid: a.did, reason: "toggled off in console" })
      : api.unfreeze({ agentDid: a.did })
    )
      .then(() => {
        toast(`${a.name}: enforcement ${willFreeze ? "OFF" : "ON"}`, willFreeze ? "info" : "ok");
        void refresh();
      })
      .catch((error: unknown) => toast(error instanceof Error ? error.message : "Failed", "bad"));
  };

  const setAgentStatus: StoreShape["setAgentStatus"] = (id, status) => {
    const a = agents.find((x) => x.id === id);
    if (!a || a.id.startsWith("pending:")) return;
    if (status === "killed") {
      void api.freeze({ agentDid: a.did, reason: "killed via console" }).then(() => {
        toast(`${a.name} killed`, "bad");
        void refresh();
      });
      return;
    }
    if (status === "active") {
      void api.unfreeze({ agentDid: a.did }).then(() => {
        toast(`${a.name} active`, "info");
        void refresh();
      });
      return;
    }
    notConnected(`"${status}" agent status`);
  };

  const removeAgent: StoreShape["removeAgent"] = (id) => {
    const a = agents.find((x) => x.id === id);
    if (!a) return;
    if (a.id.startsWith("pending:")) {
      writePending(readPending().filter((p) => !a.id.includes(p.token)));
      setAgents((list) => list.filter((x) => x.id !== id));
      return;
    }
    void api
      .deleteAgent({ agentDid: a.did })
      .then(() => {
        toast("Agent deleted", "bad");
        setActiveAgentId((prev) => (prev === id ? null : prev));
        void refresh();
      })
      .catch(() =>
        toast("Deleting an agent isn't available in local (non-tenant) mode yet", "info"),
      );
  };

  const updateAgent: StoreShape["updateAgent"] = (id, patch) => {
    // Only `name` has a real server-side counterpart, and only via the shared
    // agent config (not per-agent) in local mode — there is no per-agent
    // rename endpoint, so this stays local-only.
    setAgents((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    if (patch.name !== undefined) toast(`${patch.name} updated (locally — no rename endpoint yet)`, "info");
  };

  const toggleMandate: StoreShape["toggleMandate"] = () => notConnected("Pausing a single mandate");
  const removeMandate: StoreShape["removeMandate"] = (agentId, mandateId) => {
    const a = agents.find((x) => x.id === agentId);
    if (!a) return;
    void api
      .revokeMandate({ mandateId })
      .then(() => {
        toast("Mandate revoked", "bad");
        void refresh();
      })
      .catch((error: unknown) => toast(error instanceof Error ? error.message : "Revoke failed", "bad"));
  };

  const addMandate: StoreShape["addMandate"] = (agentId, label, detail) => {
    const a = agents.find((x) => x.id === agentId);
    if (!a) return;
    const capability = (["pay", "browse", "comms", "deploy", "vault", "signup"] as const).includes(
      label as Capability,
    )
      ? (label as Capability)
      : "browse";
    const spec: MandateSpecInput = { capability, scope: { note: detail }, stepUpThresholdMinor: null };
    void (async () => {
      if (isHttpApi()) {
        setApiAgentDid(a.did);
      }
      try {
        await api.addMandate({ spec });
        toast(`Mandate "${label}" added`, "ok");
        void refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Add mandate failed", "bad");
      }
    })();
  };

  const toggleProvider: StoreShape["toggleProvider"] = () =>
    notConnected("Toggling a provider from the console");
  const connectProvider: StoreShape["connectProvider"] = () =>
    notConnected("Connecting a provider with a credential form");
  const disconnectProvider: StoreShape["disconnectProvider"] = () =>
    notConnected("Disconnecting a provider from the console");

  const revokeDevice: StoreShape["revokeDevice"] = (id) => {
    void api
      .unlinkDevice({ token: id })
      .then(() => {
        toast("Device unlinked", "bad");
        void refresh();
      })
      .catch((error: unknown) => toast(error instanceof Error ? error.message : "Unlink failed", "bad"));
  };

  const addDevice: StoreShape["addDevice"] = (_name, kind) => {
    if (kind === "security-key") {
      notConnected("Adding a WebAuthn security key");
      return;
    }
    toast(`Scan the QR code to pair a phone (${enrollQrPayload ?? "enroll"})`, "info");
  };

  const updateSettings: StoreShape["updateSettings"] = (patch, reason) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      (Object.keys(patch) as Array<keyof Settings>).forEach((k) => {
        if (s[k] !== patch[k]) recordSettingChange(k, s[k], patch[k], reason);
      });
      return next;
    });
    void (async () => {
      try {
        const loaded = await api.getConfig();
        const notifications: NotificationPreferences = {
          routing: patch.notifyRouting ?? settings.notifyRouting,
          quietHoursStart: patch.quietHoursStart ?? settings.quietHoursStart ?? null,
          quietHoursEnd: patch.quietHoursEnd ?? settings.quietHoursEnd ?? null,
          quietHoursTz: patch.quietHoursTz ?? settings.quietHoursTz ?? null,
        };
        await api.saveConfig({ ...loaded.config, notifications });
      } catch {
        /* config save failed — local state still reflects the operator's intent */
      }
    })();
  };

  const recordSettingChange: StoreShape["recordSettingChange"] = () => {
    // Setting changes are now recorded server-side by whichever endpoint the
    // change round-trips through (saveConfig, activateLicense, …), so there is
    // no separate client-side ledger push here anymore — `refresh()` after a
    // mutation is what surfaces it in the real activity feed.
  };

  const removeVaultItem: StoreShape["removeVaultItem"] = () => notConnected("Removing a vault item");
  const addVaultItem: StoreShape["addVaultItem"] = () => notConnected("Manually adding a vault item");

  const topUp: StoreShape["topUp"] = (_amount, _label) => {
    if (tenantId === null) {
      notConnected("Funding the wallet (sign in required)");
      return;
    }
    void api
      .setupCardholderPaymentMethod({ tenantId })
      .then(({ checkoutUrl }) => {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        toast("Complete the Stripe checkout, then the balance refreshes automatically", "info");
      })
      .catch((error: unknown) => toast(error instanceof Error ? error.message : "Checkout failed", "bad"));
  };

  const getBalance: StoreShape["getBalance"] = () => walletBalance;

  const bulkSpawn: StoreShape["bulkSpawn"] = (opts) => {
    void (async () => {
      for (let i = 1; i <= opts.count; i++) {
        const displayName = `${opts.namePrefix} ${i}`;
        try {
          const { token } = await api.issueAgentToken();
          const pending = readPending();
          writePending([...pending, { displayName, issuedAt: Date.now(), token }]);
        } catch (error) {
          toast(error instanceof Error ? error.message : `Failed to spawn ${displayName}`, "bad");
        }
      }
      toast(`Issued ${opts.count} connection token(s) — install the agent to complete enrollment`, "ok");
      void refresh();
    })();
  };

  const value = useMemo<StoreShape>(
    () => ({
      agents, approvals, ledger, providers, devices, settings, toasts,
      activeAgentId, loading, tenantId, setTenantId, setActiveAgent,
      vaultItems, transactions, walletBalance,
      resolveApproval, toggleAgentEnforcement, setAgentStatus,
      updateAgent, removeAgent, toggleMandate, removeMandate, addMandate,
      toggleProvider, connectProvider, disconnectProvider,
      revokeDevice, addDevice, updateSettings, recordSettingChange, toast, dismissToast,
      removeVaultItem, addVaultItem, topUp, getBalance, bulkSpawn, refresh, enrollQrPayload,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agents, approvals, ledger, providers, devices, settings, toasts, vaultItems, transactions,
      walletBalance, activeAgentId, loading, tenantId, enrollQrPayload, refresh],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ============================================================
// Helpers
// ============================================================
export const verdictTone = (v: LedgerEntry["verdict"]): "ok" | "info" | "warn" | "bad" | "muted" => {
  switch (v) {
    case "ALLOW":
    case "OK":
      return "ok";
    case "NOTICE":
      return "info";
    case "STEP_UP":
      return "warn";
    case "DENY":
      return "bad";
    default:
      return "muted";
  }
};

export const riskTone = (r: Risk): "ok" | "warn" | "bad" => (r === "high" ? "bad" : r === "medium" ? "warn" : "ok");

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export { money, hashAt };
