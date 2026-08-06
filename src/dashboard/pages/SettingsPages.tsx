/**
 * SettingsPages.tsx
 * Redesigned settings panel with a clean split-pane navigation layout.
 * Monochrome visual theme: grayscale slate/zinc palette, clear focus states.
 */
import { useMemo, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Shield, Bell, Settings, Check,
  Search, Download, History as HistoryIcon,
  Trash2,
  CreditCard,
  User
} from "lucide-react";

import { useStore } from "../data";
import { Toggle, PageHeader } from "../ui";
import { stagger, TZ_OPTIONS } from "./shared";
import { api } from "../../lib/client";
import type { LicenseStatus, ConnectSnippet } from "../../lib/types";

// shadcn UI primitives
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Animation ──
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
};

// ── Shared Settings Layout Component ──
export function SettingsSplitLayout({
  activeSub,
  children,
}: {
  activeSub: string;
  children: React.ReactNode;
}) {
  const tabs = [
    { id: "account", label: "Account & Profile", path: "settings/account", icon: <User size={14} /> },
    { id: "security", label: "Security & Policy", path: "settings/security", icon: <Shield size={14} /> },
    { id: "notifications", label: "Notifications", path: "settings/notifications", icon: <Bell size={14} /> },
    { id: "audit", label: "Audit log", path: "settings/audit", icon: <HistoryIcon size={14} /> },
  ];

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    if (window.location.hash.startsWith("#/app") || window.location.hash.startsWith("#/")) {
      window.history.pushState(null, "", `/#/app/${path}`);
    } else {
      const prefix = window.location.hostname.startsWith("app.") ? "/" : "/app/";
      window.history.pushState(null, "", `${prefix}${path}`);
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden bg-background">
      {/* Premium Horizontal Navigation (Sticky Top) */}
      <div className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-10 overflow-x-auto whitespace-nowrap px-6 py-4 flex gap-2 shrink-0 scrollbar-none shadow-sm transition-all">
        {tabs.map((tab) => {
          const active = activeSub === tab.id;
          const href = window.location.hostname.startsWith("app.") ? `/${tab.path}` : `/app/${tab.path}`;
          return (
            <a
              key={tab.id}
              href={href}
              onClick={(e) => handleNav(e, tab.path)}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border relative group",
                active
                  ? "bg-foreground text-background border-foreground shadow-md"
                  : "text-muted-foreground bg-transparent border-transparent hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                <span>{tab.label}</span>
              </span>
            </a>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-y-auto p-6 md:p-10 lg:p-12 min-w-0">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-8 pb-12">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Simple status badge ──
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[10px] font-medium border px-2 py-0.5",
        ok
          ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          : "bg-muted text-muted-foreground border-border"
      )}
    >
      {ok && <span className="mr-1.5 inline-block size-1 rounded-full bg-emerald-500" />}
      {label}
    </Badge>
  );
}

// ── Uniform Settings Card Section ──
function Section({
  title,
  description,
  badge,
  children,
  danger,
  className,
  testId,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  danger?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <motion.div variants={fadeUp} data-testid={testId} className="group">
      <Card className={cn("ad-card !rounded-2xl overflow-hidden bg-card/40 backdrop-blur-md border border-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border/80 hover:bg-card/60", danger && "border-destructive/30 bg-destructive/5 hover:border-destructive/50", className)}>
        <CardHeader className="pb-4 px-7 pt-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className={cn("text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-foreground/90", danger && "text-destructive")}>
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{description}</CardDescription>
              )}
            </div>
            {badge}
          </div>
        </CardHeader>
        {children && (
          <CardContent className="px-7 pb-7">
            <div className="flex flex-col gap-5">{children}</div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

// ── Uniform settings input row ──
function SettingRow({
  label,
  description,
  children,
  htmlFor,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <div className="flex flex-col gap-0.5 min-w-0">
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium text-foreground cursor-default"
        >
          {label}
        </label>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Custom inline confirmation button ──
function InlineConfirm({
  trigger,
  confirmLabel,
  onConfirm,
}: {
  trigger: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AnimatePresence mode="wait">
      {open ? (
        <motion.div
          key="confirm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          className="flex items-center gap-1.5"
        >
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs px-2.5"
            onClick={() => { onConfirm(); setOpen(false); }}
          >
            {confirmLabel}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </motion.div>
      ) : (
        <motion.div key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setOpen(true)}
          >
            {trigger}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function whenLabel(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

type ToastFn = (msg: string, tone?: "ok" | "bad" | "info") => void;
function useFlashKey(toastFn: ToastFn) {
  const [saved, setSaved] = useState<string | null>(null);
  const flash = (key: string, msg: string, cb?: () => void) => {
    cb?.();
    setSaved(key);
    toastFn(msg, "ok");
    window.setTimeout(() => setSaved((cur) => (cur === key ? null : cur)), 1600);
  };
  return { saved, flash };
}

// ============================================================
// SettingsPage — Security & Enforcement (/settings/security)
// ============================================================
export function SettingsPage({ onReopenWizard }: { onReopenWizard: () => void }) {
  const { settings, updateSettings, toast } = useStore();
  const [licenseKey, setLicenseKey] = useState(settings.licenseKey);
  const { saved, flash } = useFlashKey(toast);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [connect, setConnect] = useState<ConnectSnippet | null>(null);
  const [connectCopied, setConnectCopied] = useState(false);

  const licenseDirty = licenseKey.trim() !== settings.licenseKey;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [lic, conn] = await Promise.all([api.getLicense(), api.getConnect()]);
        if (!cancelled) {
          setLicense(lic);
          setConnect(conn);
        }
      } catch {
        /* license/connect endpoints unreachable — leave panel in its default state */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleActivateLicense = async () => {
    const key = licenseKey.trim();
    if (!key) return;
    setLicenseBusy(true);
    try {
      const res = await api.activateLicense({ key });
      if (res.ok) {
        const lic = await api.getLicense();
        setLicense(lic);
        flash("license", "License key registered", () => updateSettings({ licenseKey: key }));
      } else {
        toast(res.reason ?? "License activation failed", "bad");
      }
    } catch {
      toast("License service unreachable", "bad");
    } finally {
      setLicenseBusy(false);
    }
  };

  const handleDeactivateLicense = async () => {
    setLicenseBusy(true);
    try {
      const res = await api.deactivateLicense();
      if (res.ok) {
        const lic = await api.getLicense();
        setLicense(lic);
        setLicenseKey("");
        updateSettings({ licenseKey: "" });
        toast("License deactivated", "info");
      } else {
        toast("License deactivation failed", "bad");
      }
    } catch {
      toast("License service unreachable", "bad");
    } finally {
      setLicenseBusy(false);
    }
  };

  const connectSnippetText = connect ? JSON.stringify(connect.snippet, null, 2) : "";

  return (
    <motion.div variants={stagger} initial="visible" animate="visible" className="flex flex-col gap-6">
      <PageHeader
        title="Security & Enforcement"
        subtitle="Policy constraints, thresholds, and licensing."
        actions={null}
      />

      <Section
        title="Enforcement"
        description="Global evaluation check constraint for all system agents."
        badge={<StatusBadge ok={settings.enforcement} label={settings.enforcement ? "Active" : "Paused"} />}
      >
        <SettingRow
          label="Global enforcement"
          description={settings.enforcement ? "Policies are strictly enforced across the system." : "Policies are evaluated in monitoring-only mode."}
        >
          <Toggle
            on={settings.enforcement}
            onClick={() => updateSettings({ enforcement: !settings.enforcement })}
            label="global enforcement"
          />
        </SettingRow>

        <Separator />

        <SettingRow
          label="Step-up threshold"
          description="Force biometric approval for tasks exceeding this USD value."
          htmlFor="step-up-threshold"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">$</span>
            <Input
              id="step-up-threshold"
              type="number"
              min={0}
              step={1}
              value={settings.stepUpThreshold}
              onChange={(e) => updateSettings({ stepUpThreshold: Math.max(0, Number(e.target.value) || 0) })}
              className="h-7 w-20 text-xs font-mono"
            />
          </div>
        </SettingRow>
      </Section>

      <Section
        title="License Plan"
        description="Production mandate key to bind agent cryptographic identities."
        badge={
          license ? (
            <StatusBadge ok={license.operable} label={license.plan ?? (license.mode === "enforced" ? "Enforced" : "Disabled")} />
          ) : (
            <StatusBadge ok={!!settings.licenseKey} label={settings.licenseKey ? "Active" : "Trial"} />
          )
        }
      >
        {license && (
          <p className="text-[11px] text-muted-foreground -mt-1">
            {license.reason}
            {license.expiresAt ? ` · Expires ${new Date(license.expiresAt).toLocaleDateString()}` : ""}
          </p>
        )}
        <div className="flex gap-2">
          <Input
            className="flex-1 h-8 text-xs font-mono"
            placeholder="Paste mandate license key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && licenseDirty && licenseKey.trim()) void handleActivateLicense();
            }}
          />
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={!licenseDirty || !licenseKey.trim() || licenseBusy}
            onClick={() => void handleActivateLicense()}
          >
            {saved === "license" && <Check className="size-3 mr-1" />}
            {licenseBusy ? "Registering…" : saved === "license" ? "Saved" : "Register"}
          </Button>
          {!!settings.licenseKey && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={licenseBusy}
              onClick={() => void handleDeactivateLicense()}
            >
              Deactivate
            </Button>
          )}
        </div>
      </Section>

      <Section
        title="MCP Connect"
        description="Configuration snippet for connecting an MCP client to this agent."
      >
        {connect ? (
          <div className="flex flex-col gap-2">
            <pre className="text-[10.5px] font-mono bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">{connectSnippetText}</pre>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs self-start"
              onClick={() => {
                navigator.clipboard?.writeText(connectSnippetText);
                setConnectCopied(true);
                toast("Connect snippet copied", "ok");
                window.setTimeout(() => setConnectCopied(false), 1600);
              }}
            >
              {connectCopied && <Check className="size-3 mr-1" />}
              {connectCopied ? "Copied" : "Copy snippet"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Connect snippet unavailable — the config endpoint could not be reached.</p>
        )}
      </Section>

      <Section title="Setup Settings" description="Reconfigure environment parameters using the initial setup workflow.">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs self-start"
          onClick={onReopenWizard}
        >
          <Settings className="size-3 mr-1.5" />
          Open Setup Wizard
        </Button>
      </Section>

      <Section
        title="Danger zone"
        description="Destructive actions. These actions cannot be undone."
        badge={
          <Badge variant="secondary" className="text-[10px] text-destructive border-destructive/20 bg-destructive/5 px-2 py-0.5">
            Caution
          </Badge>
        }
        danger
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-foreground">Revoke all active sessions</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Terminate all active operator web tokens immediately.</p>
            </div>
            <InlineConfirm
              trigger="Revoke"
              confirmLabel="Yes, revoke sessions"
              onConfirm={() => toast("Sessions revoked", "bad")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-foreground">Reset configuration</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Restore all dashboard database settings to default values.</p>
            </div>
            <InlineConfirm
              trigger="Reset"
              confirmLabel="Yes, reset configuration"
              onConfirm={() => {
                updateSettings({
                  enforcement: true, licenseKey: "", apiUrl: "https://agenttag-backend-production-a853.up.railway.app",
                  stepUpThreshold: 200, notifyEmail: true, notifySms: false, notifyPush: false, notifyWebhook: false,
                });
                toast("Settings reset", "info");
              }}
            />
          </div>
        </div>
      </Section>
    </motion.div>
  );
}





// ============================================================
// SettingsAccountPage
// ============================================================
export function SettingsAccountPage() {
  const { settings, updateSettings, toast } = useStore();
  const [name, setName] = useState("Operator");
  const [email, setEmail] = useState("operator@agenttag.me");
  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const { saved, flash } = useFlashKey(toast);

  const nameDirty = name !== "Operator";
  const emailDirty = email !== "operator@agenttag.me";
  const apiDirty = apiUrl.trim() !== settings.apiUrl;

  const plan = settings.licenseKey
    ? { name: "Agenttag Studio", renews: "Mar 14, 2026", seats: "5 / 10", spend: "$342 / $1,000" }
    : { name: "Trial Plan", renews: "—", seats: "1 / 1", spend: "$0" };

  return (
    <motion.div variants={stagger} initial="visible" animate="visible" className="flex flex-col gap-6">
      <PageHeader
        title="Account & Profile"
        subtitle="Configure profile metadata, billing, and API endpoints."
        actions={null}
      />

      <Section title="Profile Info" description="Operator account authentication variables.">
        <div className="flex items-center gap-4 mb-2">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80"
            className="size-12 rounded-full object-cover border border-border"
            alt="Avatar"
          />
          <div>
            <p className="text-xs font-semibold text-foreground">{name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{email}</p>
          </div>
        </div>
        <Separator />
        <SettingRow label="Display name" htmlFor="account-name">
          <div className="flex gap-2">
            <Input id="account-name" className="h-8 w-44 text-xs" value={name} onChange={(e) => setName(e.target.value)} />
            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!nameDirty} onClick={() => flash("name", "Name updated")}>
              {saved === "name" && <Check className="size-3 mr-1" />}
              Save
            </Button>
          </div>
        </SettingRow>
        <Separator />
        <SettingRow label="Email address" htmlFor="account-email">
          <div className="flex gap-2">
            <Input id="account-email" type="email" className="h-8 w-44 text-xs" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!emailDirty} onClick={() => flash("email", "Email updated")}>
              {saved === "email" && <Check className="size-3 mr-1" />}
              Save
            </Button>
          </div>
        </SettingRow>
      </Section>

      <Section
        title="Subscription details"
        description="Billing metrics for the current control plane plan."
        badge={<StatusBadge ok={!!settings.licenseKey} label={plan.name} />}
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {[
            { label: "Plan Type", value: plan.name },
            { label: "Renews on", value: plan.renews },
            { label: "Seat usage", value: plan.seats },
            { label: "Month spend", value: plan.spend },
          ].map((row) => (
            <div key={row.label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{row.label}</p>
              <p className="text-xs font-bold mt-1 text-foreground tabular-nums">{row.value}</p>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex gap-2">
          <Button size="sm" className="h-8 text-xs" onClick={() => window.open("https://billing.stripe.com/p/login/test", "_blank")}>
            <CreditCard className="size-3 mr-1.5" />
            Manage Billing
          </Button>
        </div>
      </Section>

      <Section title="Control plane endpoint" description="Outbound backend connection endpoint for operations routing.">
        <div className="flex gap-2">
          <Input className="flex-1 h-8 text-xs font-mono" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!apiDirty} onClick={() => flash("api", "Endpoint saved", () => updateSettings({ apiUrl: apiUrl.trim() }))}>
            {saved === "api" && <Check className="size-3 mr-1" />}
            Save
          </Button>
        </div>
      </Section>
    </motion.div>
  );
}

// ============================================================
// SettingsWorkspacePage
// ============================================================
export function SettingsWorkspacePage() {
  const { toast } = useStore();
  const [workspaceName, setWorkspaceName] = useState("Agenttag workspace");
  const workspaceId = "ws_agenttag_8f4d2c1b";
  const [region, setRegion] = useState("us-east-1");
  const [inviteEmail, setInviteEmail] = useState("");
  const { saved, flash } = useFlashKey(toast);
  const [members, setMembers] = useState([
    { id: "u1", name: "Operator", email: "operator@agenttag.me", role: "Owner", active: true },
    { id: "u2", name: "Alice Chen", email: "alice@agenttag.me", role: "Admin", active: true },
    { id: "u3", name: "Bruno Costa", email: "bruno@agenttag.me", role: "Member", active: true },
    { id: "u4", name: "Diana Park", email: "diana@agenttag.me", role: "Member", active: false },
  ]);

  const nameDirty = workspaceName !== "Agenttag workspace";

  const handleInvite = () => {
    const e = inviteEmail.trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast("Enter a valid email", "bad"); return; }
    if (members.some((m) => m.email.toLowerCase() === e.toLowerCase())) { toast("Already invited", "info"); return; }
    setMembers((c) => [...c, { id: `u${Date.now()}`, name: e.split("@")[0], email: e, role: "Member", active: false }]);
    setInviteEmail("");
    toast(`Invitation transmitted`, "ok");
  };

  const REGIONS = [
    { value: "us-east-1", label: "US East (Virginia)" },
    { value: "us-west-2", label: "US West (Oregon)" },
    { value: "eu-west-1", label: "EU West (Dublin)" },
  ];

  return (
    <motion.div variants={stagger} initial="visible" animate="visible" className="flex flex-col gap-6">
      <PageHeader
        title="Workspace Details"
        subtitle="Manage workspace credentials, clusters, and membership."
        actions={null}
      />

      <Section title="Identity parameters" description="Workspace variables and resource hosting locations.">
        <SettingRow label="Workspace Name" htmlFor="ws-name">
          <div className="flex gap-2">
            <Input id="ws-name" className="h-8 w-44 text-xs" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!nameDirty} onClick={() => flash("ws", "Workspace renamed")}>
              {saved === "ws" && <Check className="size-3 mr-1" />}
              Save
            </Button>
          </div>
        </SettingRow>
        <Separator />
        <SettingRow label="Workspace ID">
          <div className="flex gap-2 items-center">
            <code className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-2 py-0.5">{workspaceId}</code>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={() => { navigator.clipboard?.writeText(workspaceId); toast("Copied", "ok"); }}>Copy</Button>
          </div>
        </SettingRow>
        <Separator />
        <SettingRow label="Resource Region" description="Residency region for logs and keys." htmlFor="ws-region">
          <select
            id="ws-region"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            value={region}
            onChange={(e) => { setRegion(e.target.value); toast(`Region re-routed`, "ok"); }}
          >
            {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </SettingRow>
      </Section>

      <Section
        title="Access Control"
        description="Teammate memberships with role mappings."
        badge={<Badge variant="secondary" className="text-[10px] px-2 py-0.5">{members.length} members</Badge>}
      >
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="operator@company.com"
            className="flex-1 h-8 text-xs"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
          />
          <Button size="sm" className="h-8 text-xs px-3" onClick={handleInvite}>
            Invite
          </Button>
        </div>
        <Separator />
        <div className="flex flex-col divide-y divide-border -my-1.5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3 text-xs">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                {m.name[0]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{m.name}</span>
                  {!m.active && <Badge variant="outline" className="text-[9px] px-1 py-0 border-dashed">Invited</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{m.email}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{m.role}</span>
              {m.role !== "Owner" && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setMembers((c) => c.filter((x) => x.id !== m.id))}
                  aria-label={`Revoke access for ${m.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Section>
    </motion.div>
  );
}

// ============================================================
// SettingsAuditPage
// ============================================================
export function SettingsAuditPage() {
  const { ledger, toast } = useStore();
  const [filter, setFilter] = useState<"all" | "settings" | "policy" | "auth">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return ledger
      .filter((e) => {
        const action = e.action.toLowerCase();
        const cat = ((e as unknown as { category?: string }).category || "").toLowerCase();
        if (filter === "settings") return action.includes("settings") || cat.includes("settings");
        if (filter === "policy") return e.eventType === "policy";
        if (filter === "auth") return action.includes("auth") || action.includes("device") || action.includes("session");
        return true;
      })
      .filter((e) => !needle || e.action.toLowerCase().includes(needle) || e.agent.toLowerCase().includes(needle) || (e.hash || "").toLowerCase().includes(needle))
      .slice(-50)
      .reverse();
  }, [ledger, filter, search]);

  const verdictColor = (v: string) => {
    if (v === "OK" || v === "ALLOW") return "text-emerald-500";
    if (v === "DENY") return "text-destructive";
    return "text-muted-foreground";
  };

  const FILTERS = [
    { value: "all" as const, label: "All Logs" },
    { value: "settings" as const, label: "Settings" },
    { value: "policy" as const, label: "Policies" },
    { value: "auth" as const, label: "Authentication" },
  ];

  return (
    <motion.div variants={stagger} initial="visible" animate="visible" className="flex flex-col gap-6">
      <PageHeader
        title="Audit Log"
        subtitle="Cryptographically locked ledger stream of config updates."
        actions={
          <>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
              const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `audit-${Date.now()}.json`; a.click();
              URL.revokeObjectURL(url);
              toast(`Transmitted JSON export`, "ok");
            }}>
              <Download className="size-3 mr-1.5" />
              Download
            </Button>

          </>
        }
      />

      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? "secondary" : "ghost"}
              className="h-7 text-[11px] px-2.5"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            className="h-7 pl-8 text-xs w-44 font-sans"
            placeholder="Search log..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <HistoryIcon className="size-6 text-muted-foreground/45 mx-auto mb-2" />
            <p className="text-xs font-semibold text-muted-foreground">No ledger events recorded</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Adjust filter query variables.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border overflow-hidden">
          <CardContent className="p-0 divide-y divide-border font-mono text-[11.5px]">
            {filtered.map((e, i) => (
              <div key={e.seq ?? i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <span className="text-muted-foreground/40 w-10 shrink-0">#{e.seq}</span>
                <span className="text-muted-foreground w-14 shrink-0 font-sans text-[10px]">{whenLabel(e.ts)}</span>
                <span className={cn("font-bold w-14 shrink-0", verdictColor(String(e.verdict)))}>
                  {String(e.verdict)}
                </span>
                <span className="flex-1 truncate text-foreground/90 font-sans">{e.action}</span>
                <code className="text-[10px] text-muted-foreground/45 shrink-0 hidden sm:block">{(e.hash || "").slice(0, 8)}</code>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// ============================================================
// SettingsNotificationsPage
// ============================================================
export function SettingsNotificationsPage() {
  const { settings, updateSettings, toast } = useStore();
  const [qhStart, setQhStart] = useState(settings.quietHoursStart ?? "22:00");
  const [qhEnd, setQhEnd] = useState(settings.quietHoursEnd ?? "07:00");
  const [qhTz, setQhTz] = useState(settings.quietHoursTz ?? "America/Sao_Paulo");
  const [sending, setSending] = useState<"email" | "sms" | "push" | "webhook" | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<{ quietHoursStart: string; quietHoursEnd: string; quietHoursTz: string }>>({});

  const debouncedSave = (patch: typeof pendingRef.current) => {
    pendingRef.current = { ...pendingRef.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { updateSettings(pendingRef.current); pendingRef.current = {}; }, 400);
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const sendTest = (ch: "email" | "sms" | "push" | "webhook", label: string) => {
    if (sending) return;
    setSending(ch);
    setTimeout(() => {
      const success = Math.random() < 0.9;
      if (ch === "email") {
        toast(success ? "Test email sent to operator@agenttag.me" : "Test email failed to send", success ? "ok" : "warn");
      } else {
        toast(success ? "Verification message sent" : `${label} test failed to send`, success ? "ok" : "warn");
      }
      setSending(null);
    }, 600);
  };

  const CHANNELS = [
    { key: "email" as const, settingKey: "notifyEmail" as const, label: "Email" },
    { key: "sms" as const, settingKey: "notifySms" as const, label: "SMS Alerts" },
    { key: "push" as const, settingKey: "notifyPush" as const, label: "Push notifications" },
    { key: "webhook" as const, settingKey: "notifyWebhook" as const, label: "Outbound Webhooks" },
  ];

  const EVENTS = [
    { key: "approval", label: "New approval request" },
    { key: "freeze", label: "Agent frozen/killed" },
    { key: "mandateExpiring", label: "Mandate expiring soon" },
    { key: "licenseIssue", label: "License issue" },
  ] as const;

  return (
    <motion.div variants={stagger} initial="visible" animate="visible" className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        subtitle="Configure dispatch channels, parameters, and quiet periods."
        actions={null}
      />

      <Section title="Active Channels" description="Transmit notifications to target endpoints." testId="channels-section">
        {CHANNELS.map((ch, i) => (
          <div key={ch.key} data-testid={`channel-${ch.key}`}>
            {i > 0 && <Separator className="my-3" />}
            <SettingRow label={ch.label}>
              <Toggle
                on={!!settings[ch.settingKey]}
                onClick={() => updateSettings({ [ch.settingKey]: !settings[ch.settingKey] })}
                label={`${ch.label} alerts`}
              />
            </SettingRow>
          </div>
        ))}
      </Section>

      <Section title="Event routing" description="Route operational signals to active alert channels.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="routing-matrix">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground font-semibold pb-2 pr-4">Event Type</th>
                {CHANNELS.map((ch) => (
                  <th key={ch.key} className="text-center text-muted-foreground font-semibold pb-2 w-16">{ch.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {EVENTS.map((ev) => (
                <tr key={ev.key} data-testid={`routing-row-${ev.key}`}>
                  <td className="py-2.5 pr-4 text-foreground font-medium">{ev.label}</td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.key} className="py-2.5 text-center">
                      <Toggle
                        on={!!settings.notifyRouting?.[ev.key]?.[ch.key]}
                        onClick={() => updateSettings({
                          notifyRouting: {
                            ...settings.notifyRouting,
                            [ev.key]: {
                              ...settings.notifyRouting[ev.key],
                              [ch.key]: !settings.notifyRouting[ev.key]?.[ch.key],
                            },
                          },
                        })}
                        label={`route ${ev.key} via ${ch.key}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Quiet period" description="Suppress standard alert dispatches during configured time constraints." testId="quiet-hours">
        <div className="flex gap-4 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Start</span>
            <Input data-testid="quiet-hours-start" type="time" className="h-8 text-xs w-28" value={qhStart}
              onChange={(e) => { setQhStart(e.target.value); debouncedSave({ quietHoursStart: e.target.value }); }} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">End</span>
            <Input data-testid="quiet-hours-end" type="time" className="h-8 text-xs w-28" value={qhEnd}
              onChange={(e) => { setQhEnd(e.target.value); debouncedSave({ quietHoursEnd: e.target.value }); }} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Zone</span>
            <select
              data-testid="quiet-hours-tz"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              value={qhTz}
              onChange={(e) => { setQhTz(e.target.value); debouncedSave({ quietHoursTz: e.target.value }); }}
            >
              {TZ_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
        </div>
      </Section>

      <Section title="Channel validation" description="Trigger a mock payload check to test channel routing integrity." testId="test-notification">
        <div className="flex gap-2 flex-wrap">
          {CHANNELS.map((ch) => (
            <Button
              key={ch.key}
              data-testid={ch.key === "email" ? "send-test-email" : `test-${ch.key}`}
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={!!sending}
              onClick={() => sendTest(ch.key, ch.label)}
            >
              {sending === ch.key ? "Verifying..." : `Test ${ch.label}`}
            </Button>
          ))}
        </div>
      </Section>
    </motion.div>
  );
}

// ============================================================
