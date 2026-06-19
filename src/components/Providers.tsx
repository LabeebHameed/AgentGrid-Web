import { useCallback, useEffect, useState } from "react";
import {
  Chrome,
  Mail,
  MessageSquare,
  Cloud,
  CreditCard,
  Check,
  XCircle,
  RefreshCw,
} from "lucide-react";
import type { ApprovalApi } from "../api";
import type { ProviderStatus, ProviderKind } from "../types";

const PROVIDER_ICONS: Record<ProviderKind, React.ReactNode> = {
  browser: <Chrome className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
  email: <Mail className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
  sms: <MessageSquare className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
  cloud: <Cloud className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
  payments: <CreditCard className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
};

const ProviderCard = ({ provider, compact = false }: { provider: ProviderStatus; compact?: boolean }) => (
  <div
    className="flex items-start gap-4 rounded-[var(--radius-lg)] border px-4 py-4"
    style={{ borderColor: provider.connected ? "var(--ok-dim)" : "var(--line)" }}
  >
    <span
      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)]"
      style={{ background: provider.connected ? "var(--ok-dim)" : "var(--surface-2)" }}
    >
      <span style={{ color: provider.connected ? "var(--ok)" : "var(--muted)" }}>
        {PROVIDER_ICONS[provider.kind]}
      </span>
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-[var(--text)]">{provider.label}</p>
        {provider.connected ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--ok-dim)", color: "var(--ok)" }}>
            <Check className="h-3 w-3" aria-hidden /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
            <XCircle className="h-3 w-3" aria-hidden /> Not connected
          </span>
        )}
      </div>
      {!compact && (
        <p className="mt-0.5 text-sm text-[var(--muted)]">{provider.description}</p>
      )}
      {provider.detail !== null && (
        <p className="mono mt-1 text-xs text-[var(--subtle)]">{provider.detail}</p>
      )}
      {!provider.connected && provider.envKey !== "(built-in)" && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Set{" "}
          <code
            className="mono rounded px-1 py-0.5 text-[11px]"
            style={{ background: "var(--surface-2)" }}
          >
            {provider.envKey}
          </code>{" "}
          in your{" "}
          <code
            className="mono rounded px-1 py-0.5 text-[11px]"
            style={{ background: "var(--surface-2)" }}
          >
            .env
          </code>{" "}
          file, then restart Aegis.
        </p>
      )}
    </div>
  </div>
);

export const ProvidersScreen = ({ api, compact = false }: { api: ApprovalApi; compact?: boolean }) => {
  const [providers, setProviders] = useState<readonly ProviderStatus[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const view = await api.getProviders();
      setProviders(view.providers);
    } catch {
      // silently swallow — backend may not support this yet
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (providers === null) return null;

  const connected = providers.filter((p) => p.connected).length;

  return (
    <div>
      {!compact && (
        <>
          <div className="mb-1 flex items-baseline justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Providers</h1>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50"
              style={{ background: "var(--surface-2)", color: "var(--muted)" }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
          </div>
          <p className="mb-6 text-sm text-[var(--muted)]">
            {connected} of {providers.length} providers connected. Add API keys to your{" "}
            <code className="mono rounded px-1 py-0.5 text-xs" style={{ background: "var(--surface-2)" }}>.env</code>{" "}
            file and restart Aegis to activate them.
          </p>
        </>
      )}
      <div className="flex flex-col gap-3">
        {providers.map((p) => (
          <ProviderCard key={p.kind} provider={p} compact={compact} />
        ))}
      </div>
    </div>
  );
};
