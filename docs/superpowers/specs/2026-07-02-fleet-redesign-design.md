# Fleet Posture + Fleet Passport + Audit Ledger — Design Spec

Date: 2026-07-02
Status: Approved

## Goal
Premium-redesign the three existing fleet surfaces so they read as best-in-class without breaking the dashboard's structure:
- **Fleet Posture** stays a panel inside OverviewPage, gains a posture donut + mandate coverage.
- **Fleet Passport** stays a panel inside OverviewPage, gains a per-agent passport strip + click-to-modal detail.
- **Audit Ledger** is promoted to a full sidebar page (rebranding the existing `History` route), with header KPIs, inline filter chips (verdict / event type / agent), and a hash-chain visualization strip.

## Non-goals
- No backend / no real signing. The chain is mocked; "chain verified" reads honestly as a demo state.
- No new sidebar entries beyond renaming the existing `History` → `Audit Ledger`.
- No data model changes (everything is derived from the existing `Agent` and `LedgerEntry` types).
- No new dependencies.

## Design

### 1. Fleet Posture panel (`FleetPostureCard`)
Inside OverviewPage. Replaces the existing flat layout.

- **Compliance hero with progress ring**
  - Radial SVG ring, ~120×120, animated `stroke-dashoffset` (0–100%).
  - Center text: compliance % in large mono.
  - Color tone: emerald ≥80%, amber 50–79%, red <50%.
  - Subtle inner-highlight ring (1px white inset) on dark mode.
- **Posture donut**
  - recharts `PieChart` (already in use in `DecisionsDonut`).
  - Three slices: **Healthy** (active + enforced) / **Watch** (paused OR not enforced) / **At-risk** (revoked OR enforcement-off fleet-wide).
  - Hover a slice → tooltip with counts.
  - Center text: total agents.
- **Per-mandate-family coverage bars**
  - Horizontal stacked bars, one row per family from `MANDATE_FAMILIES`.
  - Width = % of agents with that family signed.
  - Color tone matches family.
- **CTA**: "Open Governance" (kept) at the bottom.

### 2. Fleet Passport panel (`FleetPassportPanel`)
Inside OverviewPage. Replaces the existing 4-row layout.

- **Passport data page aesthetic**
  - Layered gradient surface (crimson-tinted accent in dark, soft warm in light).
  - Operator DID as headline (`did:key:z6Mk…HUMAN`) in mono, with hover-reveal full string.
  - Subtle holographic shine (animated linear-gradient) on hover.
  - Existing health chip kept in the corner.
- **Per-agent passport mini-cards strip**
  - Horizontal scrollable strip (overflow-x: auto, snap-x).
  - Each card: avatar (initial letter), name, truncated DID, status pip (emerald/amber/red), `timeAgo` of last activity.
  - Click a card → opens **AgentPassportModal**.
  - Card size ~140×110.
- **AgentPassportModal** (new)
  - Same Framer Motion + backdrop blur pattern as `AddVaultItemModal`.
  - Header: agent name + status chip + close.
  - Body sections:
    - **Identity** — DID, public key fingerprint (mocked hex), signing algorithm.
    - **Mandates** — list of agent mandates with active/inactive chip.
    - **Activity** — recent ledger entries for this agent (last 5).
    - **Crypto** — last rotation timestamp, chain anchor hash.
  - Footer: "View full detail in Governance" link.
- **CTA**: "Manage in Settings" (kept) at the bottom.

### 3. Audit Ledger — promoted page (`AuditLedgerPage` from `HistoryPage`)
- **PageHeader**: "Audit Ledger" + subtitle "Hash-chained, tamper-evident record of every action across the fleet."
- **Header KPI strip** (4 cards, premium `ad-stat-card`):
  - Total entries
  - Last 24h (filtered count)
  - Verdict mix (mini donut)
  - Chain integrity (pulse + "Verified")
- **Filter chips bar** (above the table):
  - **Verdict** — segmented control: All / ALLOW / STEP_UP / DENY (existing pattern)
  - **Event type** — chip group: All / policy / action / approval / cred_use / comms
  - **Agent** — dropdown with checkboxes; lists all agents + "All agents"
- **Hash-chain visualization strip**
  - Horizontal scrollable strip, ~12 most-recent entries as linked blocks.
  - Each block: seq, verdict pill, event type, truncated hash.
  - Between blocks: small arrow / chevron indicating `prev_hash` link.
  - Hover a block → highlights the matching row in the table.
- **Existing table** (kept):
  - Seq, Event, Action, Agent, Verdict (chip), When, Hash (click to copy).
  - Search input + Export button (kept).

### 4. Renames
- Sidebar `History` label → `Audit Ledger`.
- Command palette `nav:history` label → "Audit Ledger" + hint "Hash-chained ledger".
- Route key stays `"history"` (hash `#/app/history` works as before — no bookmark breaks).
- Internal export name `HistoryPage` is renamed to `AuditLedgerPage` to keep the file honest.

## Files affected
- `src/dashboard/pages.tsx` — modify `FleetPostureCard`, `FleetPassportPanel`, `AuditLedgerPanel`; rename `HistoryPage` → `AuditLedgerPage`; add `AgentPassportModal`; add new filter state for event type + agent.
- `src/dashboard/Dashboard.tsx` — `ROUTE_LABEL.history` → "Audit Ledger".
- `src/dashboard/CommandPalette.tsx` — `nav:history` label + hint.
- `src/dashboard/dashboard.css` — new rules: `.ad-posture-ring`, `.ad-posture-donut`, `.ad-coverage-bar`, `.ad-passport-card` (mini-card), `.ad-passport-shine`, `.ad-agent-passport-modal`, `.ad-hash-chain`, `.ad-hash-block`. All with `[data-theme="dark"]` overrides and reduced-motion handling.

## Verification
1. `npm run build` — typecheck + Vite build pass.
2. `npm run lint` — clean for new code; pre-existing errors remain.
3. Manual smoke:
   - Open `/` (Overview) → see new Fleet Posture donut + mandate bars.
   - Click a passport mini-card → modal opens with agent detail.
   - Click "Audit Ledger" in sidebar → see new filter chips + hash-chain strip + table.
   - Filter by `DENY` verdict → only deny rows.
   - Filter by event type `policy` → only policy rows.
   - Filter by agent → only that agent's rows.
   - Dark mode parity on every new surface.
