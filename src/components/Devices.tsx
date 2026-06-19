import { useCallback, useEffect, useState } from "react";
import { Smartphone, Unlink, QrCode, AlertCircle } from "lucide-react";
import type { ApprovalApi } from "../api";
import type { DeviceEntry } from "../types";
import { shortDid } from "../lib/format";

const QrPlaceholder = ({ payload }: { payload: string }) => (
  <div
    className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border p-6"
    style={{ borderColor: "var(--line)" }}
  >
    <span className="grid h-14 w-14 place-items-center rounded-[var(--radius-md)]" style={{ background: "var(--surface-2)" }}>
      <QrCode className="h-7 w-7 text-[var(--muted)]" strokeWidth={1.5} aria-hidden />
    </span>
    <div className="text-center">
      <p className="text-sm font-semibold text-[var(--text)]">Link your phone</p>
      <p className="mt-1 max-w-xs text-xs text-[var(--muted)]">
        Open the Aegis mobile app and scan this code, or paste the enrollment URL manually.
      </p>
    </div>
    <code
      className="mono mt-1 max-w-xs break-all rounded-[var(--radius-md)] px-3 py-2 text-[11px] text-[var(--muted)]"
      style={{ background: "var(--surface-2)" }}
    >
      {payload}
    </code>
  </div>
);

const DeviceRow = ({
  device,
  onUnlink,
  unlinking,
}: {
  device: DeviceEntry;
  onUnlink: (token: string) => void;
  unlinking: boolean;
}) => (
  <div
    className="flex items-center gap-4 rounded-[var(--radius-lg)] border px-4 py-3"
    style={{ borderColor: "var(--line)" }}
  >
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)]" style={{ background: "var(--ok-dim)" }}>
      <Smartphone className="h-4.5 w-4.5" style={{ color: "var(--ok)" }} strokeWidth={1.75} aria-hidden />
    </span>
    <div className="min-w-0 flex-1">
      <p className="mono truncate text-xs text-[var(--text)]">{shortDid(device.operatorDid)}</p>
      <p className="text-[11px] text-[var(--subtle)]">Enrolled {new Date(device.enrolledAt).toLocaleDateString()}</p>
    </div>
    <button
      onClick={() => onUnlink(device.token)}
      disabled={unlinking}
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50"
      style={{ background: "var(--surface-2)", color: "var(--muted)" }}
    >
      <Unlink className="h-3.5 w-3.5" aria-hidden />
      Unlink
    </button>
  </div>
);

export const DevicesScreen = ({ api, compact = false }: { api: ApprovalApi; compact?: boolean }) => {
  const [view, setView] = useState<{ devices: readonly DeviceEntry[]; enrollQrPayload: string } | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const v = await api.getDevices();
      setView(v);
    } catch (err) {
      console.error(err);
      setError("Connection failed. Make sure your Railway backend is online.");
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  const handleUnlink = async (token: string) => {
    setUnlinking(token);
    try {
      await api.unlinkDevice({ token });
      await load();
    } finally {
      setUnlinking(null);
    }
  };

  if (error !== null) {
    return (
      <div className="rounded-[var(--radius-md)] border px-4 py-3 text-sm" style={{ background: "var(--danger-dim)", borderColor: "var(--danger)", color: "var(--danger)" }}>
        <p className="font-semibold">{error}</p>
        <p className="mt-1 text-xs opacity-90">
          Currently calling: <code className="mono bg-black/30 px-1 py-0.5 rounded">{import.meta.env.VITE_AEGIS_API || "same-origin (Vercel host)"}</code>
        </p>
      </div>
    );
  }

  if (view === null) {
    return <div className="text-sm text-[var(--muted)] animate-pulse">Loading devices from backend...</div>;
  }

  return (
    <div>
      {!compact && (
        <>
          <h1 className="mb-1 text-xl font-semibold tracking-tight text-[var(--text)]">Devices</h1>
          <p className="mb-6 text-sm text-[var(--muted)]">
            Linked phones that can approve agent actions. Scan the QR code in the Aegis mobile app.
          </p>
        </>
      )}

      {view.devices.length === 0 ? (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-4" style={{ borderColor: "var(--line)" }}>
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--muted)]" strokeWidth={1.75} aria-hidden />
          <div>
            <p className="text-sm font-medium text-[var(--text)]">No phones linked yet</p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Link your phone to approve high-stakes agent actions from your pocket.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex flex-col gap-3">
          {view.devices.map((d) => (
            <DeviceRow
              key={d.token}
              device={d}
              onUnlink={(token) => void handleUnlink(token)}
              unlinking={unlinking === d.token}
            />
          ))}
        </div>
      )}

      <QrPlaceholder payload={view.enrollQrPayload} />
    </div>
  );
};
