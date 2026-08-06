import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { ShieldCheck, X, Search, ChevronDown, Sun, LifeBuoy, Sparkles, ArrowRight, Circle, CircleCheck, Keyboard, MessageCircle, BookOpen, Compass, Rocket, Mail } from "lucide-react";
import { useStore } from "../data";
import { PageHeader } from "../ui";
import type { RouteKey } from "../Dashboard";

// Premium UI Component imports from the installed blocks



// Stagger wrapper for cards



import { stagger, fadeUp } from "./shared";
export function HelpPage({
  onNav,
  onOpenPalette,
}: {
  onNav?: (k: RouteKey) => void;
  onOpenPalette?: () => void;
}) {
  const { agents, providers, devices, settings } = useStore();

  // Personalized checklist derived from real store state
  const checklist = useMemo(
    () => [
      {
        done: agents.length > 0,
        label: "Connect your first agent",
        hint:
          agents.length > 0
            ? `${agents.length} connected`
            : "Start with the wizard",
        action: () => onNav?.("governance"),
      },
      {
        done: agents.some((a) => a.mandates.length > 0),
        label: "Create a mandate",
        hint: "Define what your agent can do",
        action: () => onNav?.("governance"),
      },
      {
        done: devices.some((d) => d.current),
        label: "Link a passkey device",
        hint:
          devices.length > 0
            ? `${devices.length} paired`
            : "Required for approvals",
        action: () => onNav?.("devices"),
      },
      {
        done: settings.enforcement,
        label: "Enable global enforcement",
        hint: settings.enforcement ? "Active" : "Inactive",
        action: () => onNav?.("settings"),
      },
      {
        done: providers.some((p) => p.connected),
        label: "Connect a provider",
        hint: providers.filter((p) => p.connected).length > 0
          ? `${providers.filter((p) => p.connected).length} connected`
          : "Stripe, GitHub, Twilio…",
        action: () => onNav?.("providers"),
      },
      {
        done: agents.some((a) => a.spendLimit > 0),
        label: "Set spend limits",
        hint: "Control how much agents can spend",
        action: () => onNav?.("governance"),
      },
    ],
    [agents, providers, devices, settings, onNav]
  );

  const completedCount = checklist.filter((c) => c.done).length;
  const progress = Math.round((completedCount / checklist.length) * 100);

  // Shortcuts grouped by category — clickable to actually run the action
  type Shortcut = {
    keys: string[];
    desc: string;
    note?: string;
    action?: () => void;
  };
  type ShortcutGroup = {
    id: string;
    label: string;
    icon: typeof Compass;
    shortcuts: Shortcut[];
  };
  const shortcutGroups = useMemo<ShortcutGroup[]>(
    () => [
      {
        id: "navigation",
        label: "Navigation",
        icon: Compass,
        shortcuts: [
          { keys: ["⌘", "K"], desc: "Open command palette", action: () => onOpenPalette?.() },
          { keys: ["G", "D"], desc: "Go to Dashboard", action: () => onNav?.("dashboard") },
          { keys: ["G", "I"], desc: "Go to Inbox", action: () => onNav?.("inbox") },
          { keys: ["G", "G"], desc: "Go to Governance", action: () => onNav?.("governance") },
          { keys: ["G", "H"], desc: "Go to Audit Ledger", action: () => onNav?.("audit") },
          { keys: ["G", "S"], desc: "Go to Settings", action: () => onNav?.("settings") },
          { keys: ["?"], desc: "Show this help", action: () => onNav?.("help") },
        ],
      },
      {
        id: "approvals",
        label: "Approvals",
        icon: ShieldCheck,
        shortcuts: [
          { keys: ["A"], desc: "Approve selected request", note: "Inbox only" },
          { keys: ["D"], desc: "Deny selected request", note: "Inbox only" },
          { keys: ["J"], desc: "Next request", note: "Inbox only" },
          { keys: ["K"], desc: "Previous request", note: "Inbox only" },
        ],
      },
      {
        id: "search",
        label: "Search",
        icon: Search,
        shortcuts: [
          { keys: ["⌘", "K"], desc: "Open command palette", action: () => onOpenPalette?.() },
          { keys: ["/"], desc: "Quick open palette", action: () => onOpenPalette?.() },
          { keys: ["Esc"], desc: "Close modal or clear query" },
        ],
      },
      {
        id: "appearance",
        label: "Appearance",
        icon: Sun,
        shortcuts: [
          { keys: ["⌘", "Shift", "L"], desc: "Toggle light / dark theme", note: "Soon" },
        ],
      },
    ],
    [onNav, onOpenPalette]
  );

  const [activeCategory, setActiveCategory] = useState<string>("navigation");
  const [shortcutQuery, setShortcutQuery] = useState("");

  const filteredShortcuts = useMemo(() => {
    const group = shortcutGroups.find((g) => g.id === activeCategory);
    if (!group) return [] as Shortcut[];
    if (!shortcutQuery.trim()) return group.shortcuts;
    const q = shortcutQuery.toLowerCase();
    return group.shortcuts.filter((s) => s.desc.toLowerCase().includes(q));
  }, [shortcutGroups, activeCategory, shortcutQuery]);

  const totalShortcuts = shortcutGroups.reduce((n, g) => n + g.shortcuts.length, 0);

  // FAQ data
  const faqs = useMemo(
    () => [
      {
        id: "faq-approve",
        q: "How do I approve a request?",
        a: "Go to Inbox and click Approve, or press A on the selected request. Approvals are signed with your passkey device and added to the immutable ledger.",
      },
      {
        id: "faq-pause",
        q: "What happens when I pause an agent?",
        a: "A paused agent's mandates remain on file but new actions are held until you resume. Existing in-flight requests continue to completion under their original verdicts.",
      },
      {
        id: "faq-passkey",
        q: "How are passkeys managed?",
        a: "Pair a security key, laptop, or phone in Settings → Devices. Each approval requires a fresh WebAuthn signature from a paired device. We never store the private key.",
      },
      {
        id: "faq-mandate",
        q: "What is a mandate?",
        a: "A mandate is a signed policy that defines what an agent can do — spend limits, allowed domains, time windows, and counter-parties. Every agent action is evaluated against active mandates before execution.",
      },
      {
        id: "faq-ledger",
        q: "Can I export the signed ledger?",
        a: "Yes. Visit History and click Export. The ledger is a hash-chained JSON log that can be verified offline with our public verification tool.",
      },
      {
        id: "faq-enforcement",
        q: "What does global enforcement do?",
        a: "When enabled, the control plane blocks any agent action that violates a mandate. When disabled, violations are logged but not blocked — useful for testing policies before turning them on.",
      },
    ],
    []
  );

  const [expandedFaq, setExpandedFaq] = useState<string | null>("faq-approve");

  return (
    <>
      <PageHeader
        title="Help & Shortcuts"
        subtitle="Everything you need to master the Agenttag control plane."
      />
      <div className="ad-scroll overflow-y-auto flex-1 help-scroll">
        <div className="help-page max-w-5xl mx-auto px-6 py-6">
          <motion.div
            variants={stagger}
            initial="visible"
            animate="visible"
            className="flex flex-col gap-6"
          >
            {/* HERO */}
            <motion.div variants={fadeUp} className="help-hero">
              <div className="help-hero-top">
                <div className="help-hero-icon">
                  <LifeBuoy size={20} strokeWidth={2} />
                </div>
                <div className="help-hero-text">
                  <h1 className="help-hero-title">Master the control plane</h1>
                  <p className="help-hero-sub">
                    Keyboard shortcuts, getting started, and answers to common questions.
                  </p>
                </div>
                <div className="help-hero-meta">
                  <span className="help-chip">v1.2.0</span>
                  <span className="help-chip">{totalShortcuts} shortcuts</span>
                  <span className="help-chip help-chip--ok">
                    <span className="help-chip-dot" />
                    All systems normal
                  </span>
                </div>
              </div>
              <div className="help-hero-search">
                <Search size={14} className="help-search-icon" />
                <input
                  type="text"
                  placeholder="Search shortcuts and FAQs…"
                  value={shortcutQuery}
                  onChange={(e) => setShortcutQuery(e.target.value)}
                  className="help-search-input"
                  aria-label="Search help"
                />
                {shortcutQuery && (
                  <button
                    onClick={() => setShortcutQuery("")}
                    className="help-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
                <kbd className="help-search-kbd">⌘K</kbd>
              </div>
            </motion.div>

            {/* BENTO: Getting started + Shortcuts */}
            <motion.div variants={fadeUp} className="help-bento">
              {/* Getting started */}
              <section className="help-card help-card--checklist">
                <header className="help-card-head">
                  <div className="help-card-icon help-card-icon--accent">
                    <Rocket size={16} strokeWidth={2.2} />
                  </div>
                  <div className="help-card-head-text">
                    <div className="help-card-title">Getting started</div>
                    <div className="help-card-sub">
                      {completedCount} of {checklist.length} complete
                    </div>
                  </div>
                  <div
                    className="help-progress-ring"
                    aria-label={`${progress}% complete`}
                  >
                    <svg viewBox="0 0 36 36" width="34" height="34">
                      <path
                        className="help-progress-ring-track"
                        d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32"
                      />
                      <path
                        className="help-progress-ring-fill"
                        d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32"
                        style={{ strokeDasharray: `${progress}, 100` }}
                      />
                    </svg>
                    <span className="help-progress-ring-label">{progress}%</span>
                  </div>
                </header>
                <div className="help-progress">
                  <div
                    className="help-progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <ul className="help-checklist">
                  {checklist.map((item, i) => (
                    <li key={i}>
                      <button
                        onClick={item.action}
                        className={`help-check ${item.done ? "is-done" : ""}`}
                      >
                        <span className="help-check-icon">
                          {item.done ? (
                            <CircleCheck size={14} strokeWidth={2.4} />
                          ) : (
                            <Circle size={14} strokeWidth={2} />
                          )}
                        </span>
                        <span className="help-check-label">{item.label}</span>
                        <span className="help-check-hint">{item.hint}</span>
                        <ArrowRight size={12} className="help-check-arrow" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Shortcuts */}
              <section className="help-card help-card--shortcuts">
                <header className="help-card-head">
                  <div className="help-card-icon help-card-icon--accent">
                    <Keyboard size={16} strokeWidth={2.2} />
                  </div>
                  <div className="help-card-head-text">
                    <div className="help-card-title">Keyboard shortcuts</div>
                    <div className="help-card-sub">Click any row to try it</div>
                  </div>
                </header>
                <div className="help-tabs">
                  {shortcutGroups.map((g) => {
                    const GIcon = g.icon;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setActiveCategory(g.id)}
                        className={`help-tab ${
                          activeCategory === g.id ? "is-active" : ""
                        }`}
                      >
                        <GIcon size={11} strokeWidth={2.4} />
                        <span>{g.label}</span>
                        <span className="help-tab-count">{g.shortcuts.length}</span>
                      </button>
                    );
                  })}
                </div>
                <ul className="help-shortcuts">
                  {filteredShortcuts.length === 0 ? (
                    <li className="help-shortcuts-empty">
                      No shortcuts match “{shortcutQuery}”
                    </li>
                  ) : (
                    filteredShortcuts.map((s, i) => (
                      <li key={i}>
                        <button
                          onClick={s.action}
                          disabled={!s.action}
                          className="help-shortcut"
                        >
                          <span className="help-shortcut-desc">{s.desc}</span>
                          {s.note && (
                            <span className="help-shortcut-note">{s.note}</span>
                          )}
                          <span className="help-shortcut-keys">
                            {s.keys.map((k, j) => (
                              <kbd key={j}>{k}</kbd>
                            ))}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </motion.div>

            {/* FAQ */}
            <motion.div variants={fadeUp} className="help-card help-card--faq">
              <header className="help-card-head">
                <div className="help-card-icon help-card-icon--accent">
                  <MessageCircle size={16} strokeWidth={2.2} />
                </div>
                <div className="help-card-head-text">
                  <div className="help-card-title">Frequently asked</div>
                  <div className="help-card-sub">{faqs.length} questions</div>
                </div>
              </header>
              <div className="help-faq">
                {faqs.map((faq) => {
                  const isExpanded = expandedFaq === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className={`help-faq-item ${isExpanded ? "is-open" : ""}`}
                    >
                      <button
                        onClick={() =>
                          setExpandedFaq(isExpanded ? null : faq.id)
                        }
                        className="help-faq-q"
                        aria-expanded={isExpanded}
                      >
                        <span>{faq.q}</span>
                        <ChevronDown size={14} className="help-faq-chev" />
                      </button>
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.22,
                              ease: [0.2, 0.8, 0.2, 1],
                            }}
                            className="help-faq-a-wrap"
                          >
                            <p className="help-faq-a">{faq.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* FOOTER CTA */}
            <motion.div variants={fadeUp} className="help-cta">
              <div className="help-cta-text">
                <div className="help-cta-spark">
                  <Sparkles size={14} />
                </div>
                <div>
                  <div className="help-cta-title">Still need help?</div>
                  <div className="help-cta-sub">
                    Our team replies within 1 hour during business hours.
                  </div>
                </div>
              </div>
              <div className="help-cta-actions">
                <button
                  className="help-btn help-btn--ghost"
                  onClick={() => onOpenPalette?.()}
                >
                  <BookOpen size={13} />
                  Browse with ⌘K
                </button>
                <a
                  href="mailto:support@agenttag.me"
                  className="help-btn help-btn--primary"
                >
                  <Mail size={13} />
                  Contact support
                  <ArrowRight size={13} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}


