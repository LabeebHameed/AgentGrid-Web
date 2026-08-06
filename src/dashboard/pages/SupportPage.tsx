import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { Activity, Check, MessageSquare, LifeBuoy, ArrowRight, BookOpen, Mail, ExternalLink, CircleHelp } from "lucide-react";
import { useStore } from "../data";
import { Btn, Chip, PageHeader } from "../ui";

// Premium UI Component imports from the installed blocks



// Stagger wrapper for cards



import { stagger, fadeUp } from "./shared";
export function SupportPage() {
  const { toast } = useStore();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sentFlash, setSentFlash] = useState(false);

  const faqs = [
    {
      q: "How does passkey signing work?",
      a: "When you approve an action, Agenttag uses the WebAuthn API to sign the decision with your device's passkey. Your private key never leaves the device.",
    },
    {
      q: "What is a mandate?",
      a: "A mandate is a signed policy document that defines what an agent is allowed to do. Each mandate has a spend limit, an allowlist of actions, and an optional step-up threshold.",
    },
    {
      q: "What happens when enforcement is off?",
      a: "Policies are still evaluated but not enforced. Agents can run unrestricted. This mode is for testing only.",
    },
    {
      q: "How do I revoke an agent?",
      a: "Go to Governance, find the agent card, and click Revoke. This immediately removes all active sessions for that agent.",
    },
    {
      q: "Can I export the audit log?",
      a: "Yes. Go to History and click the Export button. The full ledger is exported as a JSON file with hash-chain proofs.",
    },
  ];

  const canSend = subject.trim().length > 0 && message.trim().length > 0;

  const handleSend = () => {
    if (!canSend || sending) return;
    setSending(true);
    window.setTimeout(() => {
      toast("Message sent — we'll reply within 24h", "ok");
      setSubject("");
      setMessage("");
      setSending(false);
      setSentFlash(true);
      window.setTimeout(() => setSentFlash(false), 1800);
    }, 600);
  };

  const channels = [
    { label: "Documentation", desc: "Guides, API reference, tutorials", icon: <BookOpen size={16} />, tone: "blue", action: () => window.open("https://docs.agenttag.me", "_blank") },
    { label: "Community", desc: "Discord server for chat & help", icon: <MessageSquare size={16} />, tone: "violet", action: () => window.open("https://discord.gg/agenttag", "_blank") },
    { label: "GitHub", desc: "Report bugs and request features", icon: <ExternalLink size={16} />, tone: "neutral", action: () => window.open("https://github.com/agenttag-security", "_blank") },
    { label: "Email", desc: "support@agenttag.me", icon: <Mail size={16} />, tone: "emerald", action: () => window.location.href = "mailto:support@agenttag.me" },
  ];

  return (
    <>
      <PageHeader title="Support" subtitle="Documentation, FAQ, and direct contact." />
      <div className="ad-scroll overflow-y-auto flex-1 p-6">
        <motion.div
          className="ad-page ad-page--narrow"
          variants={stagger}
          initial="visible"
          animate="visible"
        >
          {/* Status banner */}
          <motion.div variants={fadeUp} className="ad-section-card group">
            <div className="ad-section-head">
              <span className="ad-section-icon tone-emerald"><Activity size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="ad-section-title">All systems operational</span>
                </div>
                <div className="ad-section-sub">API, webhooks, and vault are responding normally. Last incident 14 days ago.</div>
              </div>
              <Chip tone="ok" dot>99.98% uptime</Chip>
            </div>
          </motion.div>

          {/* Stats strip */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Response time", value: "~ 4h" },
              { label: "Uptime (30d)", value: "99.98%" },
              { label: "Channels", value: "4" },
              { label: "FAQ topics", value: faqs.length.toString() },
            ].map(stat => (
              <div key={stat.label} className="ad-card pad flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{stat.label}</span>
                <span className="text-2xl font-bold text-card-foreground tabular-nums">{stat.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Channels */}
          <motion.section variants={fadeUp} className="ad-section-card group">
            <div className="ad-section-head">
              <span className="ad-section-icon tone-crimson"><LifeBuoy size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="ad-section-title">Get in touch</div>
                <div className="ad-section-sub">Pick the channel that fits — we're everywhere.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {channels.map(ch => (
                <button
                  key={ch.label}
                  onClick={ch.action}
                  className="ad-row group text-left"
                  style={{ background: "transparent", border: "1px solid var(--d-line)", cursor: "pointer", transition: "border-color .18s var(--d-ease), background-color .18s var(--d-ease)" }}
                >
                  <span className={`ad-row-ico tone-${ch.tone}`}>{ch.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ad-row-name">{ch.label}</div>
                    <div className="ad-row-desc">{ch.desc}</div>
                  </div>
                  <ArrowRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </motion.section>

          {/* FAQ */}
          <motion.section variants={fadeUp} className="ad-section-card group">
            <div className="ad-section-head">
              <span className="ad-section-icon tone-crimson"><CircleHelp size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="ad-section-title">Frequently asked questions</div>
                <div className="ad-section-sub">Quick answers to the most common questions.</div>
              </div>
            </div>
            <div className="flex flex-col">
              {faqs.map((faq, i) => {
                const open = faqOpen === i;
                return (
                  <div key={i} className="border-b border-border/60 last:border-b-0">
                    <button
                      className="flex items-center justify-between w-full py-3 text-sm font-medium text-left"
                      onClick={() => setFaqOpen(open ? null : i)}
                      aria-expanded={open}
                    >
                      <span className="text-card-foreground pr-3">{faq.q}</span>
                      <span className={`ad-faq-toggle ${open ? "is-open" : ""}`} aria-hidden>
                        <span className="ad-faq-toggle-bar" />
                        <span className="ad-faq-toggle-bar" />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <p className="text-xs text-muted-foreground leading-relaxed pb-3.5">{faq.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* Contact form */}
          <motion.section variants={fadeUp} className="ad-section-card group">
            <div className="ad-section-head">
              <span className="ad-section-icon tone-crimson"><Mail size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="ad-section-title">Send us a message</div>
                <div className="ad-section-sub">We respond within 24 hours on business days.</div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="support-subject" className="ad-field-label">Subject</label>
                <input
                  id="support-subject"
                  className="ad-input"
                  placeholder="What can we help with?"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="support-message" className="ad-field-label mb-0">Message</label>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{message.length} / 2000</span>
                </div>
                <textarea
                  id="support-message"
                  className="ad-input"
                  rows={5}
                  maxLength={2000}
                  style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                  placeholder="Describe your issue…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <p className="ad-field-help">Include steps to reproduce if you're reporting a bug.</p>
              </div>
              <div className="flex items-center gap-2">
                <Btn
                  variant="primary"
                  disabled={!canSend || sending}
                  onClick={handleSend}
                >
                  {sentFlash ? <Check size={13} /> : null}
                  {sentFlash ? "Sent" : sending ? "Sending…" : "Send message"}
                </Btn>
                <Btn
                  variant="ghost"
                  disabled={!subject && !message}
                  onClick={() => { setSubject(""); setMessage(""); }}
                >
                  Clear
                </Btn>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </>
  );
}

// ============================================================
// Help & Shortcuts  (premium redesign)
// ============================================================

