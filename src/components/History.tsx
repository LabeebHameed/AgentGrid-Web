import { Check, X } from "lucide-react";
import type { ResolvedApproval } from "../types";
import { formatAmount, formatClock, headline } from "../lib/format";
import { CapabilityGlyph } from "./ui";

const DecisionTag = ({ approved }: { approved: boolean }) => {
  const color = approved ? "var(--ok)" : "var(--danger)";
  const bg = approved ? "var(--ok-dim)" : "var(--danger-dim)";
  const Icon = approved ? Check : X;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-semibold"
      style={{ color, background: bg }}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      {approved ? "Approved" : "Denied"}
    </span>
  );
};

export const History = ({ items }: { items: readonly ResolvedApproval[] }) => {
  if (items.length === 0) {
    return <p className="px-1 py-8 text-sm text-[var(--subtle)]">No decisions yet.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map(({ request, decision, reason, resolvedAt }) => (
        <div
          key={request.id}
          className="flex items-center gap-4 rounded-[var(--radius-md)] border px-4 py-3.5"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)]" style={{ background: "var(--surface-3)" }}>
            <CapabilityGlyph capability={request.capability} className="h-4 w-4 text-[var(--muted)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text)]">{headline(request)}</p>
            <p className="truncate text-xs text-[var(--subtle)]">
              <span className="mono">{request.id}</span> · {reason}
            </p>
          </div>
          {request.amountMinor !== null && (
            <span className="mono hidden text-sm text-[var(--muted)] sm:block">
              {formatAmount(request.amountMinor, request.currency)}
            </span>
          )}
          <span className="mono text-xs text-[var(--subtle)]">{formatClock(resolvedAt)}</span>
          <DecisionTag approved={decision === "approved"} />
        </div>
      ))}
    </div>
  );
};
