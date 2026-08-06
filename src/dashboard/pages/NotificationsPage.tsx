import { useMemo, useState } from "react";
import { motion } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { ShieldCheck, Inbox as InboxIcon, Activity, AlertTriangle, X, Bell } from "lucide-react";
import { useStore, timeAgo } from "../data";
import { Btn, Chip, PageHeader } from "../ui";
import type { RouteKey } from "../Dashboard";

// Premium UI Component imports from the installed blocks



// Stagger wrapper for cards



import { stagger, fadeUp } from "./shared";
// ============================================================
// Notifications
// ============================================================
type NotifCategory = "Approval" | "Alert" | "Policy" | "System";
type NotifTone = "ok" | "warn" | "bad" | "info";

const NOTIF_ICON: Record<NotifCategory, React.ReactNode> = {
  Approval: <InboxIcon size={15} />,
  Alert: <AlertTriangle size={15} />,
  Policy: <ShieldCheck size={15} />,
  System: <Activity size={15} />,
};

const NOTIF_TONE_BG: Record<NotifTone, string> = {
  bad: "bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/25",
  warn: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
  info: "bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/25",
  ok: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
};



const NOTIF_CHIP: Record<NotifCategory, "warn" | "bad" | "info" | "ok"> = {
  Approval: "warn",
  Alert: "bad",
  Policy: "info",
  System: "ok",
};

export function NotificationsPage({ onNav }: { onNav: (k: RouteKey) => void }) {
  const { approvals, ledger, toast } = useStore();
  const [read, setRead] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<NotifCategory | "All">("All");
  // System-item timestamps need a stable "now" that's safe to reference from
  // useMemo without calling Date.now() during render.
  const [sysNow] = useState(() => Date.now());

  const notifications = useMemo(() => {
    const items: {
      id: string;
      title: string;
      body: string;
      tone: NotifTone;
      time: number;
      category: NotifCategory;
    }[] = [];

    // Approvals as urgent notifications
    approvals.forEach(a => {
      items.push({
        id: `apr-${a.id}`,
        title: `Step-up required: ${a.title}`,
        body: `${a.agent} is awaiting your approval.`,
        tone: "warn",
        time: a.createdAt,
        category: "Approval",
      });
    });

    // Recent ledger denies as alerts
    [...ledger].reverse().filter(e => e.verdict === "DENY").slice(0, 3).forEach(e => {
      items.push({
        id: `deny-${e.seq}`,
        title: `Action denied: ${e.action}`,
        body: `${e.agent} was blocked by policy.`,
        tone: "bad",
        time: e.ts,
        category: "Alert",
      });
    });

    // Recent step-ups
    [...ledger].reverse().filter(e => e.verdict === "STEP_UP").slice(0, 2).forEach(e => {
      items.push({
        id: `stepup-${e.seq}`,
        title: `Step-up flagged: ${e.action}`,
        body: `${e.agent} triggered a step-up policy.`,
        tone: "info",
        time: e.ts,
        category: "Policy",
      });
    });

    // System info
    items.push({
      id: "sys-1",
      title: "Enforcement active",
      body: "All policies are enforced globally.",
      tone: "ok",
      time: sysNow - 3600000,
      category: "System",
    });
    items.push({
      id: "sys-2",
      title: "Ledger chain verified",
      body: "Hash chain integrity check passed.",
      tone: "ok",
      time: sysNow - 7200000,
      category: "System",
    });

    return items.sort((a, b) => b.time - a.time);
  }, [approvals, ledger, sysNow]);

  const unreadCount = notifications.filter(n => !read.has(n.id)).length;

  // KPI counts — memoized so the stats strip re-renders only when the list changes.
  const counts = useMemo(() => {
    const byCat: Record<NotifCategory, number> = { Approval: 0, Alert: 0, Policy: 0, System: 0 };
    for (const n of notifications) byCat[n.category]++;
    return byCat;
  }, [notifications]);

  const filtered = useMemo(
    () => (category === "All" ? notifications : notifications.filter(n => n.category === category)),
    [notifications, category]
  );

  const categoryFilters: Array<{ key: NotifCategory | "All"; label: string; count: number; tone: NotifTone }> = [
    { key: "All", label: "All", count: notifications.length, tone: "ok" },
    { key: "Approval", label: "Approval", count: counts.Approval, tone: "warn" },
    { key: "Alert", label: "Alert", count: counts.Alert, tone: "bad" },
    { key: "Policy", label: "Policy", count: counts.Policy, tone: "info" },
    { key: "System", label: "System", count: counts.System, tone: "ok" },
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Approvals, policy alerts, and system events."
        actions={
          <>
            {unreadCount > 0 && (
              <Btn
                variant="ghost"
                onClick={() => setRead(new Set(notifications.map(n => n.id)))}
              >
                Mark all read
              </Btn>
            )}
            <Btn
              variant="subtle"
              icon={<X size={13} />}
              onClick={() => {
                setRead(new Set(notifications.map(n => n.id)));
                toast("All notifications cleared", "ok");
              }}
            >
              Clear all
            </Btn>
          </>
        }
      />
      <div className="ad-scroll overflow-y-auto flex-1 p-6">
        <motion.div
          className="ad-page"
          variants={stagger}
          initial="visible"
          animate="visible"
        >
          {/* Stats strip — matches Devices / Providers premium pattern */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total", value: notifications.length },
              { label: "Unread", value: unreadCount },
              { label: "Approvals", value: counts.Approval },
              { label: "Alerts", value: counts.Alert },
            ].map(stat => (
              <div key={stat.label} data-slot="card" className="ad-card pad flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{stat.label}</span>
                <span className="text-2xl font-bold text-card-foreground tabular-nums">{stat.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Category filter chips */}
          {notifications.length > 0 && (
            <motion.div variants={fadeUp} className="flex items-center gap-1.5 flex-wrap">
              {categoryFilters.map(f => {
                const active = category === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setCategory(f.key)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                      active
                        ? "bg-foreground/8 text-foreground border-foreground/15 font-medium"
                        : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                    }`}
                  >
                    {f.key !== "All" && (
                      <span className={`size-1.5 rounded-full ${
                        f.tone === "bad" ? "bg-red-500" :
                        f.tone === "warn" ? "bg-amber-500" :
                        f.tone === "info" ? "bg-blue-500" :
                        "bg-emerald-500"
                      }`} />
                    )}
                    <span>{f.label}</span>
                    <span className="font-medium tabular-nums text-foreground/80">{f.count}</span>
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Notification rows */}
          {filtered.length === 0 ? (
            <motion.div variants={fadeUp} className="ad-empty-lg">
              <div className="ad-empty-ico"><Bell size={22} /></div>
              <div className="ad-empty-title">{category === "All" ? "All caught up" : `No ${category} notifications`}</div>
              <div className="text-xs text-muted-foreground">
                {category === "All" ? "No notifications right now." : `Nothing in this category yet.`}
              </div>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} className="flex flex-col gap-1.5">
              {filtered.map(n => {
                const isRead = read.has(n.id);
                const iconBg = NOTIF_TONE_BG[n.tone];
                return (
                  <motion.div
                    key={n.id}
                    variants={fadeUp}
                    className={`ad-notif-row group cursor-pointer flex items-stretch gap-4 ${isRead ? "is-read" : "is-unread"}`}
                    onClick={() => setRead(r => new Set([...r, n.id]))}
                  >
                    <div className="relative flex-shrink-0 pt-1">
                      <span className={`ad-row-ico ${iconBg}`}>
                        {NOTIF_ICON[n.category]}
                      </span>
                      {!isRead && (
                        <span
                          className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-blue-500 ring-2 ring-card animate-pulse"
                          aria-label="unread"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="mb-1.5">
                        <Chip tone={NOTIF_CHIP[n.category]} dot>{n.category}</Chip>
                      </div>
                      <div className={`ad-row-name ${!isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{n.title}</div>
                      <div className="ad-row-desc mt-0.5">{n.body}</div>
                    </div>
                    <div className="flex flex-col items-end justify-between pl-4">
                      <span className="text-[11px] text-muted-foreground tabular-nums pt-1">
                        {timeAgo(n.time)}
                      </span>
                      {n.category === "Approval" && (
                        <div className="pb-1">
                          <Btn
                            variant="ok"
                            sm
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              onNav("inbox");
                            }}
                          >
                            Review
                          </Btn>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
}
// ============================================================
// Profile
// ============================================================

