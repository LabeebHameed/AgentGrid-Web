import { useState, useRef, useCallback, useEffect, useId } from "react";
import { useStore } from "./data";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DollarSign, Eye, UserCheck, ShieldCheck, Check, X, Fingerprint,
} from "lucide-react";

type BtnVariant = "primary" | "ghost" | "subtle" | "danger" | "ok";

export function Btn({
  children,
  variant = "subtle",
  sm,
  block,
  icon,
  className,
  ...rest
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  sm?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        `ad-btn ad-btn-${variant}${sm ? " sm" : ""}${block ? " block" : ""} active:scale-[0.96] transition-transform duration-100`,
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconBtn({
  children,
  className,
  ...rest
}: { children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("ad-iconbtn active:scale-[0.96] transition-transform duration-100", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export type ChipTone = "ok" | "warn" | "bad" | "info" | "muted" | "mono";
export function Chip({ tone = "muted", dot, children }: { tone?: ChipTone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={`ad-chip ${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      className={`ad-toggle${on ? " on" : ""} active:scale-[0.96] transition-transform duration-100`}
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label || "toggle"}
      type="button"
    />
  );
}

export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaTone = "ok",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  delta?: string;
  deltaTone?: "ok" | "bad" | "muted";
}) {
  const deltaColor = deltaTone === "ok" ? "var(--d-ok)" : deltaTone === "bad" ? "var(--d-bad)" : "var(--d-faint)";
  return (
    <div className="ad-stat-card card-lift ad-rise">
      <div className="ad-stat-label">
        <span className="ad-stat-ico">{icon}</span>
        {label}
      </div>
      <div className="ad-stat-value font-tabular">{value}</div>
      {delta && <div className="ad-stat-delta font-tabular" style={{ color: deltaColor }}>{delta}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  // Staggered reveal: icon, title, description each animate in sequence.
  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const, delay },
  });
  return (
    <div className="ad-empty">
      <motion.div className="ico" {...reveal(0)}>
        <span className="ad-empty-ico-glow" aria-hidden />
        {icon}
      </motion.div>
      <motion.h3 {...reveal(0.08)}>{title}</motion.h3>
      {children && <motion.p {...reveal(0.16)}>{children}</motion.p>}
    </div>
  );
}

/* ============================================================
   Segmented control with sliding active pill (Framer Motion)
   ============================================================ */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  layoutId,
  size = "md",
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  /** Unique layoutId so multiple segmented controls don't share the pill. */
  layoutId: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div
      className={`ad-seg ad-seg-${size}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={active ? "is-active" : ""}
            onClick={() => onChange(o.value)}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="ad-seg-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
              />
            )}
            <span className="label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[1.5rem] leading-[1.15] font-semibold tracking-tight text-foreground text-balance">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground text-pretty">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ad-page-shell", className)}>
      {children}
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="ad-toasts">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`ad-toast ${t.tone}`}
            onClick={() => dismissToast(t.id)}
            role="status"
            aria-live="polite"
            style={{ cursor: "pointer" }}
            initial={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.96, filter: "blur(2px)" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="bar" />
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Interactive SVG Area Chart
// ============================================================
interface ChartPoint { label: string; value: number }

export function InteractiveChart({
  data,
  height = 160,
  color = "var(--d-ink)",
  unit = "",
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  unit?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; point: ChartPoint } | null>(null);

  const padding = { top: 10, right: 8, bottom: 4, left: 8 };
  const w = 400;
  const h = height;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const maxV = Math.max(...data.map((d) => d.value), 1);
  const minV = Math.min(...data.map((d) => d.value), 0);
  const range = maxV - minV || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * plotW,
    y: padding.top + plotH - ((d.value - minV) / range) * plotH,
    ...d,
  }));

  const linePath = points.map((p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = points[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 3;
    const cp1y = prev.y;
    const cp2x = p.x - (p.x - prev.x) / 3;
    const cp2y = p.y;
    return `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p.x},${p.y}`;
  }).join(" ");
  
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x},${h} L ${points[0].x},${h} Z`
    : "";

  const uniqueId = useId();
  const gradId = `chart-grad-${uniqueId.replace(/:/g, "")}`;

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!wrapRef.current || points.length === 0) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * w;
      let closest = points[0];
      let minDist = Infinity;
      for (const p of points) {
        const dist = Math.abs(p.x - mx);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }
      const px = (closest.x / w) * rect.width;
      const py = (closest.y / h) * rect.height;
      setHover({ x: px, y: py, point: closest });
    },
    [points, w, h]
  );

  return (
    <div className="ad-chart-wrap" ref={wrapRef} onMouseMove={onMouseMove} onMouseLeave={() => setHover(null)} style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.08" />
            <stop offset="60%" stopColor={color} stopOpacity="0.01" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.length > 1 && (
          <>
            <path d={areaPath} fill={`url(#${gradId})`} />
            {/* Main foreground path with crisp, delicate line */}
            <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {/* Active pulsing end dot when idle */}
        {!hover && points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3.5"
            fill={color}
            stroke="var(--d-panel)"
            strokeWidth="1.5"
            style={{
              transformOrigin: `${points[points.length - 1].x}px ${points[points.length - 1].y}px`,
              animation: "chart-pulse 2s infinite ease-in-out"
            }}
          />
        )}
        {hover && (
          <circle
            className="ad-chart-dot visible"
            cx={points.find((p) => p.label === hover.point.label)?.x}
            cy={points.find((p) => p.label === hover.point.label)?.y}
            r="3.5"
            fill={color}
            stroke="var(--d-panel)"
            strokeWidth="1.5"
          />
        )}
      </svg>
      {hover && (
        <div
          className="ad-chart-tooltip visible"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="label">{hover.point.label}</div>
          <div>{unit}{hover.point.value.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Countdown Ring
// ============================================================
export function CountdownRing({ remaining, total }: { remaining: number; total: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, remaining / total));
  const offset = circ * (1 - pct);

  const formatTime = (rem: number) => {
    if (rem <= 0) return "0s";
    if (rem < 60) return `${rem}s`;
    return `${Math.ceil(rem / 60)}m`;
  };

  return (
    <div className="ad-countdown-ring">
      <svg viewBox="0 0 36 36">
        <circle className="track" cx="18" cy="18" r={r} />
        <circle className="progress" cx="18" cy="18" r={r} strokeDasharray={circ} strokeDashoffset={-offset} />
      </svg>
      <span className="time">{formatTime(remaining)}</span>
    </div>
  );
}

// ============================================================
// JSON Tree Viewer
// ============================================================
export function JsonTree({ data }: { data: Record<string, unknown> }) {
  const format = (obj: unknown, indent: number): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    const pad = "  ".repeat(indent);
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      const entries = Object.entries(obj);
      entries.forEach(([k, v], i) => {
        const comma = i < entries.length - 1 ? "," : "";
        if (typeof v === "string") {
          nodes.push(<span key={`${indent}-${k}`}>{pad}<span className="key">"{k}"</span>: <span className="str">"{v}"</span>{comma}{"\n"}</span>);
        } else if (typeof v === "number") {
          nodes.push(<span key={`${indent}-${k}`}>{pad}<span className="key">"{k}"</span>: <span className="num">{v}</span>{comma}{"\n"}</span>);
        } else if (typeof v === "boolean") {
          nodes.push(<span key={`${indent}-${k}`}>{pad}<span className="key">"{k}"</span>: <span className="bool">{v ? "true" : "false"}</span>{comma}{"\n"}</span>);
        } else if (typeof v === "object" && v !== null) {
          nodes.push(<span key={`${indent}-${k}-open`}>{pad}<span className="key">"{k}"</span>: {"{"}{"\n"}</span>);
          nodes.push(...format(v, indent + 1));
          nodes.push(<span key={`${indent}-${k}-close`}>{pad}{"}"}{comma}{"\n"}</span>);
        }
      });
    }
    return nodes;
  };

  return (
    <div className="ad-json-tree">
      {"{\n"}
      {format(data, 1)}
      {"}"}
    </div>
  );
}

// ============================================================
// Policy Composer Modal
// ============================================================
type ComposerStep = "template" | "configure" | "signing" | "done";

const TEMPLATES = [
  { id: "spend", label: "Spending Cap", desc: "Limit monthly API spend per agent", icon: <DollarSign size={20} /> },
  { id: "readonly", label: "Read-Only", desc: "Allow reads, block all mutations", icon: <Eye size={20} /> },
  { id: "stepup", label: "Step-Up Auth", desc: "Require human approval above threshold", icon: <UserCheck size={20} /> },
] as const;

const SIGN_STEPS = ["Hashing policy payload…", "Applying local signing key…", "Verifying chain integrity…", "Appending to mandate ledger…"];

export function PolicyComposer({ onClose, onSubmit }: { onClose: () => void; onSubmit: (template: string, name: string, limit: number) => void }) {
  const [step, setStep] = useState<ComposerStep>("template");
  const [tmpl, setTmpl] = useState<string>("spend");
  const [name, setName] = useState("");
  const [limit, setLimit] = useState(500);
  const [signIdx, setSignIdx] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === "signing") {
      const id = setInterval(() => {
        setSignIdx((prev) => {
          if (prev >= SIGN_STEPS.length - 1) {
            clearInterval(id);
            setTimeout(() => setStep("done"), 600);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
      return () => clearInterval(id);
    }
  }, [step]);

  // ESC to close + focus trap inside the dialog. Skip when the signing
  // animation is running so users don't accidentally dismiss mid-sign.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "signing") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    // Move initial focus into the dialog.
    const t = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      target?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [onClose, step]);

  const handleSign = () => {
    setSignIdx(0);
    setStep("signing");
  };

  const handleFinish = () => {
    onSubmit(tmpl, name || TEMPLATES.find((t) => t.id === tmpl)?.label || "Policy", limit);
    onClose();
  };

  return (
    <motion.div
      className="ad-composer-mask"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={dialogRef}
        className="ad-composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-composer-title"
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      >
        <div className="ad-composer-header">
          <h2 id="policy-composer-title"><ShieldCheck size={18} style={{ verticalAlign: -3, marginRight: 8 }} />New Mandate</h2>
          <button className="ad-iconbtn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <AnimatePresence mode="wait">
          {step === "template" && (
            <motion.div key="tmpl" className="ad-composer-body" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>
              <div style={{ fontSize: 13, color: "var(--d-muted)", marginBottom: 4 }}>Choose a policy template</div>
              <div className="ad-template-grid">
                {TEMPLATES.map((t) => (
                  <button key={t.id} className={`ad-template-card${tmpl === t.id ? " selected" : ""}`} onClick={() => setTmpl(t.id)} type="button">
                    <span className="ico">{t.icon}</span>
                    <span className="title">{t.label}</span>
                    <span className="desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "configure" && (
            <motion.div key="cfg" className="ad-composer-body" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>
              <div>
                <label className="ad-field-label">Mandate name</label>
                <input className="ad-input" placeholder={TEMPLATES.find((t) => t.id === tmpl)?.label} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="ad-field-label">
                  {tmpl === "spend" ? "Monthly limit (USD)" : tmpl === "stepup" ? "Step-up threshold (USD)" : "Max read operations / day"}
                </label>
                <input className="ad-input" type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value) || 0)} style={{ maxWidth: 220 }} />
              </div>
              <div style={{ background: "var(--d-soft)", borderRadius: "var(--d-r-sm)", padding: "14px 16px", fontSize: 12, color: "var(--d-muted)", lineHeight: 1.6 }}>
                <div style={{ fontWeight: 650, marginBottom: 4, color: "var(--d-ink)" }}>Policy summary</div>
                Template: <strong>{TEMPLATES.find((t) => t.id === tmpl)?.label}</strong><br />
                Applies to: All governed agents<br />
                Limit: <strong>${limit.toLocaleString()}</strong>
              </div>
            </motion.div>
          )}

          {step === "signing" && (
            <motion.div key="sign" className="ad-composer-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <div className="ad-sign-progress">
                <div className="ad-sign-spinner" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={signIdx}
                    className="ad-sign-step"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    {SIGN_STEPS[signIdx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" className="ad-composer-body" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="ad-sign-progress">
                <motion.div
                  className="ad-sign-done"
                  initial={{ scale: 0.25, opacity: 0, rotate: 80, filter: "blur(8px)" }}
                  animate={{ scale: 1, opacity: 1, rotate: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.5, ease: [0.34, 1.35, 0.64, 1] }}
                >
                  <Check size={24} />
                </motion.div>
                <div style={{ fontWeight: 650, fontSize: 16, color: "var(--d-ink)" }}>Mandate signed successfully</div>
                <div style={{ fontSize: 13, color: "var(--d-muted)" }}>Hash-chained to your audit ledger.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ad-composer-foot">
          {step === "template" && (
            <>
              <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
              <Btn variant="primary" onClick={() => setStep("configure")}>Continue</Btn>
            </>
          )}
          {step === "configure" && (
            <>
              <Btn variant="ghost" onClick={() => setStep("template")}>Back</Btn>
              <Btn variant="primary" icon={<ShieldCheck size={15} />} onClick={handleSign}>Sign &amp; deploy</Btn>
            </>
          )}
          {step === "done" && (
            <Btn variant="primary" onClick={handleFinish}>Done</Btn>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Biometric Verification Overlay
// ============================================================
export function BiometricOverlay({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"scanning" | "success">("scanning");

  useEffect(() => {
    const t = setTimeout(() => setPhase("success"), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === "success") {
      const t = setTimeout(onComplete, 1000);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  return (
    <motion.div
      className="ad-bio-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="ad-bio-card"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait">
          {phase === "scanning" ? (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div className="ad-bio-fingerprint" style={{ position: "relative" }}>
                {/* Expanding pulsing concentric wave rings */}
                <div style={{
                  position: "absolute",
                  inset: -6,
                  borderRadius: "50%",
                  border: "1.5px solid var(--d-crimson)",
                  opacity: 0.22,
                  animation: "ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite"
                }} style-id="wave1" />
                <div style={{
                  position: "absolute",
                  inset: -14,
                  borderRadius: "50%",
                  border: "1.5px solid var(--d-crimson)",
                  opacity: 0.12,
                  animation: "ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite",
                  animationDelay: "350ms"
                }} style-id="wave2" />
                <Fingerprint size={28} className="animate-pulse" />
              </div>
              <div style={{ fontWeight: 650, fontSize: 15, color: "var(--d-ink)" }}>Verifying identity</div>
              <div style={{ fontSize: 13, color: "var(--d-muted)" }}>Authenticating with device passkey…</div>
            </motion.div>
          ) : (
            <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <motion.div
                className="ad-bio-fingerprint success"
                initial={{ scale: 0.25, opacity: 0, rotate: 80, filter: "blur(8px)" }}
                animate={{ scale: 1, opacity: 1, rotate: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.5, ease: [0.34, 1.35, 0.64, 1] }}
                style={{ position: "relative" }}
              >
                {/* Success flash ring */}
                <div style={{
                  position: "absolute",
                  inset: -10,
                  borderRadius: "50%",
                  border: "2px solid var(--d-ok)",
                  opacity: 0,
                  animation: "ping 0.8s cubic-bezier(0, 0, 0.2, 1) 1"
                }} style-id="success-wave" />
                <Check size={28} />
              </motion.div>
              <div style={{ fontWeight: 650, fontSize: 15, color: "var(--d-ink)" }}>Approved</div>
              <div style={{ fontSize: 13, color: "var(--d-muted)" }}>Cryptographic signature applied.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}


