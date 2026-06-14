import { riskOf, type ApprovalRequest } from "../types";
import { formatAmount, formatCountdown, headline, msUntil } from "../lib/format";
import { CapabilityGlyph } from "./ui";

const Row = ({
  request,
  selected,
  nowMs,
  onSelect,
}: {
  request: ApprovalRequest;
  selected: boolean;
  nowMs: number;
  onSelect: () => void;
}) => {
  const tier = riskOf(request);
  const dot = tier === "high" ? "var(--danger)" : "var(--warn)";
  const remaining = msUntil(request.expiresAt, nowMs);
  const urgent = remaining <= 60_000;
  return (
    <button
      onClick={onSelect}
      aria-current={selected}
      className="group flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 text-left transition-colors cursor-pointer"
      style={{
        background: selected ? "var(--surface-2)" : "transparent",
        borderColor: selected ? "var(--line-strong)" : "transparent",
      }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)]"
        style={{ background: "var(--surface-3)" }}
      >
        <CapabilityGlyph capability={request.capability} className="h-[18px] w-[18px] text-[var(--muted)]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
          <span className="truncate text-sm font-medium text-[var(--text)]">{headline(request)}</span>
        </span>
        <span className="mono mt-0.5 block truncate text-xs text-[var(--subtle)]">{request.id}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {request.amountMinor !== null && (
          <span className="mono text-sm font-semibold text-[var(--text)]">
            {formatAmount(request.amountMinor, request.currency)}
          </span>
        )}
        <span className="mono text-xs" style={{ color: urgent ? "var(--danger)" : "var(--subtle)" }}>
          {formatCountdown(remaining)}
        </span>
      </span>
    </button>
  );
};

export const InboxList = ({
  requests,
  selectedId,
  nowMs,
  onSelect,
}: {
  requests: readonly ApprovalRequest[];
  selectedId: string | null;
  nowMs: number;
  onSelect: (id: string) => void;
}) => (
  <div className="flex flex-col gap-1">
    {requests.map((request) => (
      <Row
        key={request.id}
        request={request}
        selected={request.id === selectedId}
        nowMs={nowMs}
        onSelect={() => onSelect(request.id)}
      />
    ))}
  </div>
);
