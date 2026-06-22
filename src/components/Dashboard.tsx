import { useState } from "react";
import {
  Activity as ActivityIcon,
  Bot,
  CheckCircle2,
  Octagon,
  Play,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { ActivityEntry, AgentSummary } from "../types";
import { shortDid, formatClock } from "../lib/format";
import { CapabilityGlyph } from "./ui";

/** Color + label for an activity row, keyed by what the agent did. */
const verdictStyle = (entry: ActivityEntry): { label: string; color: string; bg: string } => {
  const verdict = entry.payload["verdict"];
  const status = entry.payload["status"];
  if (entry.eventType === "action") {
    const ok = entry.payload["ok"] === true;
    return ok
      ? { label: "Action", color: "var(--ok)", bg: "var(--ok-dim)" }
      : { label: "Action failed", color: "var(--danger)", bg: "var(--danger-dim)" };
  }
  if (entry.eventType === "approval") {
    return status === "approved"
      ? { label: "Approved", color: "var(--ok)", bg: "var(--ok-dim)" }
      : { label: "Approval", color: "var(--warn)", bg: "var(--warn-dim)" };
  }
  // policy_decision
  if (verdict === "DENY") return { label: "Denied", color: "var(--danger)", bg: "var(--danger-dim)" };
  if (verdict === "STEP_UP") return { label: "Step-up", color: "var(--warn)", bg: "var(--warn-dim)" };
  return { label: "Allowed", color: "var(--ok)", bg: "var(--ok-dim)" };
};

const actionOf = (entry: ActivityEntry): string => {
  const action = entry.payload["action"];
  return typeof action === "string" ? action : entry.eventType;
};

const detailOf = (entry: ActivityEntry): string => {
  const summary = entry.payload["summary"];
  const reason = entry.payload["reason"];
  if (typeof summary === "string") return summary;
  if (typeof reason === "string") return reason;
  return "—";
};

const KillSwitch = ({
  agent,
  busy,
  onFreeze,
  onUnfreeze,
  onDelete,
}: {
  agent: AgentSummary;
  busy: boolean;
  onFreeze: (reason: string) => void;
  onUnfreeze: () => void;
  onDelete: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);
  const [deletingConfirm, setDeletingConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const frozen = agent.status.frozen;

  return (
    <div
      className="rounded-[var(--radius-lg)] border p-5"
      style={{
        borderColor: frozen ? "var(--danger)" : "var(--line)",
        background: frozen ? "var(--danger-dim)" : "var(--surface)",
      }}
    >
      <div className="flex items-start gap-4">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-full)]"
          style={{ background: frozen ? "var(--danger)" : "var(--surface-3)" }}
        >
          {frozen ? (
            <Octagon className="h-5 w-5" style={{ color: "var(--bg)" }} strokeWidth={2} aria-hidden />
          ) : (
            <Bot className="h-5 w-5 text-[var(--muted)]" strokeWidth={1.75} aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-[var(--text)]">{agent.displayName}</h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-semibold"
              style={{
                color: frozen ? "var(--danger)" : "var(--ok)",
                background: frozen ? "var(--bg)" : "var(--ok-dim)",
              }}
            >
              {frozen ? <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> : <ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
              {frozen ? "Frozen" : "Active"}
            </span>
          </div>
          <p className="mono mt-0.5 truncate text-xs text-[var(--subtle)]">{shortDid(agent.did)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]"
                style={{ background: "var(--surface-2)" }}
              >
                <CapabilityGlyph capability={cap} className="h-3 w-3" />
                {cap}
              </span>
            ))}
          </div>
          {frozen && agent.status.reason !== null && (
            <p className="mt-3 text-xs text-[var(--danger)]">
              Frozen{agent.status.since !== null ? ` at ${formatClock(agent.status.since)}` : ""}: {agent.status.reason}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        {frozen ? (
          <button
            onClick={onUnfreeze}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--surface-3)", color: "var(--text)" }}
          >
            <Play className="h-4 w-4" strokeWidth={2} aria-hidden />
            Resume agent
          </button>
        ) : confirming ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional) — e.g. looks compromised"
              className="flex-1 rounded-[var(--radius-md)] border bg-transparent px-3 py-2 text-sm text-[var(--text)] outline-none"
              style={{ borderColor: "var(--line)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onFreeze(reason.trim());
                  setConfirming(false);
                  setReason("");
                }}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50 cursor-pointer"
                style={{ background: "var(--danger)" }}
              >
                <Octagon className="h-4 w-4" strokeWidth={2} aria-hidden />
                Freeze now
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--muted)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : deletingConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete();
                setDeletingConfirm(false);
              }}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50 cursor-pointer"
              style={{ background: "var(--danger)" }}
            >
              Confirm delete
            </button>
            <button
              onClick={() => setDeletingConfirm(false)}
              className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--muted)] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
            >
              <Octagon className="h-4 w-4" strokeWidth={2} aria-hidden />
              Freeze agent
            </button>
            <button
              onClick={() => setDeletingConfirm(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50 cursor-pointer"
              style={{ background: "var(--danger)" }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityFeed = ({ entries }: { entries: readonly ActivityEntry[] }) => {
  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border py-16 text-center"
        style={{ borderColor: "var(--line)" }}
      >
        <CheckCircle2 className="h-6 w-6 text-[var(--subtle)]" aria-hidden />
        <p className="mt-2 text-sm text-[var(--subtle)]">No activity yet. The agent hasn't acted.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((entry) => {
        const v = verdictStyle(entry);
        return (
          <div
            key={`${entry.entryHash}-${entry.seq}`}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <span
              className="inline-flex w-24 shrink-0 items-center justify-center rounded-[var(--radius-full)] px-2 py-1 text-[11px] font-semibold"
              style={{ color: v.color, background: v.bg }}
            >
              {v.label}
            </span>
            <div className="min-w-0 flex-1">
              <p className="mono truncate text-sm font-medium text-[var(--text)]">{actionOf(entry)}</p>
              <p className="truncate text-xs text-[var(--subtle)]">{detailOf(entry)}</p>
            </div>
            <span className="mono shrink-0 text-xs text-[var(--subtle)]">{formatClock(entry.ts)}</span>
          </div>
        );
      })}
    </div>
  );
};

export const Dashboard = ({
  agents,
  activity,
  selectedAgentDid,
  busy,
  onFreeze,
  onUnfreeze,
  onDelete,
}: {
  agents: readonly AgentSummary[];
  activity: readonly ActivityEntry[];
  selectedAgentDid: string | null;
  busy: boolean;
  onFreeze: (params: { agentDid: string; reason: string }) => void;
  onUnfreeze: (params: { agentDid: string }) => void;
  onDelete: (params: { agentDid: string }) => void;
}) => {
  const filteredActivity = selectedAgentDid
    ? activity.filter((entry) => entry.agentDid === selectedAgentDid)
    : activity;

  return (
  <div className="flex flex-col gap-8">
    <section>
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-[var(--text)]">Agents</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        What each agent can do — and the kill switch to halt it instantly.
      </p>
      <div className="flex flex-col gap-3">
        {agents.map((agent) => (
          <KillSwitch
            key={agent.did}
            agent={agent}
            busy={busy}
            onFreeze={(reason) => onFreeze({ agentDid: agent.did, reason })}
            onUnfreeze={() => onUnfreeze({ agentDid: agent.did })}
            onDelete={() => onDelete({ agentDid: agent.did })}
          />
        ))}
      </div>
    </section>

    <section>
      <div className="mb-5 flex items-center gap-2">
        <ActivityIcon className="h-5 w-5 text-[var(--muted)]" strokeWidth={1.75} aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">Live activity</h2>
      </div>
      <ActivityFeed entries={filteredActivity} />
    </section>
  </div>
);};
