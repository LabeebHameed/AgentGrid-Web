import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Check, Loader2, AlertTriangle } from "lucide-react";

/**
 * Stopgap AgentCard B2B2C payment setup view (Plan 4 UI v0.1).
 *
 * Single component that handles the three states a tenant can be in:
 *   - loading            — fetching initial payment-method status
 *   - needs-setup        — no payment method attached; show "Set up" button
 *   - ready              — payment method attached; show "Add funds" button
 *
 * The setup flow embeds the Stripe Checkout URL returned by AgentCard in an
 * iframe, then polls the relay's status endpoint every 2s for up to 5 min.
 * The tenantId comes from a `?tenantId=…` query param (demo convention used
 * elsewhere in this console).
 *
 * Real production UI is being built elsewhere; this is a placeholder that
 * proves the wire-up end-to-end. Keep this file minimal — do not add new
 * abstractions until the real UI lands.
 */

interface PaymentMethodStatus {
  readonly ready: boolean;
}

interface CheckoutSetup {
  readonly checkoutUrl: string;
}

interface CardholderBalance {
  readonly balanceCents: number;
  readonly currency: "USD";
}

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 5 * 60_000;

const resolveApiBase = (): string => {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("agentgrid_api_base") ||
    (import.meta.env.VITE_AGENTGRID_API as string) ||
    ""
  );
};

const resolveTenantId = (): string => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("tenantId");
  if (fromQuery) return fromQuery;
  return localStorage.getItem("agentgrid_tenant_id") || "";
};

const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const apiBase = resolveApiBase();
  const resp = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!resp.ok) {
    if (resp.status === 503) throw new Error("disabled");
    throw new Error(`${resp.status} ${resp.statusText}`);
  }
  return (await resp.json()) as T;
};

export const Payments = () => {
  const [tenantId, setTenantId] = useState<string>(() => resolveTenantId());
  const [tenantIdInput, setTenantIdInput] = useState<string>("");
  const apiBase = resolveApiBase();

  const saveTenantId = useCallback((value: string): void => {
    const trimmed = value.trim();
    if (trimmed === "") return;
    localStorage.setItem("agentgrid_tenant_id", trimmed);
    setTenantId(trimmed);
    setTenantIdInput("");
  }, []);

  const [ready, setReady] = useState<boolean | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [balance, setBalance] = useState<CardholderBalance | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const pollStopRef = useRef<(() => void) | null>(null);

  // Initial load — fetch current status.
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    fetchJson<PaymentMethodStatus>(
      `/api/tenants/${encodeURIComponent(tenantId)}/cardholder/payment-method/status`,
    )
      .then((s) => {
        if (!cancelled) setReady(s.ready);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setPollError(e.message === "disabled" ? "disabled" : e.message);
          setReady(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const stopPolling = useCallback(() => {
    if (pollStopRef.current !== null) {
      pollStopRef.current();
      pollStopRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const fetchBalance = useCallback(async (): Promise<void> => {
    if (!tenantId) return;
    setBalanceError(null);
    try {
      const b = await fetchJson<CardholderBalance>(
        `/api/tenants/${encodeURIComponent(tenantId)}/cardholder/balance`,
      );
      setBalance(b);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // 503 = AgentCard not wired (dev mode); show a graceful message rather
      // than an error. Other errors (network, 5xx) keep their message.
      setBalance(null);
      setBalanceError(msg === "disabled" ? null : msg);
    }
  }, [tenantId]);

  const startSetup = useCallback(async () => {
    if (!tenantId) return;
    setSetupError(null);
    stopPolling();
    try {
      const setup = await fetchJson<CheckoutSetup>(
        `/api/tenants/${encodeURIComponent(tenantId)}/cardholder/payment-method/setup`,
        { method: "POST" },
      );
      setIframeUrl(setup.checkoutUrl);
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : String(e));
    }
  }, [tenantId, stopPolling]);

  // When iframe renders, start polling for status:ready.
  useEffect(() => {
    if (iframeUrl === null || !tenantId) return;
    let cancelled = false;
    const start = Date.now();
    const tick = async (): Promise<void> => {
      if (cancelled) return;
      try {
        const s = await fetchJson<PaymentMethodStatus>(
          `/api/tenants/${encodeURIComponent(tenantId)}/cardholder/payment-method/status`,
        );
        if (cancelled) return;
        if (s.ready) {
          setReady(true);
          setIframeUrl(null);
          void fetchBalance();
          return;
        }
      } catch {
        // Ignore transient errors during poll.
      }
      if (Date.now() - start > POLL_TIMEOUT_MS) {
        if (!cancelled) setPollError("Timed out waiting for Stripe Checkout to complete");
        return;
      }
      if (!cancelled) setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };
    void tick();
    pollStopRef.current = (): void => {
      cancelled = true;
    };
    return () => {
      cancelled = true;
    };
  }, [iframeUrl, tenantId]);

  // Dev-mode disabled state.
  if (pollError === "disabled") {
    return (
      <div
        className="flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-4"
        style={{ borderColor: "var(--line)" }}
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--muted)" }} strokeWidth={1.75} aria-hidden />
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">AgentCard disabled in this environment</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Set <code className="mono rounded px-1 py-0.5 text-[11px]" style={{ background: "var(--surface-2)" }}>AGENTCARD_API_KEY</code> on the relay and unset <code className="mono rounded px-1 py-0.5 text-[11px]" style={{ background: "var(--surface-2)" }}>AGENTGRID_FAKE_AGENTCARD</code> to enable real cardholder provisioning.
          </p>
        </div>
      </div>
    );
  }

  // No tenantId configured — show an inline input so the user can set it
  // without URL-hacking or localStorage devtools. Saved value is remembered
  // across sessions.
  if (!tenantId) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border px-4 py-4"
        style={{ borderColor: "var(--line)" }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--muted)" }} strokeWidth={1.75} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text)]">No tenant selected</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Paste your tenant id (the{" "}
              <code className="mono rounded px-1 py-0.5 text-[11px]" style={{ background: "var(--surface-2)" }}>userId</code>{" "}
              returned by <code className="mono rounded px-1 py-0.5 text-[11px]" style={{ background: "var(--surface-2)" }}>POST /api/tenants</code> or your Clerk console) to view payments.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTenantId(tenantIdInput);
              }}
              className="mt-3 flex items-center gap-2"
            >
              <input
                type="text"
                value={tenantIdInput}
                onChange={(e) => setTenantIdInput(e.target.value)}
                placeholder="tenant_abc123"
                className="mono min-w-0 flex-1 rounded-[var(--radius-md)] border px-3 py-1.5 text-xs outline-none focus:ring-1"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--line)",
                  color: "var(--text)",
                }}
              />
              <button
                type="submit"
                disabled={tenantIdInput.trim() === ""}
                className="shrink-0 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                Save
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-start gap-4 rounded-[var(--radius-lg)] border px-4 py-4"
        style={{ borderColor: ready ? "var(--ok-dim)" : "var(--line)" }}
      >
        <span
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)]"
          style={{ background: ready ? "var(--ok-dim)" : "var(--surface-2)" }}
        >
          {ready === null ? (
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--muted)" }} strokeWidth={1.75} aria-hidden />
          ) : ready ? (
            <Check className="h-5 w-5" style={{ color: "var(--ok)" }} strokeWidth={1.75} aria-hidden />
          ) : (
            <CreditCard className="h-5 w-5" style={{ color: "var(--muted)" }} strokeWidth={1.75} aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--text)]">AgentCard cardholder</p>
            {ready === true && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: "var(--ok-dim)", color: "var(--ok)" }}
              >
                <Check className="h-3 w-3" aria-hidden /> Payment method attached
              </span>
            )}
            {ready === false && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: "var(--surface-2)", color: "var(--muted)" }}
              >
                Setup required
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {ready === true
              ? "Your AI agent can spend up to its per-card cap. Click below to top up the cardholder balance."
              : "Attach a payment method to fund your AgentCard cardholder. Stripe Checkout will open — complete it in the iframe, then this page auto-refreshes."}
          </p>
          {ready === true && balance !== null && (
            <div className="mt-3 flex items-baseline gap-2">
              <span className="mono text-2xl font-semibold text-[var(--text)]">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: balance.currency }).format(balance.balanceCents / 100)}
              </span>
              <span className="text-xs text-[var(--subtle)]">cardholder balance</span>
            </div>
          )}
          {ready === true && balance === null && balanceError === null && (
            <p className="mt-2 text-xs text-[var(--muted)]">Loading balance…</p>
          )}
          {ready === true && balanceError !== null && (
            <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
              Balance unavailable (AgentCard not configured in this environment).
            </p>
          )}
          {setupError !== null && (
            <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
              Couldn't start checkout: {setupError}
            </p>
          )}
          {pollError !== null && (
            <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
              {pollError}
            </p>
          )}
          <button
            onClick={startSetup}
            disabled={iframeUrl !== null}
            className="mt-3 inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            {ready === true ? "Add funds" : "Set up payment method"}
          </button>
        </div>
      </div>

      {iframeUrl !== null && (
        <div
          className="overflow-hidden rounded-[var(--radius-lg)] border"
          style={{ borderColor: "var(--line)" }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-2"
            style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
          >
            <p className="text-xs font-medium text-[var(--muted)]">Stripe Checkout — complete to attach your payment method</p>
            <button
              onClick={() => {
                setIframeUrl(null);
              }}
              className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              Cancel
            </button>
          </div>
          <iframe
            src={iframeUrl}
            title="Stripe Checkout"
            className="block h-[640px] w-full border-0"
          />
        </div>
      )}

      <p className="text-xs text-[var(--subtle)]">
        Tenant: <code className="mono">{tenantId}</code> · API: <code className="mono">{apiBase || "(default)"}</code>
      </p>
    </div>
  );
};
