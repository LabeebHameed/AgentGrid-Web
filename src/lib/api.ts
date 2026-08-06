import type {
  ActivityEntry,
  ActivityResponse,
  AgentSummary,
  AppConfig,
  ApprovalDecision,
  ApprovalRequest,
  AuditExport,
  AuditView,
  Capability,
  CardholderBalance,
  ConnectSnippet,
  DevicesView,
  GovernanceOverview,
  IdentityView,
  LicenseStatus,
  LoadedConfig,
  MandateView,
  PaymentMethodSetup,
  PaymentMethodStatus,
  PolicyDecisionView,
  ProvidersView,
  ResolvedApproval,
  ServiceAccountView,
  TenantCardResource,
  TenantEmail,
  Verdict,
  VaultEntryView,
  VirtualCardView,
} from "./types";
import {
  seedActivity,
  seedActivityResponse,
  seedAgents,
  seedAudit,
  seedCards,
  seedGovernanceOverview,
  seedConfig,
  seedHistory,
  seedIdentity,
  seedMandates,
  seedPending,
  seedPolicy,
  seedVault,
} from "./seed";

/** Optional filter for the policy decision feed (R3.6). */
export interface PolicyFilter {
  readonly verdict?: Verdict;
  readonly capability?: Capability;
}

/**
 * A mandate spec the console sends when creating an agent — the capability, its
 * scope, and the step-up threshold. Mirrors the server's `MandateSpec`/`MandateScope`
 * union loosely (the relay validates/enforces the full shape on enroll).
 */
export interface MandateSpecInput {
  readonly capability: Capability;
  readonly scope: Record<string, unknown>;
  readonly stepUpThresholdMinor: number | null;
}

/** Outcome of a set-cap control request (R4.5–R4.7). */
export type SetCardLimitsResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * The boundary to the Agent Grid approval transport. The MVP runs against an in-browser
 * seeded store so the surface is fully demoable with no backend; `HttpApi` is the
 * same contract over the real PendingApprovalStore (GET /api/approvals, POST a
 * signed decision) for when the operator-signing backend is wired up.
 */
export interface ApprovalApi {
  listPending(): Promise<readonly ApprovalRequest[]>;
  listHistory(): Promise<readonly ResolvedApproval[]>;
  decide(params: { id: string; decision: ApprovalDecision; reason: string }): Promise<void>;
  /** The live activity feed — recent decisions, actions, and approvals. */
  listActivity(): Promise<readonly ActivityEntry[]>;
  /** Every agent with its live freeze state (the kill switch view). */
  listAgents(): Promise<readonly AgentSummary[]>;
  /** Engage the kill switch: halt every consequential action by this agent. */
  freeze(params: { agentDid: string; reason: string }): Promise<void>;
  /** Lift the freeze: let the agent resume acting within its mandate. */
  unfreeze(params: { agentDid: string }): Promise<void>;
  /** Delete an agent entirely from the tenant. */
  deleteAgent(params: { agentDid: string }): Promise<void>;

  // ─── Governance read model (operator-authenticated) ───────────────────────
  getOverview(): Promise<GovernanceOverview>;
  getMandates(): Promise<readonly MandateView[]>;
  getPolicy(filter?: PolicyFilter): Promise<readonly PolicyDecisionView[]>;
  getCards(): Promise<readonly VirtualCardView[]>;
  getVault(): Promise<readonly VaultEntryView[]>;
  getWallet(): Promise<readonly ServiceAccountView[]>;
  getAudit(): Promise<AuditView>;
  exportAudit(): Promise<AuditExport>;
  getIdentity(): Promise<IdentityView>;
  getActivity(): Promise<ActivityResponse>;
  /** Revoke a mandate (R2.6, R2.7). */
  revokeMandate(params: { mandateId: string }): Promise<void>;
  /** Grant a new mandate to an existing agent; returns the agent's updated mandate list. */
  addMandate(params: { spec: MandateSpecInput }): Promise<readonly MandateView[]>;
  /** Set a per-transaction / per-period card cap (R4.5–R4.7). */
  setCardLimits(params: {
    handle: string;
    field: "perTransaction" | "perPeriod";
    requestedMinor: number;
  }): Promise<SetCardLimitsResult>;

  // ─── AgentCard B2B2C (fund an agent's virtual card via Stripe) ────────────
  /** Start a Stripe Checkout session to attach/replace the tenant's payment method. */
  setupCardholderPaymentMethod(params: { tenantId: string }): Promise<PaymentMethodSetup>;
  /** Poll whether the payment method attachment from `setupCardholderPaymentMethod` completed. */
  getCardholderPaymentMethodStatus(params: { tenantId: string }): Promise<PaymentMethodStatus>;
  /** Live available balance on the tenant's cardholder account. */
  getCardholderBalance(params: { tenantId: string }): Promise<CardholderBalance>;
  /** The tenant's AgentCard resources (handle/last4/status). */
  listTenantCards(params: { tenantId: string }): Promise<readonly TenantCardResource[]>;
  /** The tenant's provisioned AgentMail inbox address. */
  getTenantEmail(params: { tenantId: string }): Promise<TenantEmail>;

  // ─── Product config / licensing ─────────────────────────────────────
  getConfig(): Promise<LoadedConfig>;
  saveConfig(config: AppConfig): Promise<{ ok: boolean; errors?: readonly string[]; restartRequired?: boolean }>;
  getLicense(): Promise<LicenseStatus>;
  activateLicense(params: { key: string }): Promise<{ ok: boolean; reason?: string }>;
  deactivateLicense(): Promise<{ ok: boolean }>;
  getConnect(): Promise<ConnectSnippet>;
  getActiveAgent(): Promise<string | null>;
  setActiveAgent(did: string): Promise<void>;
  /** Mint a connection token bound to the signed-in tenant (onboarding). */
  issueAgentToken(): Promise<{ token: string }>;
  /**
   * Stage a new agent: there is no server-side "create agent" endpoint — an agent only
   * exists once its daemon calls `POST /api/enroll` with a generated keypair. This mints
   * a connection token the daemon uses to do that (real flow: mandate defaults are set via
   * `saveConfig` *before* calling this, since the daemon reads them from `/api/config` at
   * enroll time). The agent shows as "connecting" in `listAgents()` until enrollment lands.
   */
  createAgent(params: {
    displayName: string;
    /** Optional mandate specs to enroll the new agent with (capability + scope + step-up). */
    mandateSpecs?: readonly MandateSpecInput[];
  }): Promise<{ token: string; displayName: string }>;
  /** Provider connection status for the Providers screen (task 4.4). */
  getProviders(): Promise<ProvidersView>;
  /** Linked phone devices for the Devices screen (task 4.5). */
  getDevices(): Promise<DevicesView>;
  /** Unlink a specific device by token. */
  unlinkDevice(params: { token: string }): Promise<{ ok: boolean }>;
}

export class SeedApi implements ApprovalApi {
  #pending: ApprovalRequest[] = seedPending();
  #history: ResolvedApproval[] = seedHistory();
  #agents: AgentSummary[] = seedAgents();
  #activeDid: string | null = null;

  async listPending(): Promise<readonly ApprovalRequest[]> {
    return [...this.#pending];
  }

  async listHistory(): Promise<readonly ResolvedApproval[]> {
    return [...this.#history];
  }

  async decide(params: { id: string; decision: ApprovalDecision; reason: string }): Promise<void> {
    const request = this.#pending.find((r) => r.id === params.id);
    if (request === undefined) return;
    this.#pending = this.#pending.filter((r) => r.id !== params.id);
    this.#history = [
      { request, decision: params.decision, reason: params.reason, resolvedAt: new Date().toISOString() },
      ...this.#history,
    ];
  }

  async listActivity(): Promise<readonly ActivityEntry[]> {
    return seedActivity();
  }

  async listAgents(): Promise<readonly AgentSummary[]> {
    return [...this.#agents];
  }

  async freeze(params: { agentDid: string; reason: string }): Promise<void> {
    this.#agents = this.#agents.map((a) =>
      a.did === params.agentDid
        ? { ...a, status: { frozen: true, reason: params.reason, since: new Date().toISOString() } }
        : a,
    );
  }

  async unfreeze(params: { agentDid: string }): Promise<void> {
    this.#agents = this.#agents.map((a) =>
      a.did === params.agentDid ? { ...a, status: { frozen: false, reason: null, since: null } } : a,
    );
  }

  async deleteAgent(params: { agentDid: string }): Promise<void> {
    this.#agents = this.#agents.filter((a) => a.did !== params.agentDid);
  }

  #mandates: MandateView[] = seedMandates();
  #cards: VirtualCardView[] = seedCards();

  async getOverview(): Promise<GovernanceOverview> {
    const frozen = this.#agents[0]?.status ?? { frozen: false, reason: null, since: null };
    return seedGovernanceOverview(frozen);
  }
  async getMandates(): Promise<readonly MandateView[]> {
    return [...this.#mandates];
  }
  async getPolicy(filter?: PolicyFilter): Promise<readonly PolicyDecisionView[]> {
    return seedPolicy().filter(
      (d) =>
        (filter?.verdict === undefined || d.verdict === filter.verdict) &&
        (filter?.capability === undefined || d.capability === filter.capability),
    );
  }
  async getCards(): Promise<readonly VirtualCardView[]> {
    return [...this.#cards];
  }
  async getVault(): Promise<readonly VaultEntryView[]> {
    return seedVault();
  }
  async getWallet(): Promise<readonly ServiceAccountView[]> {
    return [];
  }
  async getAudit(): Promise<AuditView> {
    return seedAudit();
  }
  async exportAudit(): Promise<AuditExport> {
    const audit = seedAudit();
    return {
      agentDid: this.#agents[0]?.did ?? "did:key:seed",
      entries: seedActivity(),
      verified: audit.verified,
      brokenAtSeq: audit.brokenAtSeq,
    };
  }
  async getIdentity(): Promise<IdentityView> {
    return seedIdentity();
  }
  async getActivity(): Promise<ActivityResponse> {
    const frozen = this.#agents[0]?.status.frozen === true;
    return seedActivityResponse(frozen);
  }
  async revokeMandate(params: { mandateId: string }): Promise<void> {
    this.#mandates = this.#mandates.map((m) =>
      m.id === params.mandateId ? { ...m, status: "revoked" } : m,
    );
  }
  async addMandate(params: { spec: MandateSpecInput }): Promise<readonly MandateView[]> {
    const mandate: MandateView = {
      id: `mandate_${Math.random().toString(36).slice(2, 10)}`,
      capability: params.spec.capability,
      scope: { capability: params.spec.capability, ...params.spec.scope },
      trustDomain: "agent-owned",
      stepUpThresholdMinor: params.spec.stepUpThresholdMinor,
      notBefore: new Date().toISOString(),
      expires: new Date(Date.now() + 365 * 864e5).toISOString(),
      issuerOperatorDid: "did:key:seed-operator",
      operatorSigned: true,
      parentId: null,
      chainIndex: 0,
      status: "active",
      paySpend: null,
    };
    this.#mandates = [...this.#mandates, mandate];
    return [...this.#mandates];
  }
  #cardholderBalanceMinor = 0;
  #paymentMethodReady = false;
  async setupCardholderPaymentMethod(_params: { tenantId: string }): Promise<PaymentMethodSetup> {
    this.#paymentMethodReady = true;
    return { checkoutUrl: "https://checkout.stripe.com/demo-session" };
  }
  async getCardholderPaymentMethodStatus(_params: { tenantId: string }): Promise<PaymentMethodStatus> {
    return { ready: this.#paymentMethodReady };
  }
  async getCardholderBalance(_params: { tenantId: string }): Promise<CardholderBalance> {
    return { availableMinor: this.#cardholderBalanceMinor, currency: "usd" };
  }
  async listTenantCards(_params: { tenantId: string }): Promise<readonly TenantCardResource[]> {
    return this.#cards.map((c) => ({ handle: c.handle, last4: c.last4, status: "active" as const }));
  }
  async getTenantEmail(_params: { tenantId: string }): Promise<TenantEmail> {
    return { address: "agent-demo@agentmail.to", provisionedAt: new Date().toISOString() };
  }
  async setCardLimits(params: {
    handle: string;
    field: "perTransaction" | "perPeriod";
    requestedMinor: number;
  }): Promise<SetCardLimitsResult> {
    const card = this.#cards.find((c) => c.handle === params.handle);
    if (card === undefined) return { ok: false, reason: "Unknown card." };
    if (params.requestedMinor <= 0) {
      return { ok: false, reason: "Cap must be greater than zero." };
    }
    this.#cards = this.#cards.map((c) =>
      c.handle === params.handle
        ? params.field === "perTransaction"
          ? { ...c, perTransactionMinor: params.requestedMinor }
          : { ...c, perPeriodMinor: params.requestedMinor }
        : c,
    );
    return { ok: true };
  }

  #config: AppConfig = seedConfig();
  #entitled = false;

  async getConfig(): Promise<LoadedConfig> {
    return { config: this.#config, firstRun: false };
  }
  async saveConfig(config: AppConfig): Promise<{ ok: boolean; restartRequired?: boolean }> {
    this.#config = config;
    return { ok: true, restartRequired: false };
  }
  async getLicense(): Promise<LicenseStatus> {
    return this.#config.license.mode === "disabled"
      ? { mode: "disabled", operable: true, plan: null, expiresAt: null, reason: "license enforcement disabled (dev/test mode)" }
      : this.#entitled
        ? { mode: "enforced", operable: true, plan: "personal", expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(), reason: "licensed" }
        : { mode: "enforced", operable: false, plan: null, expiresAt: null, reason: "no-entitlement" };
  }
  async activateLicense(params: { key: string }): Promise<{ ok: boolean; reason?: string }> {
    if (params.key.trim() === "") return { ok: false, reason: "a license key is required" };
    this.#entitled = true;
    return { ok: true };
  }
  async deactivateLicense(): Promise<{ ok: boolean }> {
    this.#entitled = false;
    return { ok: true };
  }
  async getConnect(): Promise<ConnectSnippet> {
    return { snippet: { mcpServers: { agentgrid: { command: "agent-grid-mcp" } } } };
  }
  async getActiveAgent(): Promise<string | null> {
    return this.#activeDid ?? (this.#agents[0]?.did ?? null);
  }
  async setActiveAgent(did: string): Promise<void> {
    this.#activeDid = did;
  }
  async issueAgentToken(): Promise<{ token: string }> {
    return { token: "ag_demo_token_xxxxxxxxxxxxxxxxxxxx" };
  }
  async createAgent(params: { displayName: string; mandateSpecs?: readonly MandateSpecInput[] }): Promise<{ token: string; displayName: string }> {
    const rawToken = "ag_demo_token_" + Math.random().toString(36).substring(2);
    // Add to seed agents list so it shows up in UI
    const did = `did:key:z6Mkg` + Math.random().toString(36).substring(2, 10);
    this.#agents = [
      ...this.#agents,
      {
        did,
        displayName: params.displayName,
        capabilities: ["pay", "browse", "comms", "deploy"],
        status: { frozen: false, reason: null, since: null }
      }
    ];
    this.#activeDid = did;
    return { token: rawToken, displayName: params.displayName };
  }
  async getProviders(): Promise<ProvidersView> {
    return {
      providers: [
        { kind: "browser", label: "Playwright browser", description: "Lets the agent navigate and interact with websites.", connected: true, detail: "headless", envKey: "(built-in)" },
        { kind: "email", label: "AgentMail inbox", description: "Gives the agent a real email address for verifications and messages.", connected: false, detail: null, envKey: "AGENTMAIL_API_KEY" },
        { kind: "sms", label: "Twilio SMS", description: "Lets the agent send and receive SMS messages.", connected: false, detail: null, envKey: "TWILIO_ACCOUNT_SID" },
        { kind: "cloud", label: "Vercel deployments", description: "Lets the agent deploy code to Vercel.", connected: false, detail: null, envKey: "VERCEL_TOKEN" },
        { kind: "payments", label: "Stripe Issuing card", description: "A real virtual card the agent uses for payments (operator-issued).", connected: false, detail: null, envKey: "STRIPE_API_KEY" },
      ],
    };
  }
  async getDevices(): Promise<DevicesView> {
    return { devices: [], enrollQrPayload: "https://agentgrid.local/enroll" };
  }
  async unlinkDevice(_params: { token: string }): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}

export class HttpApi implements ApprovalApi {
  readonly #base: string;
  #getClerkToken?: () => Promise<string | null>;

  constructor(base: string) {
    this.#base = base.replace(/\/+$/, "");
  }

  setGetClerkToken(getClerkToken: () => Promise<string | null>): void {
    this.#getClerkToken = getClerkToken;
  }

  async #getHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = { ...extra };
    if (this.#getClerkToken) {
      const token = await this.#getClerkToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async listPending(): Promise<readonly ApprovalRequest[]> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/approvals`, { headers });
    if (!res.ok) throw new Error(`approvals fetch failed: ${res.status}`);
    return (await res.json()) as ApprovalRequest[];
  }
  async listHistory(): Promise<readonly ResolvedApproval[]> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/approvals/history`, { headers });
    if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
    return (await res.json()) as ResolvedApproval[];
  }
  async decide(params: { id: string; decision: ApprovalDecision; reason: string }): Promise<void> {
    const headers = await this.#getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${this.#base}/api/approvals/${encodeURIComponent(params.id)}/decision`, {
      method: "POST",
      headers,
      body: JSON.stringify({ decision: params.decision, reason: params.reason }),
    });
    if (!res.ok) throw new Error(`decision failed: ${res.status}`);
  }
  async listActivity(): Promise<readonly ActivityEntry[]> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/activity`, { headers });
    if (!res.ok) throw new Error(`activity fetch failed: ${res.status}`);
    return (await res.json()) as ActivityEntry[];
  }
  async listAgents(): Promise<readonly AgentSummary[]> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/agents`, { headers });
    if (!res.ok) throw new Error(`agents fetch failed: ${res.status}`);
    return (await res.json()) as AgentSummary[];
  }
  async freeze(params: { agentDid: string; reason: string }): Promise<void> {
    const headers = await this.#getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${this.#base}/api/agents/${encodeURIComponent(params.agentDid)}/freeze`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: params.reason }),
    });
    if (!res.ok) throw new Error(`freeze failed: ${res.status}`);
  }
  async unfreeze(params: { agentDid: string }): Promise<void> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/agents/${encodeURIComponent(params.agentDid)}/unfreeze`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error(`unfreeze failed: ${res.status}`);
  }

  async deleteAgent(params: { agentDid: string }): Promise<void> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/agents/${encodeURIComponent(params.agentDid)}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error(`delete agent failed: ${res.status}`);
  }

  // ─── Governance ───────────────────────────────────────────────────────────
  #token: string | null = null;
  #agentDid: string | null = null;

  setAgentDid(did: string): void {
    this.#agentDid = did;
  }

  async #ensureToken(): Promise<string> {
    if (this.#token !== null) return this.#token;
    const res = await fetch(`${this.#base}/api/governance/session/local`, { method: "POST" });
    if (!res.ok) throw new Error(`session failed: ${res.status}`);
    const { token } = (await res.json()) as { token: string };
    this.#token = token;
    return token;
  }

  async #govGet<T>(suffix: string): Promise<T> {
    const did = this.#agentDid;
    if (did === null) throw new Error("no agent selected");
    if (this.#getClerkToken) {
      const headers = await this.#getHeaders();
      const res = await fetch(`${this.#base}/api/governance/${encodeURIComponent(did)}/${suffix}`, {
        headers,
      });
      if (!res.ok) throw new Error(`governance ${suffix} failed: ${res.status}`);
      return (await res.json()) as T;
    }
    const run = async (token: string): Promise<Response> =>
      fetch(`${this.#base}/api/governance/${encodeURIComponent(did)}/${suffix}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    let res = await run(await this.#ensureToken());
    if (res.status === 401) {
      this.#token = null;
      res = await run(await this.#ensureToken());
    }
    if (!res.ok) throw new Error(`governance ${suffix} failed: ${res.status}`);
    return (await res.json()) as T;
  }

  async #govPost<T>(suffix: string, body: unknown): Promise<{ status: number; data: T }> {
    const did = this.#agentDid;
    if (did === null) throw new Error("no agent selected");
    if (this.#getClerkToken) {
      const headers = await this.#getHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${this.#base}/api/governance/${encodeURIComponent(did)}/${suffix}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
    }
    const run = async (token: string): Promise<Response> =>
      fetch(`${this.#base}/api/governance/${encodeURIComponent(did)}/${suffix}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    let res = await run(await this.#ensureToken());
    if (res.status === 401) {
      this.#token = null;
      res = await run(await this.#ensureToken());
    }
    return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
  }

  async getOverview(): Promise<GovernanceOverview> {
    return this.#govGet<GovernanceOverview>("overview");
  }
  async getMandates(): Promise<readonly MandateView[]> {
    return this.#govGet<readonly MandateView[]>("mandates");
  }
  async getPolicy(filter?: PolicyFilter): Promise<readonly PolicyDecisionView[]> {
    const params = new URLSearchParams();
    if (filter?.verdict !== undefined) params.set("verdict", filter.verdict);
    if (filter?.capability !== undefined) params.set("capability", filter.capability);
    const qs = params.toString();
    return this.#govGet<readonly PolicyDecisionView[]>(`policy${qs === "" ? "" : `?${qs}`}`);
  }
  async getCards(): Promise<readonly VirtualCardView[]> {
    return this.#govGet<readonly VirtualCardView[]>("cards");
  }
  async getVault(): Promise<readonly VaultEntryView[]> {
    return this.#govGet<readonly VaultEntryView[]>("vault");
  }
  async getWallet(): Promise<readonly ServiceAccountView[]> {
    return this.#govGet<readonly ServiceAccountView[]>("wallet");
  }
  async getAudit(): Promise<AuditView> {
    return this.#govGet<AuditView>("audit");
  }
  async exportAudit(): Promise<AuditExport> {
    return this.#govGet<AuditExport>("audit/export");
  }
  async getIdentity(): Promise<IdentityView> {
    return this.#govGet<IdentityView>("identity");
  }
  async getActivity(): Promise<ActivityResponse> {
    return this.#govGet<ActivityResponse>("activity");
  }
  async revokeMandate(params: { mandateId: string }): Promise<void> {
    const { status } = await this.#govPost(`mandates/${encodeURIComponent(params.mandateId)}/revoke`, {});
    if (status < 200 || status >= 300) throw new Error(`revoke failed: ${status}`);
  }
  async addMandate(params: { spec: MandateSpecInput }): Promise<readonly MandateView[]> {
    const { status, data } = await this.#govPost<readonly MandateView[]>("mandates", params.spec);
    if (status < 200 || status >= 300) throw new Error(`add mandate failed: ${status}`);
    return data;
  }

  // ─── AgentCard B2B2C ────────────────────────────────────────────────────────
  async setupCardholderPaymentMethod(params: { tenantId: string }): Promise<PaymentMethodSetup> {
    const headers = await this.#getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(
      `${this.#base}/api/tenants/${encodeURIComponent(params.tenantId)}/cardholder/payment-method/setup`,
      { method: "POST", headers },
    );
    if (!res.ok) throw new Error(`payment method setup failed: ${res.status}`);
    return (await res.json()) as PaymentMethodSetup;
  }
  async getCardholderPaymentMethodStatus(params: { tenantId: string }): Promise<PaymentMethodStatus> {
    const headers = await this.#getHeaders();
    const res = await fetch(
      `${this.#base}/api/tenants/${encodeURIComponent(params.tenantId)}/cardholder/payment-method/status`,
      { headers },
    );
    if (!res.ok) throw new Error(`payment method status failed: ${res.status}`);
    return (await res.json()) as PaymentMethodStatus;
  }
  async getCardholderBalance(params: { tenantId: string }): Promise<CardholderBalance> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/tenants/${encodeURIComponent(params.tenantId)}/cardholder/balance`, { headers });
    if (!res.ok) throw new Error(`cardholder balance failed: ${res.status}`);
    return (await res.json()) as CardholderBalance;
  }
  async listTenantCards(params: { tenantId: string }): Promise<readonly TenantCardResource[]> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/tenants/${encodeURIComponent(params.tenantId)}/cards`, { headers });
    if (!res.ok) throw new Error(`tenant cards failed: ${res.status}`);
    const { cards } = (await res.json()) as { cards: readonly TenantCardResource[] };
    return cards;
  }
  async getTenantEmail(params: { tenantId: string }): Promise<TenantEmail> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/tenants/${encodeURIComponent(params.tenantId)}/email`, { headers });
    if (!res.ok) throw new Error(`tenant email failed: ${res.status}`);
    return (await res.json()) as TenantEmail;
  }
  async setCardLimits(params: {
    handle: string;
    field: "perTransaction" | "perPeriod";
    requestedMinor: number;
  }): Promise<SetCardLimitsResult> {
    const { status, data } = await this.#govPost<{ ok?: boolean; reason?: string }>(
      `cards/${encodeURIComponent(params.handle)}/limits`,
      { field: params.field, requestedMinor: params.requestedMinor },
    );
    if (status >= 200 && status < 300 && data.ok === true) return { ok: true };
    return { ok: false, reason: data.reason ?? `request failed (${status})` };
  }

  // ─── Product config / licensing ──
  async getConfig(): Promise<LoadedConfig> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/config`, { headers });
    if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
    return (await res.json()) as LoadedConfig;
  }
  async saveConfig(config: AppConfig): Promise<{ ok: boolean; errors?: readonly string[]; restartRequired?: boolean }> {
    const headers = await this.#getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${this.#base}/api/config`, {
      method: "POST",
      headers,
      body: JSON.stringify(config),
    });
    return (await res.json()) as { ok: boolean; errors?: readonly string[]; restartRequired?: boolean };
  }
  async getLicense(): Promise<LicenseStatus> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/license`, { headers });
    if (!res.ok) throw new Error(`license fetch failed: ${res.status}`);
    return (await res.json()) as LicenseStatus;
  }
  async activateLicense(params: { key: string }): Promise<{ ok: boolean; reason?: string }> {
    const headers = await this.#getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${this.#base}/api/license/activate`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
    return (await res.json()) as { ok: boolean; reason?: string };
  }
  async deactivateLicense(): Promise<{ ok: boolean }> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/license/deactivate`, { method: "POST", headers });
    return (await res.json()) as { ok: boolean };
  }
  async getConnect(): Promise<ConnectSnippet> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/connect`, { headers });
    if (!res.ok) throw new Error(`connect fetch failed: ${res.status}`);
    return (await res.json()) as ConnectSnippet;
  }
  async getActiveAgent(): Promise<string | null> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/agents/active`, { headers });
    if (!res.ok) throw new Error(`get active agent failed: ${res.status}`);
    const data = (await res.json()) as { activeDid: string | null };
    return data.activeDid;
  }
  async setActiveAgent(did: string): Promise<void> {
    const headers = await this.#getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${this.#base}/api/agents/active`, {
      method: "POST",
      headers,
      body: JSON.stringify({ agentDid: did }),
    });
    if (!res.ok) throw new Error(`set active agent failed: ${res.status}`);
    this.#agentDid = did;
  }
  async issueAgentToken(): Promise<{ token: string }> {
    const headers = await this.#getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${this.#base}/api/tokens`, {
      method: "POST",
      headers,
      body: JSON.stringify({ label: "console" }),
    });
    if (!res.ok) throw new Error(`token issue failed: ${res.status}`);
    return (await res.json()) as { token: string };
  }
  async createAgent(params: { displayName: string; mandateSpecs?: readonly MandateSpecInput[] }): Promise<{ token: string; displayName: string }> {
    // There is no `POST /api/agents` — an agent only comes into existence once its
    // daemon calls `POST /api/enroll` with a generated keypair. If mandate defaults were
    // requested, stage them in the agent config first (the daemon reads `agent.mandates`
    // from `/api/config` at enroll time), then mint the connection token the daemon uses.
    if (params.mandateSpecs !== undefined && params.mandateSpecs.length > 0) {
      const loaded = await this.getConfig();
      await this.saveConfig({
        ...loaded.config,
        agent: {
          displayName: params.displayName,
          mandates: params.mandateSpecs.map((spec) => ({
            capability: spec.capability,
            scope: { capability: spec.capability, ...spec.scope },
            stepUpThresholdMinor: spec.stepUpThresholdMinor,
          })),
        },
      });
    }
    const headers = await this.#getHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${this.#base}/api/tokens`, {
      method: "POST",
      headers,
      body: JSON.stringify({ label: params.displayName }),
    });
    if (!res.ok) throw new Error(`token issue failed: ${res.status}`);
    const { token } = (await res.json()) as { token: string };
    return { token, displayName: params.displayName };
  }
  async getProviders(): Promise<ProvidersView> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/providers`, { headers });
    if (!res.ok) throw new Error(`providers fetch failed: ${res.status}`);
    return (await res.json()) as ProvidersView;
  }
  async getDevices(): Promise<DevicesView> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/devices`, { headers });
    if (!res.ok) throw new Error(`devices fetch failed: ${res.status}`);
    return (await res.json()) as DevicesView;
  }
  async unlinkDevice(params: { token: string }): Promise<{ ok: boolean }> {
    const headers = await this.#getHeaders();
    const res = await fetch(`${this.#base}/api/devices/${encodeURIComponent(params.token)}/unlink`, { method: "POST", headers });
    if (!res.ok) throw new Error(`unlink failed: ${res.status}`);
    return (await res.json()) as { ok: boolean };
  }
}
