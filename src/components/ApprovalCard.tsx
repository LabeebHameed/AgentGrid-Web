import { useState } from "react";
import { Check, X, Clock, ChevronLeft } from "lucide-react";
import { riskOf, type ApprovalDecision, type ApprovalRequest } from "../types";
import { formatAmount, formatClock, formatCountdown, headline, msUntil, shortDid } from "../lib/format";
import { CapabilityGlyph, Field, RiskBadge } from "./ui";

const DecisionBar = ({
  expired,
  busy,
  onDecide,
}: {
  expired: boolean;
  busy: boolean;
  onDecide: (decision: ApprovalDecision, reason: string) => void;
}) => {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (expired) {
    return (
      <div
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium"
        style={{ background: "var(--danger-dim)", color: "var(--danger)" }}
      >
        <X className="h-4 w-4" strokeWidth={2} aria-hidden /> Expired — the agent was auto-denied.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Add a note (optional) — recorded with your decision"
        aria-label="Decision note"
        className="w-full rounded-[var(--radius-md)] border bg-transparent px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] focus:outline-none"
        style={{ borderColor: "var(--line)" }}
      />
      {confirming ? (
        <div className="flex flex-col gap-2 rise">
          <p className="text-xs text-[var(--muted)]">
            This signs an operator approval that lets the agent proceed with exactly this action.
          </p>
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--text)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() => onDecide("approved", reason.trim() || "approved by operator")}
              className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-70 cursor-pointer"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Confirm approval
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => onDecide("denied", reason.trim() || "denied by operator")}
            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-semibold text-[var(--text)] transition-colors cursor-pointer hover:text-[var(--danger)]"
            style={{ borderColor: "var(--line-strong)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--danger-dim)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X className="h-4 w-4" strokeWidth={2.25} aria-hidden /> Deny
          </button>
          <button
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 cursor-pointer"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Approve
          </button>
        </div>
      )}
    </div>
  );
};

export const ApprovalCard = ({
  request,
  nowMs,
  busy,
  onDecide,
  onBack,
}: {
  request: ApprovalRequest;
  nowMs: number;
  busy: boolean;
  onDecide: (decision: ApprovalDecision, reason: string) => void;
  onBack?: () => void;
}) => {
  const tier = riskOf(request);
  const spine = tier === "high" ? "var(--danger)" : "var(--warn)";
  const remaining = msUntil(request.expiresAt, nowMs);
  const total = Math.max(1, Date.parse(request.expiresAt) - Date.parse(request.createdAt));
  const fraction = Math.max(0, Math.min(1, remaining / total));
  const urgent = remaining <= 60_000;
  const expired = remaining <= 0;
  const isPay = request.capability === "pay";
  const target = request.merchant ?? request.targetDomain ?? request.targetService ?? "—";

  return (
    <article
      className="rise overflow-hidden rounded-[var(--radius-lg)] border"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: spine }} aria-hidden />
        <div className="flex-1 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  aria-label="Back to all requests"
                  className="-ml-1 grid h-8 w-8 place-items-center rounded-[var(--radius-md)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer lg:hidden"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
              )}
              <span
                className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)]"
                style={{ background: "var(--surface-3)" }}
              >
                <CapabilityGlyph capability={request.capability} className="h-5 w-5 text-[var(--text)]" />
              </span>
              <div className="flex flex-col">
                <span className="mono text-xs text-[var(--subtle)]">{request.id}</span>
                <span className="text-xs text-[var(--subtle)]">requested {formatClock(request.createdAt)}</span>
              </div>
            </div>
            <RiskBadge tier={tier} />
          </div>

          {/* Focal point */}
          <div className="mt-7">
            {isPay ? (
              <>
                <div className="mono text-5xl font-semibold tracking-tight text-[var(--text)]">
                  {formatAmount(request.amountMinor, request.currency)}
                </div>
                <p className="mt-2 text-lg text-[var(--muted)]">
                  to <span className="text-[var(--text)]">{request.merchant}</span>
                </p>
              </>
            ) : (
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[var(--text)]">
                {headline(request)}
              </h1>
            )}
          </div>

          {/* Facts */}
          <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-3">
            <Field label="Capability">{request.capability}</Field>
            <Field label="Action" mono>
              {request.action}
            </Field>
            <Field label="Target">{target}</Field>
            <Field label="Agent" mono>
              {shortDid(request.agent)}
            </Field>
            <Field label="Nonce" mono>
              {request.nonce}
            </Field>
            <Field label="Expires">{new Date(request.expiresAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</Field>
          </div>

          {/* Agent's stated reason */}
          <div
            className="mt-6 rounded-[var(--radius-md)] border-l-2 px-4 py-3"
            style={{ borderColor: "var(--line-strong)", background: "var(--surface-2)" }}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle)]">Agent's rationale</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">“{request.rationale}”</p>
          </div>

          <div className="perforation my-7" />

          {/* Time + decision */}
          <div className="mb-4 flex items-center justify-between">
            <span
              className="inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: urgent && !expired ? "var(--danger)" : "var(--muted)" }}
            >
              <Clock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {expired ? "Expired" : `Auto-denies in ${formatCountdown(remaining)}`}
            </span>
            <span className="mono text-xs text-[var(--subtle)]">fail-closed</span>
          </div>
          <div className="mb-5 h-1 overflow-hidden rounded-[var(--radius-full)]" style={{ background: "var(--surface-3)" }}>
            <div
              className="h-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${fraction * 100}%`, background: urgent ? "var(--danger)" : "var(--warn)" }}
            />
          </div>

          <DecisionBar expired={expired} busy={busy} onDecide={onDecide} />
        </div>
      </div>
    </article>
  );
};
