/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { clerkPublishableKey, setApiClerkToken } from "../lib/client";
import {
  LayoutDashboard, Plug, Settings as SettingsIcon, Sun, Moon,
  LifeBuoy, ShieldCheck, Inbox as InboxIcon,
  Smartphone, Plus, HelpCircle, Bell, Search,
  Wallet, Database
} from "lucide-react";
import "./dashboard.css";
import { StoreProvider, useStore } from "./data";
import { Toasts } from "./ui";
import { GovernancePage, OverviewPage, InboxPage, ProvidersPage, DevicesPage, SettingsPage, SettingsAccountPage, SettingsAuditPage, SettingsNotificationsPage, SettingsSplitLayout, NotificationsPage, ProfilePage, SupportPage, HelpPage, WalletPage, VaultPage, AuditLedgerPage, HistoryPage } from "./pages";
import { Wizard } from "./Wizard";
import { CommandPalette, useCommandKShortcut } from "./CommandPalette";
import { AgentSwapper } from "./AgentSwapper";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getStored, setStored, removeStored } from "@/lib/storage";

export type RouteKey =
  | "dashboard" | "governance" | "inbox" | "providers" | "devices" | "settings" | "support"
  | "vault" | "wallet" | "audit" | "history"
  | "notifications" | "profile" | "help";

export type SettingsSubpath =
  | "security"
  | "account"
  | "notifications"
  | "audit";

const SETTINGS_SUBPATHS: SettingsSubpath[] = [
  "account", "security", "notifications", "audit",
];

export function parseSettingsSubpath(url: string = window.location.pathname + window.location.hash): SettingsSubpath | null {
  let p = url;
  const hashIndex = p.indexOf("#");
  if (hashIndex !== -1) {
    const hash = p.substring(hashIndex);
    p = hash.startsWith("#/") ? hash.replace(/^#/, "") : p.substring(0, hashIndex);
  }

  // Strip leading slash
  p = p.replace(/^\//, "");
  // Strip optional leading "app/" or "app" prefix
  p = p.replace(/^(app\/|app$)/, "");

  const parts = p.split(/[/?#]/).filter(Boolean);
  if (parts[0] !== "settings") return null;
  const sub = parts[1] || "account";
  return (SETTINGS_SUBPATHS as readonly string[]).includes(sub) ? (sub as SettingsSubpath) : "account";
}

const ROUTES: RouteKey[] = [
  "dashboard", "governance", "inbox", "providers", "devices", "settings", "support",
  "vault", "wallet", "audit", "history", "notifications", "profile", "help",
];

const ROUTE_LABEL: Record<RouteKey, string> = {
  dashboard: "Dashboard", inbox: "Inbox", governance: "Governance",
  providers: "Providers", devices: "Devices", settings: "Settings", support: "Support",
  vault: "Vault", wallet: "Wallet", audit: "Audit Ledger", history: "History",
  notifications: "Notifications", profile: "Profile", help: "Help & Shortcuts",
};

export function parseRoutePath(): RouteKey {
  const hash = window.location.hash;
  const pathname = window.location.pathname;
  let p = hash.startsWith("#/") ? hash.replace(/^#/, "") : pathname;

  // Strip leading slash
  p = p.replace(/^\//, "");
  // Strip optional leading "app/" or "app" prefix
  p = p.replace(/^(app\/|app$)/, "");

  const parts = p.split(/[/?#]/).filter(Boolean);
  const key = parts[0] as RouteKey;
  return ROUTES.includes(key) ? key : "dashboard";
}

function useAppRoute(): [RouteKey, string, (k: RouteKey) => void] {
  const [pathStr, setPathStr] = useState(() => window.location.pathname + window.location.hash);
  const [route, setRoute] = useState<RouteKey>(parseRoutePath());
  
  useEffect(() => {
    const on = () => {
      setPathStr(window.location.pathname + window.location.hash);
      setRoute(parseRoutePath());
    };
    window.addEventListener("popstate", on);
    window.addEventListener("hashchange", on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener("hashchange", on);
    };
  }, []);
  
  const nav = (k: RouteKey) => {
    if (window.location.hash.startsWith("#/app") || window.location.hash.startsWith("#/")) {
      window.history.pushState(null, "", `/#/app/${k}`);
    } else {
      const prefix = window.location.hostname.startsWith("app.") ? "/" : "/app/";
      window.history.pushState(null, "", `${prefix}${k}`);
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return [route, pathStr, nav];
}

type NavItem = { key: RouteKey; label: string; icon: React.ReactNode; group: "today" | "finance" | "setup" };

const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard />, group: "today" },
  { key: "inbox", label: "Inbox", icon: <InboxIcon />, group: "today" },
  { key: "governance", label: "Governance", icon: <ShieldCheck />, group: "today" },
  { key: "audit", label: "Audit Ledger", icon: <Database />, group: "today" },
  { key: "vault", label: "Vault", icon: <ShieldCheck />, group: "finance" },
  { key: "wallet", label: "Wallet", icon: <Wallet />, group: "finance" },
  { key: "providers", label: "Providers", icon: <Plug />, group: "setup" },
  { key: "devices", label: "Devices", icon: <Smartphone />, group: "setup" },
  { key: "settings", label: "Settings", icon: <SettingsIcon />, group: "setup" },
];

function useTheme(): [boolean, (e?: React.MouseEvent | MouseEvent) => void] {
  const [dark, setDark] = useState(() => document.documentElement.getAttribute("data-theme") === "dark");
  
  const toggle = (e?: React.MouseEvent | MouseEvent) => {
    const next = !dark;
    const updateTheme = () => {
      setDark(next);
      if (next) document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      setStored("aeg-theme", next ? "dark" : "light");
    };

    if (!document.startViewTransition) {
      updateTheme();
      return;
    }

    const x = e?.clientX ?? window.innerWidth / 2;
    const y = e?.clientY ?? window.innerHeight / 2;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(updateTheme);
    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];
      document.documentElement.animate(
        {
          clipPath: next ? clipPath : [...clipPath].reverse(),
        },
        {
          duration: 500,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: next ? "::view-transition-new(root)" : "::view-transition-old(root)",
        }
      );
    });
  };
  
  return [dark, toggle];
}

// ============================================================
// Sidebar
// ============================================================
/** Left-click without modifiers navigates client-side (no full page reload); everything else (cmd/ctrl/shift/middle-click) falls through to the browser's normal "open in new tab" handling via the real href. */
const clientNav = (e: React.MouseEvent, go: () => void) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go();
};

function AgenttagSidebar({ route, nav, onOpenWizard, dark }: {
  route: RouteKey;
  nav: (k: RouteKey) => void;
  onOpenWizard: () => void;
  dark: boolean;
}) {
  const { approvals, agents } = useStore();
  const groups: { label: string; items: NavItem[] }[] = [
    { label: "Today", items: NAV.filter((n) => n.group === "today") },
    { label: "Finance", items: NAV.filter((n) => n.group === "finance") },
    { label: "Configure", items: NAV.filter((n) => n.group === "setup") },
  ];

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="ad-side bg-background *:data-[slot=sidebar-inner]:bg-background">
      <SidebarHeader className="h-(--app-header-height,3rem) flex-row items-center justify-between group-data-[collapsible=icon]:justify-center">
        <a
          href={window.location.hostname.startsWith("app.") ? "/dashboard" : "/app/dashboard"}
          onClick={(e) => clientNav(e, () => nav("dashboard"))}
          className="flex items-center gap-2 px-1.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto"
        >
          <img
            src={dark ? "/logo_bgremoved_inverted.png" : "/logo_bgremoved.png"}
            alt="AgentTag"
            className="h-5 w-auto"
            style={{ outline: "none" }}
          />
          <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">AgentTag</span>
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="gap-2 group-data-[collapsible=icon]:hidden">
          <Button onClick={onOpenWizard} size="default" className="w-full justify-center gap-1.5 rounded-lg font-semibold ad-connect-btn transition-transform active:scale-[0.96]">
            <Plus className="size-4" /> Connect Agent
          </Button>
        </SidebarGroup>

        {groups.map((g, idx) => (
          <div key={g.label}>
            {idx > 0 && <SidebarSeparator className="my-2 opacity-30 mx-4" />}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{g.label}</SidebarGroupLabel>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        route === item.key ||
                        (item.key === "settings" && route === "profile") ||
                        (item.key === "dashboard" && route === "notifications")
                      }
                      tooltip={item.label}
                      className="ad-nav-item"
                    >
                      <a
                        href={window.location.hostname.startsWith("app.") ? `/${item.key}` : `/app/${item.key}`}
                        onClick={(e) => clientNav(e, () => nav(item.key))}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                    {item.key === "inbox" && approvals.length > 0 && (
                      <SidebarMenuBadge className="bg-primary text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground">{approvals.length}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-2 px-3 pb-3 group-data-[collapsible=icon]:px-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={route === "support" || route === "help"} tooltip="Support" className="ad-nav-item">
              <a
                href={window.location.hostname.startsWith("app.") ? "/support" : "/app/support"}
                onClick={(e) => clientNav(e, () => nav("support"))}
              >
                <LifeBuoy />
                <span>Support</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <AgentSwapper agents={agents} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// ============================================================
// Header
// ============================================================
function AgenttagHeader({
  route, nav, dark, toggleTheme, onOpenSearch,
}: {
  route: RouteKey;
  nav: (k: RouteKey) => void;
  dark: boolean;
  toggleTheme: () => void;
  onOpenSearch: () => void;
}) {
  const { approvals } = useStore();

  // Cmd+K / Ctrl+K keyboard shortcut (centralized via the palette hook)
  useCommandKShortcut(onOpenSearch);

  return (
    <header className="sticky top-0 z-30 grid grid-cols-3 h-(--app-header-height,3rem) w-full shrink-0 items-center gap-2 border-b border-border bg-background px-4 md:px-6 relative">
      <div className="flex items-center gap-3 justify-start">
        <div className="relative isolate group">
          <SidebarTrigger className="ad-topbar-btn before:absolute before:-inset-2 before:content-['']" />
        </div>
        <Breadcrumb>
          <BreadcrumbList className="flex items-center gap-1 text-xs text-muted-foreground flex-row">
            <BreadcrumbItem>
              <span className="text-muted-foreground/60">Agenttag</span>
            </BreadcrumbItem>
            <span className="text-muted-foreground/30 text-[10px] select-none">/</span>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-foreground">{ROUTE_LABEL[route]}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Centered Command Bar Trigger */}
      <div className="hidden md:flex items-center justify-center">
        <button
          onClick={onOpenSearch}
          aria-label="Open command palette"
          aria-keyshortcuts="Meta+K Control+K"
          className="ad-topbar-btn is-cmdk flex h-8 w-64 items-center justify-between rounded-lg px-3 text-xs transition-colors"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Search size={13} className="shrink-0" />
            <span className="truncate whitespace-nowrap">Search actions, pages, agents…</span>
          </span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded px-1.5">
            <span>⌘</span>K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <Button
          size="icon-sm"
          variant="outline"
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          className="ad-topbar-btn ad-theme-icon-btn ad-theme-toggle relative before:absolute before:-inset-2 before:content-['']"
          onClick={toggleTheme}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={dark ? "sun" : "moon"}
              initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </motion.span>
          </AnimatePresence>
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Help"
          className="ad-topbar-btn relative before:absolute before:-inset-2 before:content-['']"
          onClick={() => nav("help")}
        >
          <HelpCircle />
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          aria-label={`Notifications${approvals.length > 0 ? `, ${approvals.length} unread` : ""}`}
          className="ad-topbar-btn relative before:absolute before:-inset-2 before:content-['']"
          onClick={() => nav("notifications")}
        >
          <span className={`inline-flex ${approvals.length > 0 ? "ad-bell-shake" : ""}`} aria-hidden="true">
            <Bell />
          </span>
          <AnimatePresence>
            {approvals.length > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0, x: -8.2, y: 12.4, filter: "blur(2.5px)" }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0, x: -8.2, y: 12.4, filter: "blur(2.5px)" }}
                transition={{
                  x: { type: "spring", stiffness: 420, damping: 34, mass: 0.7 },
                  y: { type: "spring", stiffness: 420, damping: 34, mass: 0.7 },
                  scale: { type: "spring", stiffness: 350, damping: 20 },
                  opacity: { duration: 0.2 },
                  filter: { duration: 0.2 }
                }}
                className="ad-bell-badge absolute -top-1 -right-1 size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background tabular-nums"
                aria-hidden="true"
              >
                {approvals.length}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>

        <Separator className="h-4 data-[orientation=vertical]:self-center" orientation="vertical" />

        <button
          onClick={() => nav("profile")}
          aria-label="Open profile"
          className="ad-topbar-btn rounded-full focus:outline-none focus-visible:[box-shadow:var(--shadow-focus)] relative before:absolute before:-inset-2 before:content-['']"
        >
          <Avatar className="size-8">
            <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80" alt="operator" />
            <AvatarFallback>OP</AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}

// ============================================================
// Shell
// ============================================================
function PageSkeleton({ route }: { route: RouteKey }) {
  if (route === "settings") {
    return (
      <div className="flex h-full w-full animate-in fade-in duration-300">
        <div className="w-64 border-r border-border p-4 flex flex-col gap-2 shrink-0 hidden md:flex">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (route === "audit" || route === "history" || route === "inbox") {
    return (
      <div className="flex flex-col gap-6 p-6 h-full w-full overflow-hidden animate-in fade-in duration-300">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-16 rounded-lg w-full" />
          <Skeleton className="h-16 rounded-lg w-full" />
          <Skeleton className="h-16 rounded-lg w-full" />
          <Skeleton className="h-16 rounded-lg w-full" />
          <Skeleton className="h-16 rounded-lg w-full" />
          <Skeleton className="h-16 rounded-lg w-full" />
          <Skeleton className="h-16 rounded-lg w-full" />
        </div>
      </div>
    );
  }

  if (route === "governance" || route === "providers" || route === "devices" || route === "wallet" || route === "vault") {
    return (
      <div className="flex flex-col gap-6 p-6 h-full w-full ad-scroll overflow-hidden animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="flex items-center gap-4 border-b border-border pb-3">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      </div>
    );
  }

  // Default / Overview Skeleton
  return (
    <div className="flex flex-col gap-6 p-6 h-full w-full ad-scroll overflow-hidden animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-[300px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[300px] rounded-xl lg:col-span-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function Shell() {
  const [route, hash, nav] = useAppRoute();
  const [dark, toggleTheme] = useTheme();
  const [wizardOpen, setWizardOpen] = useState(() => getStored("aeg-dash-wizard-done") !== "1");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingRoute] = useState(false);
  const { ledger, agents, approvals } = useStore();

  const finishWizard = () => {
    setStored("aeg-dash-wizard-done", "1");
    removeStored("aeg-dash-wizard-step");
    setWizardOpen(false);
  };

  // Recharts' `ResponsiveContainer` measures its parent via ResizeObserver on
  // mount. In this flex/grid + animated layout that initial measurement can
  // race the browser's layout pass and land on 0x0 — reproducible in the
  // production build's paint timing even though the CSS itself is correct
  // (every chart wrapper already has an explicit pixel height). Dispatching
  // a resize event once layout has settled forces every ResponsiveContainer
  // on the page to re-measure and pick up its real size. Re-run on route
  // change since each page mounts a fresh set of charts.
  useEffect(() => {
    const kick = () => window.dispatchEvent(new Event("resize"));
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(kick);
    });
    // Belt-and-suspenders: a slower layout settle (web fonts swapping in,
    // images affecting flex sizing) can still leave charts at 0x0 after two
    // animation frames, so re-kick a couple more times over the next second.
    const t1 = window.setTimeout(kick, 150);
    const t2 = window.setTimeout(kick, 500);
    const t3 = window.setTimeout(kick, 1000);
    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [route]);

  // Global ⌘K / Ctrl+K shortcut opens the palette from anywhere on the dashboard.
  useCommandKShortcut(() => setSearchOpen(true));

  // Global Navigation Shortcuts
  useEffect(() => {
    let gTimer: number | null = null;
    let inGMode = false;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const el = e.target as HTMLElement | undefined;
      const tag = el?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;

      if (e.key === "?") {
        e.preventDefault();
        nav("help");
        return;
      }

      if (!inGMode) {
        if (e.key === "g" || e.key === "G") {
          inGMode = true;
          gTimer = window.setTimeout(() => {
            inGMode = false;
          }, 1000);
          e.preventDefault();
        }
      } else {
        const k = e.key.toLowerCase();
        let handled = true;
        if (k === "d") nav("dashboard");
        else if (k === "i") nav("inbox");
        else if (k === "g") nav("governance");
        else if (k === "h") nav("audit");
        else if (k === "s") nav("settings");
        else if (k === "v") nav("vault");
        else if (k === "w") nav("wallet");
        else if (k === "p") nav("providers");
        else handled = false;

        if (handled) {
          e.preventDefault();
        }
        
        inGMode = false;
        if (gTimer) clearTimeout(gTimer);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nav]);

  // Keep the URL canonical when landing on bare /app or /
  useEffect(() => {
    const p = window.location.pathname;
    if (p === "/app" || p === "/app/" || p === "/") {
      if (window.location.hash.startsWith("#/app") || window.location.hash.startsWith("#/")) {
        return;
      }
      const prefix = window.location.hostname.startsWith("app.") ? "/" : "/app/";
      window.history.replaceState(null, "", `${prefix}${route}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="aeg-dash flex min-h-screen h-full w-full flex-col">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <SidebarProvider className={cn("flex flex-1 min-h-0 h-full w-full", "[--app-wrapper-max-width:80rem]", "[--app-header-height:3rem]")}>
        <AgenttagSidebar route={route} nav={nav} onOpenWizard={() => setWizardOpen(true)} dark={dark} />
        <SidebarInset className="flex flex-1 flex-col min-h-0 h-full w-full bg-muted dark:bg-background">
          <AgenttagHeader
            route={route}
            nav={nav}
            dark={dark}
            toggleTheme={toggleTheme}
            onOpenSearch={() => setSearchOpen(true)}
          />
          <main id="main-content" className="relative flex min-h-0 flex-1 flex-col overflow-hidden w-full h-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={route}
                initial={route === "dashboard" ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={route === "dashboard" ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
                transition={{ duration: route === "dashboard" ? 0.18 : 0, ease: "easeOut" }}
                className="flex flex-1 flex-col overflow-hidden relative min-h-0 h-full w-full"
              >
                <ErrorBoundary key={route} fallbackTitle={`${ROUTE_LABEL[route] || "Page"} Error`}>
                  {loadingRoute ? (
                    <PageSkeleton route={route} />
                  ) : (
                    <>
                      {route === "dashboard" && <OverviewPage onNav={nav} />}
                      {route === "governance" && <GovernancePage />}
                      {route === "inbox" && <InboxPage onNav={nav} />}
                      {route === "audit" && <AuditLedgerPage />}
                      {route === "history" && <HistoryPage />}
                      {route === "vault" && <VaultPage />}
                      {route === "wallet" && <WalletPage />}
                      {route === "providers" && <ProvidersPage />}
                      {route === "devices" && <DevicesPage />}
                      {route === "settings" && (
                        <SettingsSplitLayout activeSub={parseSettingsSubpath(hash) || "account"}>
                          {(() => {
                            const sub = parseSettingsSubpath(hash);
                            if (sub === null || sub === "account") return <SettingsAccountPage />;
                            if (sub === "security") return <SettingsPage onReopenWizard={() => setWizardOpen(true)} />;
                            if (sub === "notifications") return <SettingsNotificationsPage />;
                            if (sub === "audit") return <SettingsAuditPage />;
                            return <SettingsAccountPage />;
                          })()}
                        </SettingsSplitLayout>
                      )}
                      {route === "support" && <SupportPage />}
                      {route === "notifications" && <NotificationsPage onNav={nav} />}
                      {route === "profile" && <ProfilePage />}
                      {route === "help" && (
                        <HelpPage onNav={nav} onOpenPalette={() => setSearchOpen(true)} />
                      )}
                    </>
                  )}
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
        </SidebarInset>
      </SidebarProvider>
      <AnimatePresence>
        {wizardOpen && <Wizard onClose={finishWizard} onFinish={finishWizard} onNav={nav} />}
      </AnimatePresence>
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        nav={nav}
        ledger={ledger}
        agents={agents}
        approvals={approvals}
        dark={dark}
        toggleTheme={toggleTheme}
        onOpenWizard={() => setWizardOpen(true)}
      />
      <Toasts />
    </div>
  );
}

/** Wires the signed-in Clerk operator into the API client + Store (no-op without a ClerkProvider ancestor). */
function ClerkBridge() {
  const { getToken, userId } = useAuth();
  const { setTenantId } = useStore();

  useEffect(() => {
    setApiClerkToken(() => getToken());
  }, [getToken]);

  useEffect(() => {
    setTenantId(userId ?? null);
  }, [userId, setTenantId]);

  return null;
}

export default function Dashboard() {
  return (
    <StoreProvider>
      {clerkPublishableKey !== undefined && <ClerkBridge />}
      <Shell />
    </StoreProvider>
  );
}

