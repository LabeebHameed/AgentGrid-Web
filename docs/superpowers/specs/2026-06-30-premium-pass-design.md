# Premium Pass Design Spec — AgentTag.me

## Goal
Make the AgentTag.me landing page and dashboard feel genuinely premium, cohesive, and launch-ready — not generic “AI slop.” This means a disciplined visual system, purposeful motion, flawless accessibility, and production-grade build quality.

## Scope
- **Landing page** (`src/App.tsx`, `src/index.css`, `src/components/*`)
- **Dashboard shell** (`src/dashboard/Dashboard.tsx`, `src/dashboard/dashboard.css`, `src/dashboard/ui.tsx`)
- **All dashboard pages** (`src/dashboard/pages.tsx`, `src/dashboard/Wizard.tsx`)
- **Global tokens & motion** (`src/index.css`, design-token layer)
- **Verification** (`tests/*.spec.ts`, `npm run build`, `npx playwright test`)

## Non-goals
- No new backend or real auth
- No new routes beyond existing stubs
- No content strategy rewrite beyond tightening copy density

## Visual System

### Color
- Keep monochrome (warm zinc/neutral) + crimson accent as the brand spine.
- Re-introduce semantic colors for status badges, but keep them desaturated and premium:
  - `--ok`: muted emerald green
  - `--info`: muted blue
  - `--warn`: muted amber
  - `--bad`: muted crimson/red
- Ensure every text/background pair meets WCAG AA (≥ 4.5:1).
- Dark mode must pass the same contrast checks.

### Surfaces
- Replace static borders with layered transparent shadows (`--shadow-border`).
- Use concentric border radius: outer radius = inner radius + padding.
- Cards use subtle inner highlight + outer shadow for depth.
- Add `--shadow-lift` for hover states: 1px translateY + slightly larger shadow.

### Typography
- Landing headlines: tightened sans-serif with refined letter-spacing and line-height (keep current font family, improve spacing).
- UI text: crisp sans.
- All numbers, hashes, spend limits use `font-variant-numeric: tabular-nums`.
- Headings use `text-wrap: balance`; body uses `text-wrap: pretty`.
- `-webkit-font-smoothing: antialiased` on root for macOS.

## Landing Page

### Hero
- Video background clearly visible with layered glass panels over it.
- Headline and subhead have balanced text-wrap and tight line-height.
- CTA buttons scale to 0.96 on press; hover state lifts with shadow.
- Theme toggle crossfades smoothly.

### Sections
- Staggered reveal on scroll using Framer Motion with consistent `duration`/`ease`.
- Cards: concentric radius, shadow-as-border, hover lift.
- Social proof and feature grids: generous whitespace, consistent alignment.
- Footer: clean hierarchy, accessible links, visible focus outlines.

## Dashboard

### Shell
- Sidebar: refined inactive state contrast (≥ 4.5:1), collapsed tooltips below 860px.
- Topbar: breadcrumb, avatar, notifications, theme toggle animate smoothly.
- Route transitions: panel reveal / crossfade, not instant jumps.

### Shared Components
- Stat cards: concentric radius, tabular nums, hover lift.
- Segmented controls / tabs: sliding active pill animation.
- Buttons: 0.96 press scale, focus ring visible on keyboard.
- Inputs: animated focus ring, subtle inner glow, accessible labels.
- Badges: color-coded semantic status.

### Pages
- **Overview**: balanced grid, clear hierarchy, animated stat reveals.
- **Governance**: polished policy composer modal, smooth open/close, accessible focus trap.
- **Inbox**: color-coded ALLOW/DENY/STEP_UP/NOTICE badges, improved empty state with layered icon and suggestions, wizard active indicator highlighted, copy-toast on command copy.
- **History**: clean timeline, tabular dates/values.
- **Providers / Devices**: consistent cards, accessible toggles, clear empty states.
- **Settings**: accessible toggles with labels, high-contrast footer labels.
- **Notifications / Profile / Support / Help**: consistent with shell premium treatment.

## Motion System

### Tokens
Adopt transitions.dev motion tokens for consistency:
- Durations: 150ms quick, 250ms fast, 400ms slow, 500ms very slow
- Easings: `cubic-bezier(0.22, 1, 0.36, 1)` for smooth ease-out
- Distances: 4px micro, 8px base, 12px medium
- Scales: 0.96 press, 0.98 tooltip, 0.99 dropdown close

### Patterns
- Press scale: 0.96 on all buttons, tags, toggles, nav links.
- Hover lift: card translateY(-1px) + shadow lift.
- Theme toggle: spring crossfade with `AnimatePresence`.
- Staggered reveals: split hero/section content into chunks, ~100ms stagger.
- Dropdowns/menu reveals: origin-aware grow animation.
- Modals: scale-up open, softer scale-down close.
- Tabs/sliders: sliding active pill.
- Tooltips: delayed fade+scale in, instant out.
- Empty states: texts reveal with stagger.

## Accessibility

- WCAG AA contrast for all text (≥ 4.5:1 normal, ≥ 3:1 large/UI components).
- Skip-to-content link present and focusable.
- Correct ARIA: `aria-expanded`, `aria-haspopup`, `role="menu"` on dropdowns.
- All images have non-empty `alt`.
- All buttons have accessible labels (visible text or `aria-label`).
- Toggle switches have associated labels.
- Visible focus indicators on keyboard tab.
- Respect `prefers-reduced-motion`.

## Build & Quality Gates

- `npm run build` completes with zero errors/warnings.
- `npx playwright test` passes with ≥ 25 tests total.
- All images have alt attributes.
- No unused imports.
- No `.bak-*` files or loose screenshot files in project root.
- Clean project structure.

## Verification Plan

1. Run design audit against make-interfaces-feel-better and transitions-dev principles.
2. Implement token/CSS foundation first.
3. Polish landing page.
4. Polish dashboard shell and shared components.
5. Polish each dashboard page.
6. Add/update Playwright tests: route navigation, mobile viewports, a11y assertions.
7. Run build, lint, tests.
8. Final review.

## Acceptance Criteria

- [ ] Landing page feels premium and cohesive in both light and dark themes.
- [ ] Dashboard renders without glitches at 1440px, 1024px, 768px, 375px.
- [ ] All clickable surfaces scale to 0.96 on press.
- [ ] All route/tab/segmented switches animate smoothly.
- [ ] Contrast meets WCAG AA everywhere.
- [ ] `npm run build` is clean.
- [ ] Playwright test count ≥ 25 and all pass.
- [ ] No horizontal overflow at 375px on any page.
