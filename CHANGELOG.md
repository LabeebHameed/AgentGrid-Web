# Changelog

## [0.2.0] - 2026-06-26

### Added
- **Create Agent screen** — multi-step form for registering a new agent identity with mandate configuration (capabilities, thresholds, transaction budgets)
- **Agent-wise login** — carry the operator-named agent through the CLI login flow so the CLI provisions/selects the right agent
- **Active agent tracking** — `getActiveAgent` / `setActiveAgent` API endpoints; auto-select the active agent on refresh
- **Vault credential persistence** — card-flip reveal UI for stored credentials in Governance
- **CAPTCHA step-up fallback** — interactive CAPTCHA with VNC screencast for high-risk approvals
- **Agent deletion** — delete agents from the Dashboard with confirmation dialog
- **Agent selector dropdown** — switch between agents from the sidebar

### Fixed
- Prevent onboarding flash on reload and governance blackout
- Expire stale sessionStorage port key and deduplicate `agentDid` fetch
- Clear sessionStorage port key on login failure to stop redirect loop
- Remove unused imports and constants across components
- Filter dashboard activity by selected agent
- Move delete button to Dashboard next to freeze button
- Error handling and `await` in delete agent flow
- Remove unused `selectedAgent` variable in Dashboard
- Remove wallet and vault sections from Dashboard (moved to Governance)
- **Build:** Remove unused `Key` and `HelpCircle` imports in `CreateAgent.tsx`
- **Build:** Suppress unused `token` variable warning in `CreateAgent.tsx`
- **Build:** Upgrade `@types/react` to v19 to resolve monorepo type conflicts

### Changed
- `@types/react` and `@types/react-dom` upgraded from `^18.3.x` to `^19.0.x`
