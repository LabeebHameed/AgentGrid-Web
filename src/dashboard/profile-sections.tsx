"use client";
import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Plus, Settings, ShieldCheck, Copy, Check, X,
  Smartphone, Monitor, LogOut, Globe, ChevronDown, Clock,
  AlertTriangle, Download, Trash2, EyeOff, Eye, KeyRound, RefreshCw, Mail,
} from "lucide-react";
import { useStore } from "./data";
import { Chip, Btn } from "./ui";

// ---------- shared motion ----------
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
// ---------- shared types ----------
export interface Session {
  id: string;
  kind: "desktop" | "mobile" | "tablet";
  name: string;
  location: string;
  browser: string;
  lastSeen: number;
  current?: boolean;
}
export interface Passkey {
  id: string;
  name: string;
  addedAt: number;
}

// ---------- ModalShell ----------
export function ModalShell({
  open, onClose, title, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Capture the trigger element on open; restore focus on close.
  useEffect(() => {
    if (open) {
      previousFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    } else {
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") {
        const t = window.setTimeout(() => prev.focus(), 0);
        return () => window.clearTimeout(t);
      }
    }
    return;
  }, [open]);

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus trap + initial focus into the panel.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const getFocusable = (): HTMLElement[] => {
      const sel =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(panel.querySelectorAll<HTMLElement>(sel));
    };

    // Move focus into the panel after mount.
    const focusables = getFocusable();
    if (focusables.length > 0) {
      window.setTimeout(() => focusables[0].focus(), 50);
    }

    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !panel.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onTab);
    return () => document.removeEventListener("keydown", onTab);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="presentation"
        >
          <div className="absolute inset-0 bg-black/70" aria-hidden />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            className="ad-card pad relative z-10 w-full max-w-md outline-none"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={reduce ? { duration: 0.16 } : { type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="modal-title" className="text-lg font-semibold">{title}</h3>
              <button onClick={onClose} aria-label="Close"
                className="text-muted-foreground focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40 rounded-md p-1">
                <X size={16} />
              </button>
            </div>
            <div>{children}</div>
            {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
// ---------- 1. Identity (pinned hero) ----------
export function IdentityHero({
  displayName, setDisplayName, did,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  did: string;
}) {
  const { toast } = useStore();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();
  const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyDid = () => {
    navigator.clipboard?.writeText(did);
    setCopied(true);
    toast("DID copied", "ok");
    setTimeout(() => setCopied(false), 1400);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
      toast("Avatar updated", "ok");
    }
  };

  return (
    <motion.div variants={fadeUp} data-slot="card" className="ad-card pad flex items-center gap-6 group">
      <div className="relative shrink-0">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        <motion.img
          src={avatarUrl}
          alt="Profile"
          className="size-20 md:size-24 rounded-2xl border-2 border-border object-cover transition-shadow cursor-pointer"
          whileHover={reduce ? {} : { scale: 1.03 }}
          onClick={handleAvatarClick}
        />
        <motion.button
          whileTap={reduce ? {} : { scale: 0.96 }}
          className="absolute -bottom-1 -right-1 size-7 rounded-full bg-card border border-border flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40"
          onClick={handleAvatarClick}
          aria-label="Upload new avatar"
        >
          <Plus size={14} />
        </motion.button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait" initial={false}>
            {editing ? (
              <motion.input
                key="input"
                autoFocus value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => { setEditing(false); toast("Display name saved", "ok"); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditing(false);
                    toast("Display name saved", "ok");
                  }
                }}
                className="ad-input text-xl font-bold h-auto py-1"
                style={{ maxWidth: 240 }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.13 }}
              />
            ) : (
              <motion.h2
                key="text"
                className="text-xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {displayName}
              </motion.h2>
            )}
          </AnimatePresence>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit display name"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40 rounded-md p-1"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1">Operator · Agenttag Control Plane</div>
        <div className="flex items-center gap-2 mt-2">
          <span className="size-2 rounded-full bg-[var(--d-ok)]" aria-hidden />
          <span className="text-xs text-muted-foreground">Online now</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <code className="font-mono text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md border border-border">
            {did}
          </code>
          <button
            onClick={copyDid}
            aria-label="Copy DID"
            className="relative text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40 rounded-md p-1"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  className="text-[var(--d-ok)] inline-flex"
                >
                  <Check size={12} />
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex">
                  <Copy size={12} />
                </motion.span>
              )}
            </AnimatePresence>
            <span className="sr-only" aria-live="polite">{copied ? "DID copied" : ""}</span>
          </button>
        </div>
        <div className="mt-3">
          <Chip tone="ok" dot>
            <ShieldCheck size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
            Verified · Tier 2
          </Chip>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- placeholder section exports ----------

// ---------- 2. Contact ----------
export function ContactSection({
  onScrollToPrefs,
}: {
  onScrollToPrefs: () => void;
}) {
  const { toast } = useStore();
  const [email, setEmail] = useState("operator@agenttag.me");
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);

  const savePhone = () => {
    if (!phoneDraft.trim()) return;
    setPhone(phoneDraft.trim());
    setPhoneDraft("");
    toast("Phone added", "ok");
  };

  const handleEmailAction = () => {
    if (editingEmail) {
      setEditingEmail(false);
      toast("Verification email sent", "ok");
    } else {
      setEditingEmail(true);
    }
  };

  return (
    <motion.div variants={fadeUp} data-slot="card" className="ad-card pad">
      <div className="ad-section-title">
        <Mail size={14} style={{ verticalAlign: -2, marginRight: 6, color: "var(--d-crimson)" }} />
        Contact
      </div>
      <div className="ad-section-sub">Where Agenttag sends approval requests and alerts.</div>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label className="ad-field-label">Email address</label>
          <div className="flex gap-2 items-center">
            <input
              className="ad-input flex-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={!editingEmail}
              aria-label="Email address"
            />
            {!editingEmail && <Chip tone="ok" dot>verified</Chip>}
            <Btn variant={editingEmail ? "primary" : "ghost"} onClick={handleEmailAction}>
              {editingEmail ? "Save" : "Change"}
            </Btn>
          </div>
        </div>

        <div>
          <label className="ad-field-label">Phone <span className="text-muted-foreground font-normal">(optional)</span></label>
          {phone ? (
            <div className="flex gap-2 items-center">
              <input className="ad-input flex-1" value={phone} readOnly aria-label="Phone number" />
              <Chip tone="ok" dot>verified</Chip>
              <button
                onClick={() => { setPhone(null); toast("Phone removed", "info"); }}
                aria-label="Remove phone"
                className="text-muted-foreground hover:text-[var(--d-bad)] focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40 rounded-md p-1"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="ad-input flex-1"
                placeholder="Add phone number"
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && savePhone()}
                aria-label="Add phone number"
              />
              <Btn variant="ghost" onClick={savePhone} disabled={!phoneDraft.trim()}>Add</Btn>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Receives alerts via email · in-app.{" "}
          <button
            onClick={onScrollToPrefs}
            className="underline hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40 rounded-sm"
          >
            Manage in Preferences
          </button>.
        </p>
      </div>
    </motion.div>
  );
}

// ---------- 3. Security ----------
export function SecuritySection({
  onOpenPassword, onOpenPasskeys, onOpenRecovery,
}: {
  onOpenPassword: () => void;
  onOpenPasskeys: () => void;
  onOpenRecovery: () => void;
}) {
  const passkeysEnrolled = 1;
  const codesRemaining = 10;
  const score = 8;

  return (
    <motion.div variants={fadeUp} data-slot="card" className="ad-card pad">
      <div className="ad-section-title">
        <ShieldCheck size={14} style={{ verticalAlign: -2, marginRight: 6, color: "var(--d-crimson)" }} />
        Security
      </div>
      <div className="ad-section-sub">Protect your account with strong authentication and recovery options.</div>

      <div className="mt-4 flex flex-col divide-y divide-border">
        <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
          <div>
            <div className="text-sm font-medium">Password</div>
            <div className="text-xs text-muted-foreground">Last changed 47 days ago</div>
          </div>
          <Btn variant="ghost" onClick={onOpenPassword}>Change</Btn>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium">Two-factor &amp; passkeys</div>
            <div className="text-xs text-muted-foreground">{passkeysEnrolled} passkey enrolled</div>
          </div>
          <Btn variant="ghost" onClick={onOpenPasskeys}>Manage</Btn>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium">Recovery codes</div>
            <div className="text-xs text-muted-foreground">{codesRemaining} codes remaining</div>
          </div>
          <Btn variant="ghost" onClick={onOpenRecovery}>View codes</Btn>
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium">Security score</div>
              <div className="text-xs text-muted-foreground">Enable 2FA to reach 10 / 10</div>
            </div>
            <div className="text-sm font-mono tabular-nums font-semibold">{score} / 10</div>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--d-ok)]"
              initial={{ width: 0 }}
              animate={{ width: `${(score / 10) * 100}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={10}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- 4. Active sessions ----------
function sessionIcon(kind: Session["kind"]) {
  return kind === "mobile" ? <Smartphone size={16} /> : <Monitor size={16} />;
}
function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SessionsSection({ sessions }: { sessions: Session[] }) {
  const { toast } = useStore();
  const current = sessions.find((s) => s.current);
  const others = sessions.filter((s) => !s.current);

  const revoke = (id: string) => {
    toast(`Session ${id.slice(0, 4)} revoked`, "ok");
  };

  return (
    <motion.div variants={fadeUp} data-slot="card" className="ad-card pad">
      <div className="ad-section-title">
        <ShieldCheck size={14} style={{ verticalAlign: -2, marginRight: 6, color: "var(--d-crimson)" }} />
        Active sessions
      </div>
      <div className="ad-section-sub">Devices currently signed in to your account.</div>

      <div className="mt-4 flex flex-col gap-3">
        {current && (
          <div className="ad-row" style={{ background: "transparent", border: "1px solid var(--d-line)" }}>
            <span className="ad-row-ico">{sessionIcon(current.kind)}</span>
            <div className="flex-1">
              <div className="ad-row-name">
                {current.name} <Chip tone="ok" dot>current</Chip>
              </div>
              <div className="ad-row-desc">
                Last active {timeAgo(current.lastSeen)} · {current.browser} · {current.location}
              </div>
            </div>
          </div>
        )}

        {others.map((s) => (
          <div key={s.id} className="ad-row" style={{ background: "transparent", border: "1px solid var(--d-line)" }}>
            <span className="ad-row-ico">{sessionIcon(s.kind)}</span>
            <div className="flex-1">
              <div className="ad-row-name">{s.name}</div>
              <div className="ad-row-desc">
                Last active {timeAgo(s.lastSeen)} · {s.browser} · {s.location}
              </div>
            </div>
            <button
              onClick={() => revoke(s.id)}
              aria-label={`Revoke session on ${s.name}`}
              className="text-muted-foreground hover:text-[var(--d-bad)] focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40 rounded-md p-1.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {others.length > 0 && (
          <div>
            <Btn variant="ghost" onClick={() => toast("All other sessions revoked", "bad")}>
              <LogOut size={13} style={{ marginRight: 6, verticalAlign: -1 }} />
              Revoke all other sessions
            </Btn>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------- 5. Preferences ----------
function Segmented<T extends string>({
  value, onChange, options, ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="relative inline-flex p-1 rounded-lg bg-muted/40 border border-border">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40 ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${ariaLabel}`}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 bg-card rounded-md shadow-sm border border-border -z-10"
              />
            )}
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function PreferencesSection() {
  const { toast } = useStore();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [language, setLanguage] = useState("en");
  const [tz, setTz] = useState("America/Sao_Paulo");
  const [langOpen, setLangOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);

  const onTheme = (t: typeof theme) => {
    setTheme(t);
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else if (t === "light") root.classList.remove("dark");
    else root.classList.remove("dark");
    toast(`Theme set to ${t}`, "ok");
  };

  return (
    <motion.div variants={fadeUp} data-slot="card" className="ad-card pad">
      <div className="ad-section-title">
        <Settings size={14} style={{ verticalAlign: -2, marginRight: 6, color: "var(--d-crimson)" }} />
        Preferences
      </div>
      <div className="ad-section-sub">Customize how Agenttag looks and behaves for you.</div>

      <div className="mt-4 flex flex-col gap-5">
        <div>
          <label className="ad-field-label">Theme</label>
          <Segmented
            ariaLabel="Theme"
            value={theme}
            onChange={onTheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
          />
        </div>

        <div>
          <label className="ad-field-label">Density</label>
          <Segmented
            ariaLabel="Density"
            value={density}
            onChange={(v) => { setDensity(v); toast("Density set", "ok"); }}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </div>

        <div>
          <label className="ad-field-label">Language</label>
          <div className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              className="ad-input flex items-center justify-between w-full md:w-64 focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40"
            >
              <span className="flex items-center gap-2"><Globe size={13} />{language === "en" ? "English" : language}</span>
              <ChevronDown size={13} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <ul role="listbox" className="absolute z-20 mt-1 w-full md:w-64 ad-card pad py-1">
                {[
                  { v: "en", l: "English" },
                  { v: "es", l: "Español" },
                  { v: "pt", l: "Português" },
                  { v: "fr", l: "Français" },
                ].map((o) => (
                  <li key={o.v}>
                    <button
                      disabled={o.v !== "en"}
                      onClick={() => { setLanguage(o.v); setLangOpen(false); toast("Language set", "ok"); }}
                      className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                    >
                      <span>{o.l}</span>
                      {o.v !== "en" && <span className="text-[10px] text-muted-foreground">Coming soon</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label className="ad-field-label">Time zone</label>
          <div className="relative">
            <button
              onClick={() => setTzOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={tzOpen}
              className="ad-input flex items-center justify-between w-full md:w-80 focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40"
            >
              <span className="flex items-center gap-2"><Clock size={13} />{tz}</span>
              <ChevronDown size={13} className={`transition-transform ${tzOpen ? "rotate-180" : ""}`} />
            </button>
            {tzOpen && (
              <ul role="listbox" className="absolute z-20 mt-1 w-full md:w-80 ad-card pad py-1 max-h-64 overflow-auto">
                {["America/Sao_Paulo (auto)", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo"].map((z) => (
                  <li key={z}>
                    <button
                      onClick={() => { setTz(z.split(" ")[0]); setTzOpen(false); toast("Time zone updated", "ok"); }}
                      className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted/40"
                    >
                      {z}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- 6. Danger zone ----------
export function DangerZoneSection({
  onOpenDelete,
}: {
  onOpenDelete: () => void;
}) {
  const { toast } = useStore();

  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      account: "operator@agenttag.me",
      sessions: 2,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agenttag-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Export ready · agenttag-export.json", "ok");
  };

  return (
    <motion.div variants={fadeUp} data-slot="card" className="ad-card pad" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
      <div className="ad-section-title" style={{ color: "rgb(239,68,68)" }}>
        <AlertTriangle size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
        Danger zone
      </div>
      <div className="ad-section-sub">These actions are permanent and cannot be undone.</div>

      <div className="mt-4 flex flex-col gap-3">
        <Btn variant="ghost" onClick={exportData}>
          <Download size={13} style={{ marginRight: 6, verticalAlign: -1 }} />
          Export account data
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => toast("All sessions revoked", "bad")}
          style={{ color: "var(--d-bad)", borderColor: "var(--d-bad)", border: "1px solid" }}
        >
          <LogOut size={13} style={{ marginRight: 6, verticalAlign: -1 }} />
          Revoke all sessions
        </Btn>
        <Btn
          variant="ghost"
          onClick={onOpenDelete}
          style={{ color: "rgb(239,68,68)", borderColor: "rgba(239,68,68,0.3)", border: "1px solid" }}
        >
          <Trash2 size={13} style={{ marginRight: 6, verticalAlign: -1 }} />
          Delete workspace
        </Btn>
      </div>
    </motion.div>
  );
}

// ---------- Modals ----------

// ChangePasswordModal
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useStore();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const valid = cur.length > 0 && next.length >= 8 && next === confirm;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Change password"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            onClick={() => { toast("Password updated", "ok"); onClose(); }}
            disabled={!valid}
          >
            Update password
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className="ad-field-label">Current password</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              className="ad-input w-full pr-10"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              aria-label="Current password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40 rounded-md"
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="ad-field-label">New password</label>
          <input
            type={show ? "text" : "password"}
            className="ad-input w-full"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            aria-label="New password"
          />
          <p className="text-xs text-muted-foreground mt-1">At least 8 characters.</p>
        </div>
        <div>
          <label className="ad-field-label">Confirm new password</label>
          <input
            type={show ? "text" : "password"}
            className="ad-input w-full"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-label="Confirm new password"
          />
          {confirm && confirm !== next && (
            <p className="text-xs text-[var(--d-bad)] mt-1">Passwords do not match.</p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

// PasskeysModal
export function PasskeysModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useStore();
  const [passkeys, setPasskeys] = useState<Passkey[]>(() => [
    { id: "1", name: "MacBook Touch ID", addedAt: Date.now() - 30 * 86400000 },
  ]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Passkeys"
      footer={
        <Btn
          onClick={() => { toast("Passkey enrollment coming soon", "info"); onClose(); }}
        >
          <KeyRound size={13} style={{ marginRight: 6, verticalAlign: -1 }} />
          Add passkey
        </Btn>
      }
    >
      {passkeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No passkeys enrolled yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between ad-row"
              style={{ background: "transparent", border: "1px solid var(--d-line)" }}
            >
              <div>
                <div className="text-sm font-medium">{pk.name}</div>
                <div className="text-xs text-muted-foreground">
                  Added {new Date(pk.addedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => {
                  setPasskeys((p) => p.filter((x) => x.id !== pk.id));
                  toast("Passkey removed", "ok");
                }}
                aria-label={`Remove ${pk.name}`}
                className="text-muted-foreground hover:text-[var(--d-bad)] p-1 focus-visible:ring-2 focus-visible:ring-[var(--d-crimson)]/40 rounded-md"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}

function generateRecoveryCodes(): string[] {
  return Array.from(
    { length: 10 },
    (_, i) => `agenttag-${Math.random().toString(36).slice(2, 6)}-${i.toString().padStart(2, "0")}`,
  );
}

// RecoveryCodesModal
export function RecoveryCodesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useStore();
  const codes = useMemo(() => generateRecoveryCodes(), []);

  const copyAll = () => {
    navigator.clipboard?.writeText(codes.join("\n"));
    toast("Codes copied", "ok");
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Recovery codes"
      footer={
        <>
          <Btn variant="ghost" onClick={copyAll}>Copy all</Btn>
          <Btn onClick={() => { toast("Codes regenerated", "info"); onClose(); }}>
            <RefreshCw size={13} style={{ marginRight: 6, verticalAlign: -1 }} />
            Regenerate
          </Btn>
        </>
      }
    >
      <p className="text-xs text-muted-foreground mb-3">
        Each code can be used once. Store them in a safe place.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {codes.map((c: string) => (
          <code
            key={c}
            className="font-mono text-xs bg-muted/40 border border-border rounded-md px-2 py-1.5 text-center"
          >
            {c}
          </code>
        ))}
      </div>
    </ModalShell>
  );
}

// DeleteWorkspaceModal
export function DeleteWorkspaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useStore();
  const [confirm, setConfirm] = useState("");
  const expected = "Agenttag Control Plane";
  const valid = confirm === expected;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Delete workspace"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            onClick={() => { toast("Workspace deleted", "bad"); onClose(); }}
            disabled={!valid}
            style={{ background: "var(--d-bad)", color: "white" }}
          >
            Delete permanently
          </Btn>
        </>
      }
    >
      <p className="text-sm mb-3">
        This permanently deletes your workspace and all associated data. This cannot be undone.
      </p>
      <label className="ad-field-label">
        Type <code className="font-mono text-[var(--d-bad)]">{expected}</code> to confirm
      </label>
      <input
        className="ad-input w-full"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        aria-label="Confirm workspace name"
      />
    </ModalShell>
  );
}

