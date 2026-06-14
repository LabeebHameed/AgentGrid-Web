import type { ReactNode } from "react";
import {
  CreditCard,
  LogIn,
  Rocket,
  Mail,
  UserPlus,
  KeyRound,
  ShieldQuestion,
  type LucideIcon,
} from "lucide-react";
import type { Capability, RiskTier } from "../types";

const GLYPH: Record<Capability, LucideIcon> = {
  pay: CreditCard,
  browse: LogIn,
  deploy: Rocket,
  comms: Mail,
  signup: UserPlus,
  vault: KeyRound,
};

export const CapabilityGlyph = ({ capability, className }: { capability: Capability; className?: string }) => {
  const Icon = GLYPH[capability] ?? ShieldQuestion;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
};

const RISK_LABEL: Record<RiskTier, string> = { high: "High risk", elevated: "Step-up" };

/** Risk reads through one semantic color; never two same-hue tones (contrast). */
export const RiskBadge = ({ tier }: { tier: RiskTier }) => {
  const isHigh = tier === "high";
  const color = isHigh ? "var(--danger)" : "var(--warn)";
  const bg = isHigh ? "var(--danger-dim)" : "var(--warn-dim)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
      style={{ color, background: bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />
      {RISK_LABEL[tier]}
    </span>
  );
};

/** A labelled fact in the request — label muted, value high-signal. */
export const Field = ({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--subtle)]">{label}</span>
    <span className={`text-sm text-[var(--text)] ${mono ? "mono" : ""}`}>{children}</span>
  </div>
);
