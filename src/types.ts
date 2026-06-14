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
