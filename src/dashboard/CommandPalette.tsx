/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Bell,
  Check,
  CheckCircle2,
  CircleDashed,
  Compass,
  Cpu,
  FileText,
  Inbox as InboxIcon,
  Keyboard,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Moon,
  Pause,
  Plug,
  Play,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  User as UserIcon,
  Users,
  Wallet,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { Agent, Approval, LedgerEntry } from "./data";
import type { RouteKey } from "./Dashboard";
import { getStored, setStored } from "@/lib/storage";

// ============================================================
// Types
// ============================================================
type Section = "actions" | "navigation" | "agents" | "activity";

type ResultItem = {
  id: string;
  section: Section;
  label: string;
  hint?: string;
  icon: LucideIcon;
  iconTone?: "neutral" | "accent" | "warn" | "bad" | "ok";
  shortcut?: string[];
  keywords?: string[];
  run: () => void;
  meta?: string;
  labelMatch?: number[];
  hintMatch?: number[];
};

type PaletteProps = {
  open: boolean;
  onClose: () => void;
  nav: (k: RouteKey) => void;
  ledger: LedgerEntry[];
  agents: Agent[];
  approvals: Approval[];
  dark: boolean;
  toggleTheme: () => void;
  onOpenWizard: () => void;
};

const SECTION_ORDER: Section[] = ["actions", "navigation", "agents", "activity"];
const SECTION_LABEL: Record<Section, string> = {
  actions: "Actions",
  navigation: "Navigation",
  agents: "Agents",
  activity: "Recent activity",
};
const SECTION_HINT: Record<Section, string> = {
  actions: "Run a command",
  navigation: "Jump to a page",
  agents: "Inspect an agent",
  activity: "From the ledger",
};
const RECENT_KEY = "aeg-cmd-recent";
const RECENT_MAX = 5;

const ICON_TONE: Record<NonNullable<ResultItem["iconTone"]>, string> = {
  neutral: "ad-cmd-icon",
  accent: "ad-cmd-icon ad-cmd-icon--accent",
  warn: "ad-cmd-icon ad-cmd-icon--warn",
  bad: "ad-cmd-icon ad-cmd-icon--bad",
  ok: "ad-cmd-icon ad-cmd-icon--ok",
};

const SECTION_ICON: Record<Section, LucideIcon> = {
  actions: Zap,
  navigation: Compass,
  agents: Users,
  activity: Activity,
};

const SUGGESTIONS = ["approve", "pause", "audit", "providers", "settings"];

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.014, delayChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
  },
};

// ============================================================
// Score helpers
// ============================================================
const norm = (s: string) => s.toLowerCase();

function matchSubsequence(query: string, text: string): { score: number; indices: number[] } {
  if (!query) return { score: 0, indices: [] };
  const q = norm(query);
  const t = norm(text);
  
  if (t === q) {
    return { score: 10000, indices: Array.from({ length: q.length }, (_, i) => i) };
  }

  const qTokens = q.split(/\s+/).filter(Boolean);
  if (qTokens.length > 1) {
    let allTokensMatched = true;
    let totalScore = 0;
    const indices = new Set<number>();
    
    for (const token of qTokens) {
      const idx = t.indexOf(token);
      if (idx !== -1) {
        totalScore += 100;
        if (idx === 0 || /[\s\-_/]/.test(t[idx - 1])) totalScore += 50;
        for (let i = 0; i < token.length; i++) indices.add(idx + i);
      } else {
        allTokensMatched = false;
        break;
      }
    }
    
    if (allTokensMatched) {
      return { score: totalScore, indices: Array.from(indices).sort((a, b) => a - b) };
    }
  }

  const exactIdx = t.indexOf(q);
  if (exactIdx !== -1) {
    let score = 500;
    if (exactIdx === 0) score += 200;
    else if (/[\s\-_/]/.test(t[exactIdx - 1])) score += 100;
    const indices = Array.from({ length: q.length }, (_, i) => exactIdx + i);
    return { score, indices };
  }

  let qIdx = 0;
  const indices: number[] = [];
  let score = 0;
  let consec = 0;

  for (let i = 0; i < t.length; i++) {
    if (t[i] === q[qIdx]) {
      indices.push(i);
      qIdx++;
      if (i === 0 || /[\s\-_/]/.test(t[i - 1])) {
        score += 30;
      } else {
        score += 10;
      }
      consec++;
      score += consec * 5;
      
      if (qIdx === q.length) break;
    } else {
      consec = 0;
    }
  }

  if (qIdx === q.length) {
    return { score, indices };
  }

  return { score: 0, indices: [] };
}

function scoreItem(query: string, item: ResultItem): { score: number; labelMatch?: number[]; hintMatch?: number[] } {
  if (!query) return { score: 0 };
  
  const labelRes = matchSubsequence(query, item.label);
  let bestScore = labelRes.score;
  let labelMatch = labelRes.score > 0 ? labelRes.indices : undefined;
  let hintMatch: number[] | undefined;

  if (item.hint) {
    const hintRes = matchSubsequence(query, item.hint);
    if (hintRes.score > 0) {
      hintMatch = hintRes.indices;
      bestScore = Math.max(bestScore, hintRes.score);
    }
  }

  if (item.keywords) {
    for (const kw of item.keywords) {
      const kwRes = matchSubsequence(query, kw);
      if (kwRes.score > bestScore) {
        bestScore = kwRes.score;
      }
    }
  }

  return { score: bestScore, labelMatch, hintMatch };
}

// ============================================================
// Component
// ============================================================
export function CommandPalette({
  open,
  onClose,
  nav,
  ledger,
  agents,
  approvals,
  dark,
  toggleTheme,
  onOpenWizard,
}: PaletteProps) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // Simple backdrop without parallax

  // Reset on open (reset-on-prop-change — established pattern in this codebase)
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ("");
      setActive(0);
      // wait a frame for the autofocus attribute
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Recent items (read once on open)
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    try {
      const raw = getStored(RECENT_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecentIds(Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : []);
    } catch {
      setRecentIds([]);
    }
  }, [open]);

  const pushRecent = useCallback((id: string) => {
    setRecentIds((cur) => {
      const next = [id, ...cur.filter((x) => x !== id)].slice(0, RECENT_MAX);
      try {
        setStored(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  // ----- Build actions list -----
  const actions = useMemo<ResultItem[]>(() => {
    const out: ResultItem[] = [];

    out.push({
      id: "act:connect-agent",
      section: "actions",
      label: "Connect new agent",
      hint: "Run the setup wizard",
      icon: Plus,
      iconTone: "accent",
      keywords: ["wizard", "add", "new", "setup", "onboard", "agent"],
      run: () => {
        onOpenWizard();
        onClose();
      },
    });

    out.push({
      id: "act:toggle-theme",
      section: "actions",
      label: dark ? "Switch to light theme" : "Switch to dark theme",
      hint: "Toggle interface theme",
      icon: dark ? Sun : Moon,
      iconTone: "neutral",
      keywords: ["dark", "light", "mode", "theme", "appearance"],
      run: () => {
        toggleTheme();
        onClose();
      },
    });

    if (approvals.length > 0) {
      const next = approvals[0];
      out.push({
        id: `act:approve-${next.id}`,
        section: "actions",
        label: `Approve “${truncate(next.title, 38)}”`,
        hint: `${next.agent} · pending`,
        icon: CheckCircle2,
        iconTone: "ok",
        shortcut: ["⏎"],
        keywords: ["approve", "allow", "sign", "confirm", next.agent.toLowerCase()],
        run: () => {
          nav("inbox");
          onClose();
        },
      });
      out.push({
        id: `act:deny-${next.id}`,
        section: "actions",
        label: `Deny “${truncate(next.title, 38)}”`,
        hint: `${next.agent} · pending`,
        icon: XCircle,
        iconTone: "bad",
        keywords: ["deny", "reject", "block", "decline"],
        run: () => {
          nav("inbox");
          onClose();
        },
      });
    }

    const firstActive = agents.find((a) => a.status === "active");
    if (firstActive) {
      out.push({
        id: `act:pause-${firstActive.id}`,
        section: "actions",
        label: `Pause ${firstActive.name}`,
        hint: "Suspend policy enforcement",
        icon: Pause,
        iconTone: "warn",
        keywords: ["pause", "stop", "suspend", firstActive.name.toLowerCase()],
        run: () => {
          nav("governance");
          onClose();
        },
      });
    }
    const firstPaused = agents.find((a) => a.status === "paused");
    if (firstPaused) {
      out.push({
        id: `act:resume-${firstPaused.id}`,
        section: "actions",
        label: `Resume ${firstPaused.name}`,
        hint: "Re-enable policy enforcement",
        icon: Play,
        iconTone: "ok",
        keywords: ["resume", "start", "enable", "unpause", firstPaused.name.toLowerCase()],
        run: () => {
          nav("governance");
          onClose();
        },
      });
    }

    out.push({
      id: "act:notifications",
      section: "actions",
      label: "Open notifications",
      hint: approvals.length > 0 ? `${approvals.length} unread` : "All caught up",
      icon: Bell,
      iconTone: approvals.length > 0 ? "warn" : "neutral",
      keywords: ["alerts", "bell", "inbox"],
      run: () => {
        nav("notifications");
        onClose();
      },
    });

    out.push({
      id: "act:help",
      section: "actions",
      label: "Show keyboard shortcuts",
      hint: "All available hotkeys",
      icon: Keyboard,
      iconTone: "neutral",
      keywords: ["shortcuts", "hotkeys", "keys", "help"],
      run: () => {
        nav("help");
        onClose();
      },
    });

    return out;
  }, [approvals, agents, dark, nav, onClose, onOpenWizard, toggleTheme]);

  // ----- Navigation list -----
  const navigation: ResultItem[] = useMemo(
    () => [
      {
        id: "nav:dashboard",
        section: "navigation",
        label: "Dashboard",
        hint: "Overview & live activity",
        icon: LayoutDashboard,
        keywords: ["home", "overview", "summary"],
        shortcut: ["G", "D"],
        run: () => {
          nav("dashboard");
          onClose();
        },
      },
      {
        id: "nav:inbox",
        section: "navigation",
        label: "Inbox",
        hint: approvals.length > 0 ? `${approvals.length} pending approval${approvals.length === 1 ? "" : "s"}` : "Approvals",
        icon: InboxIcon,
        keywords: ["approvals", "queue", "inbox"],
        shortcut: ["G", "I"],
        run: () => {
          nav("inbox");
          onClose();
        },
      },
      {
        id: "nav:governance",
        section: "navigation",
        label: "Governance",
        hint: "Mandates & enforcement",
        icon: ShieldCheck,
        keywords: ["policy", "rules", "mandates", "enforcement"],
        shortcut: ["G", "G"],
        run: () => {
          nav("governance");
          onClose();
        },
      },
      {
        id: "nav:vault",
        section: "navigation",
        label: "Vault",
        hint: "Cards & credentials",
        icon: ShieldCheck,
        keywords: ["credentials", "cards", "api", "keys", "secrets"],
        shortcut: ["G", "V"],
        run: () => {
          nav("vault");
          onClose();
        },
      },
      {
        id: "nav:wallet",
        section: "navigation",
        label: "Wallet",
        hint: "Balance & top-up",
        icon: Wallet,
        keywords: ["balance", "funds", "topup", "money", "transactions"],
        shortcut: ["G", "W"],
        run: () => {
          nav("wallet");
          onClose();
        },
      },

      {
        id: "nav:providers",
        section: "navigation",
        label: "Providers",
        hint: "Vault & integrations",
        icon: Plug,
        keywords: ["integrations", "vault", "connections"],
        shortcut: ["G", "P"],
        run: () => {
          nav("providers");
          onClose();
        },
      },
      {
        id: "nav:devices",
        section: "navigation",
        label: "Devices",
        hint: "Paired passkeys",
        icon: Smartphone,
        keywords: ["passkey", "pair", "device", "webauthn"],
        run: () => {
          nav("devices");
          onClose();
        },
      },
      {
        id: "nav:settings",
        section: "navigation",
        label: "Settings",
        hint: "Account & workspace",
        icon: SettingsIcon,
        keywords: ["config", "preferences", "account"],
        shortcut: ["G", "S"],
        run: () => {
          nav("settings");
          onClose();
        },
      },
      {
        id: "nav:support",
        section: "navigation",
        label: "Support",
        hint: "Contact the team",
        icon: LifeBuoy,
        keywords: ["help", "contact", "support"],
        run: () => {
          nav("support");
          onClose();
        },
      },
      {
        id: "nav:profile",
        section: "navigation",
        label: "Profile",
        hint: "Operator account",
        icon: UserIcon,
        keywords: ["me", "account", "user"],
        run: () => {
          nav("profile");
          onClose();
        },
      },
    ],
    [approvals.length, nav, onClose]
  );

  // ----- Agents list -----
  const agentItems = useMemo<ResultItem[]>(
    () =>
      agents.slice(0, 6).map<ResultItem>((a) => ({
        id: `agent:${a.id}`,
        section: "agents",
        label: a.name,
        hint: `${a.tasks} tasks · ${a.did}`,
        icon: Cpu,
        iconTone: a.status === "active" ? "ok" : a.status === "paused" ? "warn" : "bad",
        meta: a.status.toUpperCase(),
        keywords: [a.name.toLowerCase(), a.did.toLowerCase(), a.status, "agent"],
        run: () => {
          nav("governance");
          onClose();
        },
      })),
    [agents, nav, onClose]
  );

  // ----- Activity (ledger) list -----
  const activityItems = useMemo<ResultItem[]>(() => {
    return ledger
      .slice(-50)
      .reverse()
      .map<ResultItem>((e) => ({
        id: `act:${e.seq}`,
        section: "activity",
        label: e.action,
        hint: `${e.agent} · ${relTime(e.ts)}`,
        icon: e.verdict === "ALLOW" || e.verdict === "OK" ? Check : e.verdict === "DENY" ? X : CircleDashed,
        iconTone:
          e.verdict === "ALLOW" || e.verdict === "OK"
            ? "ok"
            : e.verdict === "DENY"
            ? "bad"
            : e.verdict === "STEP_UP"
            ? "warn"
            : "neutral",
        keywords: [e.action, e.agent, e.hash, e.eventType],
        run: () => {
          nav("audit");
          onClose();
        },
      }));
  }, [ledger, nav, onClose]);

  // ----- Group + filter -----
  const grouped = useMemo(() => {
    const map: Record<Section, ResultItem[]> = {
      actions: [],
      navigation: [],
      agents: [],
      activity: [],
    };

    const all = [...actions, ...navigation, ...agentItems, ...activityItems];
    const qStr = q.trim();

    if (qStr === "") {
      // Empty query → default sections (no activity, no recent collapse)
      map.actions = actions.slice(0, 6);
      map.navigation = navigation.slice(0, 6);
      map.agents = agentItems.slice(0, 3);
    } else {
      // Score everything, drop zero-score
      const scored = all
        .map((it) => {
          const res = scoreItem(qStr, it);
          return {
            it: { ...it, labelMatch: res.labelMatch, hintMatch: res.hintMatch },
            s: res.score,
          };
        })
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s);

      for (const { it } of scored) {
        if (map[it.section].length < capFor(it.section)) {
          map[it.section].push(it);
        }
      }
    }

    return map;
  }, [actions, navigation, agentItems, activityItems, q]);

  // Flat ordered list for keyboard navigation
  const flat = useMemo(() => {
    const list: ResultItem[] = [];
    for (const s of SECTION_ORDER) {
      // Recent: when empty query, prepend recent items that still exist
      if (s === "actions" && q.trim() === "" && recentIds.length > 0) {
        const lookup = new Map<string, ResultItem>();
        [...actions, ...navigation, ...agentItems].forEach((it) => lookup.set(it.id, it));
        for (const id of recentIds) {
          const it = lookup.get(id);
          if (it) list.push({ ...it, section: "actions" }); // show in actions column as "recent"
        }
      }
      for (const it of grouped[s]) list.push(it);
    }
    return list;
  }, [grouped, actions, navigation, agentItems, recentIds, q]);

  // Derive a safe active index so the keyboard cursor never points past the end.
  // (Avoids cascading-render effect: we clamp at read-time instead of writing back to state.)
  const safeActive = flat.length === 0 ? 0 : Math.min(active, flat.length - 1);

  const select = useCallback(
    (item: ResultItem) => {
      pushRecent(item.id);
      item.run();
    },
    [pushRecent]
  );

  // Keyboard handling on the input
  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length === 0) return;
      setActive((a) => (a + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length === 0) return;
      setActive((a) => (a - 1 + flat.length) % flat.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, flat.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[safeActive];
      if (item) select(item);
    }
  };

  // Scroll active row into view
  useEffect(() => {
    if (!open) return;
    const root = listRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-cmd-index="${safeActive}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [safeActive, open]);

  const totalShown = flat.length;
  const hasQuery = q.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={backdropRef}
          key="cmd-backdrop"
          className="ad-cmd-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          onMouseDown={(e) => {
            // close on backdrop click (but not on inner content)
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            key="cmd-panel"
            className="ad-cmd-panel"
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="ad-cmd-input-row">
              <Search size={15} className="ad-cmd-input-icon" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Search actions, navigation, agents…"
                className="ad-cmd-input"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                aria-label="Command palette search"
                aria-controls="cmd-listbox"
                aria-activedescendant={flat[safeActive] ? `cmd-item-${flat[safeActive].id}` : undefined}
                role="combobox"
                aria-expanded="true"
              />
              {q && (
                <button
                  type="button"
                  className="ad-cmd-clear"
                  onClick={() => {
                    setQ("");
                    setActive(0);
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
              <span className="ad-cmd-esc-chip" aria-hidden="true">
                <kbd>esc</kbd>
              </span>
            </div>

            <div ref={listRef} className="ad-cmd-list" role="listbox" id="cmd-listbox">
              {totalShown === 0 ? (
                <EmptyState
                  query={q.trim()}
                  onSuggest={(s) => {
                    setQ(s);
                    setActive(0);
                    inputRef.current?.focus();
                  }}
                />
              ) : (
                SECTION_ORDER.map((section) => {
                  const items = grouped[section];
                  if (!items || items.length === 0) return null;
                  // Skip the synthetic "actions" header when showing recent items inline
                  const showHeader = !(section === "actions" && !hasQuery && recentIds.length > 0);
                  return (
                    <div key={section} className="ad-cmd-section">
                      {showHeader && (
                        <div className="ad-cmd-section-head">
                          <span className="ad-cmd-section-label">
                            {(() => {
                              const SIcon = SECTION_ICON[section];
                              return <SIcon size={10} strokeWidth={2.4} />;
                            })()}
                            <span>{SECTION_LABEL[section]}</span>
                            <span className="ad-cmd-section-count">{items.length}</span>
                          </span>
                          <span className="ad-cmd-section-hint">{SECTION_HINT[section]}</span>
                        </div>
                      )}
                      <motion.ul
                        className="ad-cmd-section-list"
                        initial="hidden"
                        animate="visible"
                        variants={listVariants}
                      >
                        {items.map((it) => {
                          const idx = flat.indexOf(it);
                          const isActive = idx === safeActive;
                          const Icon = it.icon;
                          const tone = it.iconTone ?? "neutral";
                          const isAgent = it.section === "agents";
                          return (
                            <motion.li key={it.id} variants={rowVariants}>
                              <button
                                id={`cmd-item-${it.id}`}
                                role="option"
                                aria-selected={isActive}
                                data-cmd-index={idx}
                                type="button"
                                onMouseEnter={() => setActive(idx)}
                                onClick={() => select(it)}
                                className={`ad-cmd-row${isActive ? " is-active" : ""}`}
                              >
                                <span className={ICON_TONE[tone]}>
                                  <Icon size={14} strokeWidth={2} />
                                  {isAgent && (
                                    <span
                                      className={`ad-cmd-dot ad-cmd-dot--${tone}`}
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                                <span className="ad-cmd-row-text">
                                  <Highlight text={it.label} indices={it.labelMatch} />
                                </span>
                                {it.hint && (
                                  <span className="ad-cmd-row-hint">
                                    <Highlight text={it.hint} indices={it.hintMatch} />
                                  </span>
                                )}
                                <span className="ad-cmd-row-end">
                                  {it.shortcut && it.shortcut[0] !== "⏎" && (
                                    <span className="ad-cmd-shortcut-keys" aria-hidden="true">
                                      {it.shortcut.map((k, i) => <kbd key={i}>{k}</kbd>)}
                                    </span>
                                  )}
                                  {it.meta && <span className="ad-cmd-meta">{it.meta}</span>}
                                  <span className="ad-cmd-enter-slot" aria-hidden="true">
                                    <AnimatePresence>
                                      {isActive && (
                                        <motion.span
                                          key="enter"
                                          initial={{ opacity: 0, scale: 0.6, x: 4 }}
                                          animate={{ opacity: 1, scale: 1, x: 0 }}
                                          exit={{ opacity: 0, scale: 0.6, x: 4 }}
                                          transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
                                          className="ad-cmd-enter-chip"
                                        >
                                          <kbd>⏎</kbd>
                                        </motion.span>
                                      )}
                                    </AnimatePresence>
                                  </span>
                                </span>
                              </button>
                            </motion.li>
                          );
                        })}
                      </motion.ul>
                    </div>
                  );
                })
              )}
            </div>

            <div className="ad-cmd-footer">
              <div className="ad-cmd-footer-pills">
                <span className="ad-cmd-pill"><kbd>↑↓</kbd><span>navigate</span></span>
                <span className="ad-cmd-pill"><kbd>⏎</kbd><span>select</span></span>
                <span className="ad-cmd-pill"><kbd>esc</kbd><span>{hasQuery ? "clear" : "close"}</span></span>
              </div>
              <div className="ad-cmd-footer-meta">
                <span className="ad-cmd-foot-count">
                  {totalShown} {totalShown === 1 ? "result" : "results"}
                </span>
                <span className="ad-cmd-foot-tip">
                  <Sparkles size={10} />
                  Press <kbd>/</kbd> from anywhere
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Subcomponents
// ============================================================
function EmptyState({
  query,
  onSuggest,
}: {
  query: string;
  onSuggest: (s: string) => void;
}) {
  return (
    <div className="ad-cmd-empty">
      <div className="ad-cmd-empty-icon">
        <Search size={18} />
      </div>
      {query ? (
        <p className="ad-cmd-empty-title">No matches for “{query}”</p>
      ) : (
        <p className="ad-cmd-empty-title">Type to search</p>
      )}
      <p className="ad-cmd-empty-sub">
        {query
          ? "Try one of these popular actions:"
          : "Run actions, jump to pages, look up agents."}
      </p>
      <div className="ad-cmd-empty-chips">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="ad-cmd-suggest"
            onClick={() => onSuggest(s)}
          >
            <Search size={10} />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Highlight({ text, indices }: { text: string; indices?: number[] }) {
  if (!indices || indices.length === 0) return <>{text}</>;

  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let i = 0;

  while (i < indices.length) {
    const start = indices[i];
    // Find consecutive sequence
    let end = start;
    while (i + 1 < indices.length && indices[i + 1] === end + 1) {
      end = indices[i + 1];
      i++;
    }

    if (start > lastIdx) {
      nodes.push(<span key={`t-${lastIdx}`}>{text.slice(lastIdx, start)}</span>);
    }
    nodes.push(
      <mark key={`m-${start}`} className="ad-cmd-mark">
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIdx = end + 1;
    i++;
  }

  if (lastIdx < text.length) {
    nodes.push(<span key={`t-${lastIdx}`}>{text.slice(lastIdx)}</span>);
  }

  return <>{nodes}</>;
}

// ============================================================
// Utils
// ============================================================
function capFor(s: Section): number {
  switch (s) {
    case "actions":
      return 6;
    case "navigation":
      return 6;
    case "agents":
      return 4;
    case "activity":
      return 6;
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function relTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

// ============================================================
// Public hook to wire ⌘K globally (from anywhere)
// ============================================================
export function useCommandKShortcut(onToggle: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === "k" || e.key === "K";
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onToggle();
      }
      // also "/" as a quick-open (like GitHub)
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        const isEditable =
          tag === "input" || tag === "textarea" || t?.isContentEditable === true;
        if (!isEditable) {
          e.preventDefault();
          onToggle();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggle]);
}

// re-export type used elsewhere
export type { RouteKey };
// also re-export FileText for parity in case future commands reference it
export { FileText };

