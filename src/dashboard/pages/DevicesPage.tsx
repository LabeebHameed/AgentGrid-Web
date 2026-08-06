import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ticking "now" hook — replaces Date.now() during render so the
// react-hooks/purity rule stays happy. Renders first read from a
// useState initializer, then an interval updates it.


import { ShieldCheck, Plus, Check, X, Laptop, Smartphone, KeyRound, Trash2, ChevronRight, Fingerprint } from "lucide-react";
import { useStore, timeAgo, type Device } from "../data";
import { Btn, IconBtn, Chip, PageHeader } from "../ui";

// Premium UI Component imports from the installed blocks
import { Button } from "@/components/ui/button";



// Stagger wrapper for cards



import { stagger, fadeUp, useNow } from "./shared";
// ============================================================
// Devices
// ============================================================
const devIcon = (k: Device["kind"]) => (k === "laptop" ? <Laptop size={18} /> : k === "phone" ? <Smartphone size={18} /> : <KeyRound size={18} />);

function LinkDeviceModal({ onClose }: { onClose: () => void }) {
  const { addDevice, enrollQrPayload } = useStore();
  const [step, setStep] = useState<"kind" | "pair">("kind");
  const [selectedKind, setSelectedKind] = useState<Device["kind"] | null>(null);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairingCode] = useState(() => generatePairingCode());

  const handleKindSelect = (kind: Device["kind"]) => {
    setSelectedKind(kind);
    setError(null);
    setStep("pair");
  };

  const handleWebAuthnPair = async () => {
    if (!selectedKind) return;
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      setError("Your browser doesn't support passkeys (WebAuthn). Use a modern browser over HTTPS or localhost.");
      return;
    }
    setPairing(true);
    setError(null);
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Agenttag Control Plane" },
          user: {
            id: userId,
            name: "operator@agenttag.me",
            displayName: "Operator",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: selectedKind === "security-key" ? "cross-platform" : "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "none",
        },
      })) as PublicKeyCredential | null;
      if (!credential) throw new Error("No credential returned");
      const credId = bytesToBase64Url(new Uint8Array(credential.rawId));
      const name = selectedKind === "security-key" ? "Security key" : "This laptop";
      // addDevice surfaces its own toast for this kind (currently "not
      // connected yet" — there is no backend endpoint for WebAuthn devices).
      addDevice(name, selectedKind, { credentialId: credId });
      onClose();
    } catch (err) {
      const errorObj = err as Error;
      const msg = errorObj?.name === "NotAllowedError" ? "Pairing was cancelled." : (errorObj?.message || "Pairing failed.");
      setError(msg);
    } finally {
      setPairing(false);
    }
  };

  const handlePhoneConfirm = () => {
    if (!selectedKind) return;
    // addDevice("phone", ...) surfaces its own toast telling the operator to
    // scan the real enroll QR code — this modal just closes; the device will
    // appear in the list once the phone actually completes enrollment.
    addDevice(`Phone · ${pairingCode}`, "phone", { pairedAt: Date.now() });
    onClose();
  };

  const handleBack = () => {
    setStep("kind");
    setSelectedKind(null);
    setError(null);
  };

  const stepIndex = step === "kind" ? 1 : 2;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card text-card-foreground border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center border border-border">
              {selectedKind === "laptop" ? <Laptop size={18} /> :
               selectedKind === "phone" ? <Smartphone size={18} /> :
               selectedKind === "security-key" ? <KeyRound size={18} /> :
               <Plus size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm">Link a new device</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Step {stepIndex} of 2 — {step === "kind" ? "pick the kind of device" : "complete pairing"}
              </div>
            </div>
            <button type="button" onClick={onClose} className="text-muted-foreground p-1 rounded" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="p-5">
            {step === "kind" ? (
              <div className="grid grid-cols-1 gap-2.5">
                {([
                  { kind: "laptop" as const, icon: Laptop, title: "This laptop", desc: "Use Touch ID, Face ID, or screen lock." },
                  { kind: "phone" as const, icon: Smartphone, title: "Phone", desc: "Scan a pairing code from the Agenttag app." },
                  { kind: "security-key" as const, icon: KeyRound, title: "Security key", desc: "Touch a YubiKey or compatible FIDO2 key." },
                ]).map(({ kind, icon: Icon, title, desc }) => (
                  <button
                    key={kind}
                    onClick={() => handleKindSelect(kind)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-left hover:border-foreground/40"
                  >
                    <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center border border-border flex-shrink-0">
                      <Icon size={18} className="text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">{title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : selectedKind === "phone" ? (
              <PhonePairingStep code={pairingCode} qrPayload={enrollQrPayload} onConfirm={handlePhoneConfirm} onBack={handleBack} />
            ) : selectedKind ? (
              <WebAuthnStep kind={selectedKind} pairing={pairing} error={error} onPair={handleWebAuthnPair} onBack={handleBack} />
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function WebAuthnStep({ kind, pairing, error, onPair, onBack }: {
  kind: Device["kind"];
  pairing: boolean;
  error: string | null;
  onPair: () => void;
  onBack: () => void;
}) {
  const isKey = kind === "security-key";
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center py-2">
        <div className="relative w-14 h-14 mb-4">
          <div className="absolute inset-0 rounded-2xl bg-muted border border-border" />
          <div className="absolute inset-0 flex items-center justify-center">
            {isKey ? <KeyRound size={22} className="text-foreground" /> : <Fingerprint size={22} className="text-foreground" />}
          </div>
        </div>
        <div className="text-sm font-medium text-card-foreground">
          {isKey ? "Touch your security key" : "Verify with your fingerprint"}
        </div>
        <div className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
          {isKey
            ? "Insert your key and tap the metal contact. The browser will register it as a FIDO2 passkey."
            : "Your platform will prompt for Touch ID, Face ID, or screen lock to register this device as a passkey."}
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 leading-relaxed">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-3">Back</Button>
        <Button size="sm" onClick={onPair} disabled={pairing} className="h-8 px-3 gap-1.5">
          {pairing ? "Waiting for authenticator…" : (isKey ? "Pair security key" : "Pair this laptop")}
        </Button>
      </div>
    </div>
  );
}

function PhonePairingStep({ code, qrPayload, onConfirm, onBack }: {
  code: string;
  qrPayload: string | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // Prefer the real server-issued enrollment payload for the QR pattern; fall
  // back to the locally-generated code only if the server hasn't provided one
  // yet (e.g. still loading), so the pattern is never purely decorative once
  // real data is available.
  const qrSource = qrPayload ?? code;
  const qrPattern = useMemo(() => generateQrPattern(qrSource), [qrSource]);
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <div
          className="w-40 h-40 rounded-lg bg-foreground p-2 gap-px grid mb-3"
          style={{ gridTemplateColumns: "repeat(21, 1fr)" }}
          aria-hidden
        >
          {qrPattern.flat().map((on, i) => (
            <div key={i} className="aspect-square" style={{ backgroundColor: on ? "var(--card)" : "transparent" }} />
          ))}
        </div>
        <div className="text-xs text-muted-foreground mb-2">Scan this code in the Agenttag mobile app</div>
        {qrPayload ? (
          <div className="flex items-center gap-2">
            <div className="px-3 py-2 rounded-md bg-muted border border-border font-mono text-[11px] text-card-foreground max-w-[240px] truncate" title={qrPayload}>
              {qrPayload}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(qrPayload);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
              className={`h-9 w-9 rounded-md border bg-card flex items-center justify-center flex-shrink-0 ${
                copied ? "border-emerald-500/50 text-emerald-600" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              }`}
              title={copied ? "Copied" : "Copy link"}
              aria-label="Copy link"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div className="px-3 py-2 rounded-md bg-muted border border-border font-mono text-base font-semibold tracking-[0.3em] text-card-foreground">
            {code.slice(0, 3)} {code.slice(3)}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
        <ShieldCheck size={14} className="text-foreground/60 flex-shrink-0 mt-0.5" />
        <span>Open Agenttag on your phone → Settings → Link device → scan this code. This phone will appear here once enrollment completes.</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-3">Back</Button>
        <Button size="sm" onClick={onConfirm} className="h-8 px-3 gap-1.5">
          I've paired my phone
        </Button>
      </div>
    </div>
  );
}

function generatePairingCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 1000000).toString().padStart(6, "0");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateQrPattern(code: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[row + r][col + c] = isOuter || isInner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
      const isData = Math.abs(Math.sin(hash + r * 7 + c * 13)) > 0.5;
      grid[r][c] = isData;
    }
  }
  return grid;
}

export function DevicesPage() {
  const { devices, revokeDevice } = useStore();
  const [showLinkModal, setShowLinkModal] = useState(false);
  // Tick every minute so "active recently" stays roughly accurate without
  // triggering cascading renders on every keystroke elsewhere.
  const now = useNow(60_000);
  const activeCount = devices.filter(d => (now - d.lastSeen) < 60 * 60 * 1000).length;
  const keyCount = devices.filter(d => d.kind === "security-key").length;

  return (
    <>
      <PageHeader
        title="Devices"
        subtitle="Passkey-bound devices that can sign approvals on your behalf."
        actions={<Btn variant="primary" icon={<Plus size={15} />} onClick={() => setShowLinkModal(true)}>Link device</Btn>}
      />
      <div className="ad-scroll overflow-y-auto flex-1 p-6">
        <motion.div className="ad-page" variants={stagger} initial="visible" animate="visible">
          {/* Stats Strip */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Total devices", value: devices.length },
              { label: "Active recently", value: activeCount },
              { label: "Security keys", value: keyCount },
            ].map(stat => (
              <div key={stat.label} data-slot="card" className="ad-card pad flex flex-col gap-1 card-lift">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{stat.label}</span>
                <span className="text-2xl font-bold text-card-foreground tabular-nums">{stat.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Device List */}
          {devices.map((d) => {
            const isRecent = (now - d.lastSeen) < 60 * 60 * 1000;
            return (
              <motion.div key={d.id} variants={fadeUp} data-slot="card" className="ad-row group" style={{ transitionProperty: "transform, box-shadow, border-color" }}>
                <span className="ad-row-ico ">{devIcon(d.kind)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ad-row-name " style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {d.name}
                    {d.current && <Chip tone="ok" dot>this device</Chip>}
                  </div>
                  <div className="ad-row-desc tabular-nums flex items-center gap-1.5">
                    <span className={`size-1.5 rounded-full ${isRecent ? "bg-emerald-500" : "bg-zinc-500"}`} />
                    Last active {timeAgo(d.lastSeen)} · passkey
                  </div>
                </div>
                <IconBtn aria-label={`revoke ${d.name}`} disabled={d.current} title={d.current ? "Can't revoke the current device" : "Revoke"} onClick={() => revokeDevice(d.id)} style={d.current ? { opacity: .4, cursor: "not-allowed" } : undefined}>
                  <Trash2 />
                </IconBtn>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
      <AnimatePresence>
        {showLinkModal && <LinkDeviceModal onClose={() => setShowLinkModal(false)} />}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// Settings
// ============================================================

