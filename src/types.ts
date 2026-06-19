/**
 * The wire model, mirrored from @aegis/approval (protocol.ts) so this app speaks
 * the real Aegis approval shape — ready to point at the live PendingApprovalStore.
 */

export type Capability = "browse" | "comms" | "pay" | "deploy" | "vault" | "signup";

export interface ApprovalRequest {
  readonly id: string;
  readonly agent: string; // did:key:…
  readonly capability: Capability;
  readonly action: string; // e.g. "pay.charge", "browse.login"
  readonly amountMinor: number | null;
  readonly currency: string | null;
  readonly merchant: string | null;
  readonly targetService: string | null;
  readonly targetDomain: string | null;
  readonly rationale: string;
  readonly nonce: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export type ApprovalDecision = "approved" | "denied";

export interface ResolvedApproval {
  readonly request: ApprovalRequest;
  readonly decision: ApprovalDecision;
  readonly reason: string;
  readonly resolvedAt: string;
}

/** A single audit-ledger entry, as the dashboard activity feed renders it. */
export type AuditEventType = "policy_decision" | "action" | "approval";

export interface ActivityEntry {
  readonly agentDid: string;
  readonly eventType: AuditEventType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly mandateId: string | null;
  readonly seq: number;
  readonly ts: string;
  readonly entryHash: string;
}

/** Live freeze state for an agent (the kill switch). */
export interface FrozenState {
  readonly frozen: boolean;
  readonly reason: string | null;
  readonly since: string | null;
}

/** An agent as the dashboard lists it: identity + capabilities + live status. */
export interface AgentSummary {
  readonly did: string;
  readonly displayName: string;
  readonly capabilities: readonly Capability[];
  readonly status: FrozenState;
}

// ─── Governance read-model view types (mirror packages/server/src/governance) ──

export type Verdict = "ALLOW" | "ALLOW_WITH_NOTICE" | "STEP_UP" | "DENY";
export type TrustDomain = "agent-owned" | "user-owned";
export type PassportStatus = "active" | "suspended" | "revoked";
export type DerivedMandateStatus = "revoked" | "expired" | "not-yet-active" | "active";

export type PrimitiveKind =
  | "mandate"
  | "policy"
  | "vault"
  | "hardLimits"
  | "audit"
  | "identity";

export interface PrimitiveStatus {
  readonly kind: PrimitiveKind;
  readonly label: string;
  readonly status: "ok" | "attention" | "unavailable";
  readonly detail: string;
  readonly view: string;
}

export interface GovernanceVocabulary {
  readonly mandate: string;
  readonly policyEngine: string;
  readonly verdict: string;
  readonly vault: string;
  readonly virtualCard: string;
  readonly auditLedger: string;
  readonly passport: string;
}

export interface GovernanceStatements {
  readonly agentUntrusted: string;
  readonly policyDeterministic: string;
  readonly issuerEnforcedCaps: string;
  readonly vaultNeverReachesAgent: string;
  readonly operatorTrustAnchor: string;
}

export interface GovernanceOverview {
  readonly agentDid: string;
  readonly generatedAt: string;
  readonly primitives: readonly PrimitiveStatus[];
  readonly frozenState: FrozenState;
  readonly statements: GovernanceStatements;
  readonly vocabulary: GovernanceVocabulary;
}

export interface PaySpendView {
  readonly periodSpentMinor: number;
  readonly limitPerPeriodMinor: number;
  readonly limitPerTransactionMinor: number;
  readonly currency: string;
  readonly periodDays: number;
}

export interface MandateView {
  readonly id: string;
  readonly capability: Capability;
  readonly scope: Readonly<Record<string, unknown>> & { capability: Capability };
  readonly trustDomain: TrustDomain;
  readonly stepUpThresholdMinor: number | null;
  readonly notBefore: string;
  readonly expires: string;
  readonly issuerOperatorDid: string;
  readonly operatorSigned: true;
  readonly parentId: string | null;
  readonly chainIndex: number;
  readonly status: DerivedMandateStatus;
  readonly paySpend: PaySpendView | null;
}

export interface PolicyDecisionView {
  readonly verdict: Verdict;
  readonly reason: string;
  readonly matchedMandateId: string | null;
  readonly capability: Capability | null;
  readonly action: string;
  readonly decidedAt: string;
  readonly seq: number;
  readonly pendingApprovalId: string | null;
}

export interface VirtualCardView {
  readonly handle: string;
  readonly last4: string;
  readonly mandateId: string;
  readonly perTransactionMinor: number;
  readonly perPeriodMinor: number;
  readonly periodDays: number;
  readonly allowedCategories: readonly string[];
  readonly deniedMerchants: readonly string[];
  readonly periodSpentMinor: number;
  readonly currency: string;
}

export interface VaultEntryView {
  readonly handle: string;
  readonly namespace: string;
  readonly label: string;
  readonly trustDomain: TrustDomain;
  readonly lastUsedAt: string | null;
  readonly grantingMandateId: string | null;
}

export interface AuditEntryView {
  readonly seq: number;
  readonly eventType: AuditEventType | string;
  readonly action: string | null;
  readonly mandateId: string | null;
  readonly ts: string;
  readonly entryHash: string;
}

export interface AuditView {
  readonly entries: readonly AuditEntryView[];
  readonly verified: boolean;
  readonly brokenAtSeq: number | null;
  readonly empty: boolean;
}

export interface AuditExport {
  readonly agentDid: string;
  readonly entries: readonly ActivityEntry[];
  readonly verified: boolean;
  readonly brokenAtSeq: number | null;
}

export interface IdentityView {
  readonly passportId: string;
  readonly operatorDid: string;
  readonly displayName: string;
  readonly status: PassportStatus;
}

export type AgentLifecycleStatus = "idle" | "active" | "waiting-on-input" | "frozen";

export interface RecentActionView {
  readonly capability: Capability | null;
  readonly target: string | null;
  readonly timestamp: string;
  readonly seq: number;
}

export interface CurrentWait {
  readonly kind: "step-up-approval" | "email-verification";
  readonly pendingApprovalId: string | null;
  readonly description: string;
}

export interface AgentActivityStateView {
  readonly agentDid: string;
  readonly status: AgentLifecycleStatus;
  readonly halted: boolean;
  readonly mostRecentAction: RecentActionView | null;
  readonly currentWait: CurrentWait | null;
  readonly lastUpdatedAt: string;
}

export interface ActivityTimelineEntry {
  readonly seq: number;
  readonly ts: string;
  readonly capability: Capability | null;
  readonly summary: string;
}

export interface ActivityResponse {
  readonly state: AgentActivityStateView;
  readonly timeline: readonly ActivityTimelineEntry[];
  readonly generatedAt: string;
}

// ─── Product config / licensing (mirror packages/server/src/config) ───────────

export type LicenseMode = "disabled" | "enforced";

export interface LicenseStatus {
  readonly mode: LicenseMode;
  readonly operable: boolean;
  readonly plan: string | null;
  readonly expiresAt: string | null;
  readonly reason: string;
}

export interface MandateConfig {
  readonly capability: Capability;
  readonly scope: Record<string, unknown> & { capability: Capability };
  readonly stepUpThresholdMinor: number | null;
}

export interface AppConfig {
  readonly version: 1;
  readonly operator: {
    readonly displayName: string;
    readonly preferences: { readonly telemetryOptIn: boolean };
  };
  readonly license: {
    readonly mode: LicenseMode;
    readonly proxyBaseUrl: string | null;
    readonly publicKeyBase64Url: string | null;
  };
  readonly agent: {
    readonly displayName: string;
    readonly mandates: readonly MandateConfig[];
  };
}

export interface LoadedConfig {
  readonly config: AppConfig;
  readonly firstRun: boolean;
}

export interface ConnectSnippet {
  readonly snippet: { readonly mcpServers: Record<string, { command: string; args: string[] }> };
}

/** Triage tier, derived from the request — drives the visual weight of a card. */
export type RiskTier = "elevated" | "high";

/**
 * A STEP_UP is consequential by definition. We separate the genuinely high-stakes
 * (money leaving, logging into a user-owned account) from the merely elevated, so
 * the operator's eye lands on what matters first.
 */
export const riskOf = (request: ApprovalRequest): RiskTier => {
  if (request.capability === "pay" && (request.amountMinor ?? 0) >= 1000) return "high";
  if (request.targetService === "user-owned" || request.action.includes("user-owned")) return "high";
  if (request.capability === "vault") return "high";
  return "elevated";
};
