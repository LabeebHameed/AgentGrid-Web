# Vault + Wallet — Design Spec

Date: 2026-07-02
Status: Approved

## Goal
Add two distinct, premium-feel pages to the Agenttag dashboard:
- **Vault** — stores cards/credentials (payment cards, logins, API keys) with a 3D flip-to-reveal interaction.
- **Wallet** — manages a balance, lets the user top up funds from a Vault card or external source.

Both pages live in the sidebar under a new "Finance" group, share the dashboard's established "premium" design language, and ship with mocked data only.

## Non-goals
- No real payment processor integration (Stripe, Plaid, etc.).
- No backend wiring. The repo explicitly ships no backend.
- No changes to existing pages, sidebar nav (other than adding the two entries), or store schema beyond additive changes.

## Data model
Added to `src/dashboard/data.tsx`:

```ts
type VaultItemType = "card" | "login" | "apikey";

type VaultItem = {
  id: string;
  type: VaultItemType;
  name: string;             // user-given display name
  addedAt: number;
  // type-specific payload (always rendered masked by default)
  card?: {
    last4: string;          // last 4 digits only — never store full PAN
    expiry: string;         // "MM/YY"
    brand: string;          // "Visa", "Mastercard", "Amex"
    network: string;        // "Visa", "Mastercard", etc.
    holder: string;         // cardholder name
    cvv: string;            // mock CVV, masked by default
  };
  login?: {
    site: string;           // e.g., "github.com"
    username: string;
    password: string;       // masked by default
  };
  apiKey?: {
    service: string;        // e.g., "OpenAI"
    key: string;            // masked by default
  };
};

type TxStatus = "ok" | "pending" | "failed";

type Transaction = {
  id: string;
  amount: number;           // positive number
  currency: "USD";          // single currency for now
  sourceVaultItemId?: string; // null for external top-ups
  sourceLabel: string;      // human-readable: "Visa ••4242" or "Bank transfer"
  status: TxStatus;
  kind: "topup" | "send";
  at: number;
};
```

### Store additions (additive, no breaking changes)
- `vaultItems: VaultItem[]`
- `transactions: Transaction[]`
- `addVaultItem(input: Omit<VaultItem, "id" | "addedAt">)`
- `removeVaultItem(id: string)`
- `topUp(amount: number, sourceLabel: string, sourceVaultItemId?: string)`
- `getBalance(): number`  // derived: sum of ok topups minus sum of ok sends

### Seed data
- 4 Vault cards (Visa, Mastercard, Amex, plus 1 issuer-branded debit)
- 2 logins (GitHub, Vercel)
- 2 API keys (OpenAI, Anthropic)
- 6 transactions (mix of topups + 1 send, varied timestamps)

## Pages

### Vault page (`/app/vault`)
- PageHeader: "Vault" + subtitle "All your credentials, cards, and API keys — masked by default."
- Stats strip (4 cards, premium `ad-stat-card` surface):
  - Total items
  - Cards / Logins / API keys (one per type)
- Type filter chips: All / Cards / Logins / API keys — same `ad-cat-dot` style as Providers.
- Grid of `ad-vault-card` items:
  - Looks like a real card (gradient surface, brand chip, masked detail).
  - Click → flips on Y axis (`transform: rotateY(180deg)`, `transform-style: preserve-3d`) to reveal the secret on the back.
  - Click again to flip back.
  - Reveal is local state; nothing leaves the page.
- Add Item modal: pick type → fill form → save to store.
- Empty state per filter (`ad-empty-lg` with premium glow).

### Wallet page (`/app/wallet`)
- PageHeader: "Wallet" + subtitle "Your balance and how you move money in."
- Premium hero (large `ad-stat-card`-style surface): current balance ($X,XXX.XX) + small trend delta + currency chip.
- Top-up CTA: opens `TopUpModal` — amount input, source dropdown (Vault cards + "Bank transfer"), confirm.
- On confirm: optimistic store update + toast + new transaction row.
- Sources section: each Vault card shown as a compact row with "Top up from this" affordance.
- Transaction history: chronological list using `ad-row` premium styling, filterable by All / Top-ups / Sends.
- Send / Receive buttons (visual only, placeholders).

## Sidebar / routing
- New "Finance" group between "Today" and "Configure" (existing groups stay intact).
- Two entries: Vault (icon: `ShieldCheck`) and Wallet (icon: `Wallet` from lucide).
- Routes: `#/app/vault`, `#/app/wallet`.
- `RouteKey` union extended with `"vault" | "wallet"`.
- Command palette: add nav entries for both.

## Files affected
- `src/dashboard/data.tsx` — types, seed data, store actions.
- `src/dashboard/pages.tsx` — `VaultPage`, `WalletPage`, `AddVaultItemModal`, `TopUpModal`, plus their subcomponents.
- `src/dashboard/Dashboard.tsx` — RouteKey, ROUTES, ROUTE_LABEL, NAV, route switch.
- `src/dashboard/CommandPalette.tsx` — two nav entries.
- `src/dashboard/dashboard.css` — new rules:
  - `.ad-vault-card` (premium card surface + flip container)
  - `.ad-vault-card-face` (front/back faces with `backface-visibility: hidden`)
  - `.ad-balance-hero` (large premium balance surface)
  - `.ad-tx-row` (transaction row polish)
  - All with `[data-theme="dark"]` overrides.

## Verification
1. `npm run build` — typecheck + Vite build pass.
2. `npm run lint` — clean.
3. Manual smoke: navigate to `/app/vault`, flip a card, add an item, search by type. Navigate to `/app/wallet`, top up, see balance change + new transaction.
4. Dark-mode parity on both pages.
