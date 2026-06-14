import type { ApprovalDecision, ApprovalRequest, ResolvedApproval } from "./types";
import { seedHistory, seedPending } from "./seed";

/**
 * The boundary to the Aegis approval transport. The MVP runs against an in-browser
 * seeded store so the surface is fully demoable with no backend; `HttpApi` is the
 * same contract over the real PendingApprovalStore (GET /api/approvals, POST a
 * signed decision) for when the operator-signing backend is wired up.
 */
export interface ApprovalApi {
  listPending(): Promise<readonly ApprovalRequest[]>;
  listHistory(): Promise<readonly ResolvedApproval[]>;
  decide(params: { id: string; decision: ApprovalDecision; reason: string }): Promise<void>;
}

export class SeedApi implements ApprovalApi {
  #pending: ApprovalRequest[] = seedPending();
  #history: ResolvedApproval[] = seedHistory();

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
}

export class HttpApi implements ApprovalApi {
  readonly #base: string;
  constructor(base: string) {
    this.#base = base;
  }
  async listPending(): Promise<readonly ApprovalRequest[]> {
    const res = await fetch(`${this.#base}/api/approvals`);
    if (!res.ok) throw new Error(`approvals fetch failed: ${res.status}`);
    return (await res.json()) as ApprovalRequest[];
  }
  async listHistory(): Promise<readonly ResolvedApproval[]> {
    const res = await fetch(`${this.#base}/api/approvals/history`);
    if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
    return (await res.json()) as ResolvedApproval[];
  }
  async decide(params: { id: string; decision: ApprovalDecision; reason: string }): Promise<void> {
    const res = await fetch(`${this.#base}/api/approvals/${encodeURIComponent(params.id)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: params.decision, reason: params.reason }),
    });
    if (!res.ok) throw new Error(`decision failed: ${res.status}`);
  }
}
