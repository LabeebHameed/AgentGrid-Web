import type { ApprovalRequest } from "../types";

export const formatAmount = (amountMinor: number | null, currency: string | null): string => {
  if (amountMinor === null || currency === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);
};

/** Shorten a did:key for display, keeping the head and tail. */
export const shortDid = (did: string): string => {
  const body = did.replace(/^did:key:/, "");
  return body.length <= 14 ? did : `did:key:${body.slice(0, 6)}…${body.slice(-6)}`;
};

/** A human one-liner for what the agent is asking to do. */
export const headline = (request: ApprovalRequest): string => {
  switch (request.capability) {
    case "pay": {
      const amount = formatAmount(request.amountMinor, request.currency);
      return `Pay ${amount} to ${request.merchant ?? "a merchant"}`;
    }
    case "browse":
      return `Log in to ${request.targetDomain ?? request.targetService ?? "a site"}`;
    case "deploy":
      return `Deploy to ${request.targetService ?? "the agent cloud"}`;
    case "comms":
      return `Send a message via ${request.targetService ?? "comms"}`;
    case "signup":
      return `Create an account on ${request.targetDomain ?? "a service"}`;
    case "vault":
      return `Use a stored credential`;
    default:
      return request.action;
  }
};

/** ms remaining until expiry; negative once expired. */
export const msUntil = (iso: string, nowMs: number): number => Date.parse(iso) - nowMs;

export const formatCountdown = (ms: number): string => {
  if (ms <= 0) return "expired";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const formatClock = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
