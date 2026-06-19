import type {
  ActivityEntry,
  ActivityResponse,
  AgentSummary,
  ApprovalRequest,
  AuditView,
  FrozenState,
  GovernanceOverview,
  GovernanceStatements,
  GovernanceVocabulary,
  IdentityView,
  MandateView,
  PolicyDecisionView,
  ResolvedApproval,
  VaultEntryView,
  VirtualCardView,
} from "./types";

const AGENT = "did:key:z6MkvS1cqyiGLD6vMgccHakJ1GZK9mfkQnjbxZdxTyW8X23b";
const inMinutes = (m: number): string => new Date(Date.now() + m * 60_000).toISOString();
const minutesAgo = (m: number): string => new Date(Date.now() - m * 60_000).toISOString();

export const seedPending = (): ApprovalRequest[] => [
  {
    id: "apr_3f9a21",
    agent: AGENT,
    capability: "pay",
    action: "pay.charge",
    amountMinor: 1400,
    currency: "USD",
    merchant: "acme-analytics.com",
    targetService: "acme-analytics.com",
    targetDomain: null,
    rationale: "Upgrade the analytics plan to export the Q2 dataset the user asked for.",
    nonce: "n_8c41d0a7e2",
    createdAt: minutesAgo(1),
    expiresAt: inMinutes(4),
  },
  {
    id: "apr_7b1c88",
    agent: AGENT,
    capability: "browse",
    action: "browse.login.user-owned",
    amountMinor: null,
    currency: null,
    merchant: null,
    targetService: "user-owned",
    targetDomain: "dashboard.stripe.com",
    rationale: "Read this month's payout total to answer the user's question.",
    nonce: "n_1a77be93f0",
    createdAt: minutesAgo(3),
    expiresAt: inMinutes(9),
  },
  {
    id: "apr_c4e012",
    capability: "deploy",
    agent: AGENT,
    action: "deploy.publish",
    amountMinor: null,
    currency: null,
    merchant: null,
    targetService: "aegis-cloud",
    targetDomain: "status-bot.vercel.app",
    rationale: "Publish the status page the user requested to *.vercel.app (≈$0/mo).",
    nonce: "n_55b9c12d4a",
    createdAt: minutesAgo(6),
    expiresAt: inMinutes(20),
  },
];

export const seedHistory = (): ResolvedApproval[] => [
  {
    request: {
      id: "apr_91aa02",
      agent: AGENT,
      capability: "pay",
      action: "pay.charge",
      amountMinor: 900,
      currency: "USD",
      merchant: "openrouter.ai",
      targetService: "openrouter.ai",
      targetDomain: null,
      rationale: "Top up API credits to finish the batch the user started.",
      nonce: "n_22aa",
      createdAt: minutesAgo(58),
      expiresAt: minutesAgo(53),
    },
    decision: "approved",
    reason: "approved by operator",
    resolvedAt: minutesAgo(57),
  },
  {
    request: {
      id: "apr_44de71",
      agent: AGENT,
      capability: "pay",
      action: "pay.charge",
      amountMinor: 8800,
      currency: "USD",
      merchant: "unknown-vendor.io",
      targetService: "unknown-vendor.io",
      targetDomain: null,
      rationale: "Purchase a dataset from a vendor not seen before.",
      nonce: "n_77bd",
      createdAt: minutesAgo(126),
      expiresAt: minutesAgo(121),
    },
    decision: "denied",
    reason: "unfamiliar vendor, amount above comfort",
    resolvedAt: minutesAgo(124),
  },
];

export const seedAgents = (): AgentSummary[] => [
  {
    did: AGENT,
    displayName: "Aegis Agent",
    capabilities: ["browse", "comms", "pay", "deploy"],
    status: { frozen: false, reason: null, since: null },
  },
];

export const seedActivity = (): ActivityEntry[] => [
  {
    agentDid: AGENT,
    eventType: "action",
    payload: { action: "deploy.publish", ok: true, summary: "published status-bot.vercel.app" },
    mandateId: "mnd_deploy",
    seq: 7,
    ts: minutesAgo(2),
    entryHash: "9f2c1a",
  },
  {
    agentDid: AGENT,
    eventType: "policy_decision",
    payload: { action: "deploy.publish", capability: "deploy", verdict: "ALLOW", reason: "within deploy mandate" },
    mandateId: "mnd_deploy",
    seq: 6,
    ts: minutesAgo(2),
    entryHash: "7a0bd4",
  },
  {
    agentDid: AGENT,
    eventType: "approval",
    payload: { approvalId: "apr_91aa02", action: "pay.charge", status: "approved", approverDid: AGENT },
    mandateId: "mnd_pay",
    seq: 5,
    ts: minutesAgo(57),
    entryHash: "c133ef",
  },
  {
    agentDid: AGENT,
    eventType: "policy_decision",
    payload: { action: "pay.charge", capability: "pay", verdict: "STEP_UP", reason: "above step-up threshold" },
    mandateId: "mnd_pay",
    seq: 4,
    ts: minutesAgo(58),
    entryHash: "b921aa",
  },
  {
    agentDid: AGENT,
    eventType: "action",
    payload: { action: "comms.read_otp", ok: true, summary: "read one-time code from inbox" },
    mandateId: "mnd_comms",
    seq: 3,
    ts: minutesAgo(64),
    entryHash: "4d77bd",
  },
];

// ─── Governance seed data (demo mode) ─────────────────────────────────────────

const OPERATOR = "did:key:z6MkpToperator00000000000000000000000000000000";

export const SEED_VOCABULARY: GovernanceVocabulary = {
  mandate: "Mandate",
  policyEngine: "Policy Engine",
  verdict: "Verdict",
  vault: "Vault",
  virtualCard: "Virtual Card",
  auditLedger: "Audit Ledger",
  passport: "Passport",
};

export const SEED_STATEMENTS: GovernanceStatements = {
  agentUntrusted:
    "The agent operates as an untrusted component. Governance is enforced outside the agent's reasoning, so prompt injection cannot widen its authority.",
  policyDeterministic:
    "The Policy Engine is deterministic, not an LLM, and decides a verdict before any action executes.",
  issuerEnforcedCaps:
    "Spend caps are enforced by the card issuer and hold independently of the agent and the Policy Engine.",
  vaultNeverReachesAgent:
    "Vault secrets are injected by the executor at runtime and never reach the agent; the agent only ever holds a credential handle.",
  operatorTrustAnchor:
    "The Operator DID is the trust anchor whose signature roots every Mandate's authority.",
};

export const seedMandates = (): MandateView[] => [
  {
    id: "mnd_browse",
    capability: "browse",
    scope: { capability: "browse", allowedDomains: ["*"], deniedDomains: [], maxSessionMinutes: 60 },
    trustDomain: "agent-owned",
    stepUpThresholdMinor: null,
    notBefore: minutesAgo(60 * 24 * 17),
    expires: inMinutes(60 * 24 * 196),
    issuerOperatorDid: OPERATOR,
    operatorSigned: true,
    parentId: null,
    chainIndex: 0,
    status: "active",
    paySpend: null,
  },
  {
    id: "mnd_pay",
    capability: "pay",
    scope: {
      capability: "pay",
      currency: "USD",
      limitPerTransactionMinor: 2000,
      limitPerPeriodMinor: 2000,
      periodDays: 30,
      allowedCategories: ["saas", "compute", "data"],
      allowedMerchants: ["*"],
      deniedMerchants: [],
    },
    trustDomain: "agent-owned",
    stepUpThresholdMinor: 1000,
    notBefore: minutesAgo(60 * 24 * 17),
    expires: inMinutes(60 * 24 * 196),
    issuerOperatorDid: OPERATOR,
    operatorSigned: true,
    parentId: null,
    chainIndex: 0,
    status: "active",
    paySpend: {
      periodSpentMinor: 900,
      limitPerPeriodMinor: 2000,
      limitPerTransactionMinor: 2000,
      currency: "USD",
      periodDays: 30,
    },
  },
];

export const seedCards = (): VirtualCardView[] => [
  {
    handle: "card_demo_8842",
    last4: "8842",
    mandateId: "mnd_pay",
    perTransactionMinor: 2000,
    perPeriodMinor: 2000,
    periodDays: 30,
    allowedCategories: ["saas", "compute", "data"],
    deniedMerchants: [],
    periodSpentMinor: 900,
    currency: "USD",
  },
];

export const seedPolicy = (): PolicyDecisionView[] => [
  {
    verdict: "ALLOW",
    reason: "within deploy mandate",
    matchedMandateId: "mnd_deploy",
    capability: "deploy",
    action: "deploy.publish",
    decidedAt: minutesAgo(2),
    seq: 6,
    pendingApprovalId: null,
  },
  {
    verdict: "STEP_UP",
    reason: "above step-up threshold",
    matchedMandateId: "mnd_pay",
    capability: "pay",
    action: "pay.charge",
    decidedAt: minutesAgo(58),
    seq: 4,
    pendingApprovalId: "apr_3f9a21",
  },
  {
    verdict: "DENY",
    reason: "unfamiliar vendor above comfort",
    matchedMandateId: "mnd_pay",
    capability: "pay",
    action: "pay.charge",
    decidedAt: minutesAgo(124),
    seq: 2,
    pendingApprovalId: null,
  },
];

export const seedVault = (): VaultEntryView[] => [
  {
    handle: "cred_a13f9c2e",
    namespace: "openrouter.ai",
    label: "openrouter.ai",
    trustDomain: "agent-owned",
    lastUsedAt: minutesAgo(57),
    grantingMandateId: null,
  },
  {
    handle: "cred_55de0017",
    namespace: "stripe.com",
    label: "stripe.com",
    trustDomain: "user-owned",
    lastUsedAt: null,
    grantingMandateId: null,
  },
];

export const seedAudit = (): AuditView => {
  const entries = seedActivity()
    .slice()
    .sort((a, b) => a.seq - b.seq)
    .map((e) => ({
      seq: e.seq,
      eventType: e.eventType,
      action: typeof e.payload["action"] === "string" ? (e.payload["action"] as string) : null,
      mandateId: e.mandateId,
      ts: e.ts,
      entryHash: e.entryHash,
    }));
  return { entries, verified: true, brokenAtSeq: null, empty: entries.length === 0 };
};

export const seedIdentity = (): IdentityView => ({
  passportId: AGENT,
  operatorDid: OPERATOR,
  displayName: "Aegis Agent",
  status: "active",
});

export const seedGovernanceOverview = (frozen: FrozenState): GovernanceOverview => ({
  agentDid: AGENT,
  generatedAt: new Date().toISOString(),
  frozenState: frozen,
  statements: SEED_STATEMENTS,
  vocabulary: SEED_VOCABULARY,
  primitives: [
    { kind: "mandate", label: "Mandate", status: "ok", detail: "2 active mandates", view: "/mandates" },
    { kind: "policy", label: "Policy Engine", status: "attention", detail: "3 decisions, 1 denied", view: "/policy" },
    { kind: "vault", label: "Vault", status: "ok", detail: "2 credentials", view: "/vault" },
    { kind: "hardLimits", label: "Virtual Card", status: "ok", detail: "1 card", view: "/cards" },
    { kind: "audit", label: "Audit Ledger", status: "ok", detail: "chain verified", view: "/audit" },
    { kind: "identity", label: "Passport", status: "ok", detail: "active", view: "/identity" },
  ],
});

export const seedActivityResponse = (frozen: boolean): ActivityResponse => {
  const now = new Date().toISOString();
  const status = frozen ? "frozen" : "active";
  return {
    generatedAt: now,
    state: {
      agentDid: AGENT,
      status,
      halted: frozen,
      mostRecentAction: { capability: "deploy", target: "status-bot.vercel.app", timestamp: minutesAgo(2), seq: 7 },
      currentWait: null,
      lastUpdatedAt: now,
    },
    timeline: seedActivity()
      .slice()
      .sort((a, b) => b.seq - a.seq)
      .map((e) => ({
        seq: e.seq,
        ts: e.ts,
        capability:
          typeof e.payload["capability"] === "string" ? (e.payload["capability"] as MandateView["capability"]) : null,
        summary:
          e.eventType === "policy_decision"
            ? `${String(e.payload["verdict"])} · ${String(e.payload["action"])}`
            : e.eventType === "action"
              ? `${String(e.payload["action"])} ${e.payload["ok"] === true ? "succeeded" : "did not complete"}`
              : `Approval ${String(e.payload["status"])} for ${String(e.payload["action"])}`,
      })),
  };
};
