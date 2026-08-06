# Premium Pass Implementation Plan — AgentTag.me

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Make the AgentTag.me landing page and dashboard feel genuinely premium, cohesive, and launch-ready through a disciplined visual system, purposeful motion, flawless accessibility, and production-grade build quality.

**Architecture:** Apply a centralized token layer (`src/index.css`) for shadows, radius, motion, and semantic colors; then upgrade components and pages to consume those tokens. Keep the existing React + Vite + Tailwind + Framer Motion stack. Use Builder subagents for implementation chunks and a Reviewer subagent for final verification.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Tailwind CSS 4, Framer Motion, shadcn/ui components, Playwright.

---

## Files that will change

| File | Responsibility |
| --- | --- |
| `src/index.css` | Global tokens: shadows, radius, motion, typography, semantic colors, reduced-motion |
| `src/App.tsx` | Landing page layout, hero, sections, footer |
| `src/components/RotatingWord.tsx` | Landing word rotation animation |
| `src/components/WorldMap.tsx` | Map visual polish |
| `src/dashboard/Dashboard.tsx` | Dashboard shell, sidebar, topbar, routing |
| `src/dashboard/dashboard.css` | Dashboard-scoped tokens and component styles |
| `src/dashboard/ui.tsx` | Shared dashboard UI: cards, badges, toasts, inputs |
| `src/dashboard/pages.tsx` | All dashboard page content |
| `src/dashboard/Wizard.tsx` | Setup wizard polish |
| `src/hooks/use-mobile.ts` | Fix lint error around setState in effect |
| `tests/*.spec.ts` | Playwright test additions (mobile, a11y, route navigation) |

---

## Task 1: Foundation Tokens & Motion System

**Files:**
- Modify: `src/index.css`
- Modify: `src/dashboard/dashboard.css`
- Test: `npm run build`, `npm run lint`

**Goal:** Establish the design-token foundation that every later task consumes.

- [ ] **Step 1.1: Add shadow tokens**
  Add CSS custom properties for `--shadow-border`, `--shadow-lift`, `--shadow-card`, `--shadow-dropdown`, `--shadow-modal`, `--shadow-focus`. Use layered transparent `box-shadow` values. Provide dark-mode overrides.

- [ ] **Step 1.2: Add radius tokens**
  Add `--radius-xs` through `--radius-3xl`. Document the concentric radius rule in a comment.

- [ ] **Step 1.3: Add motion tokens**
  Add `--duration-quick`, `--duration-fast`, `--duration-medium`, `--duration-slow`, `--ease-smooth-out`, `--distance-micro`, `--distance-base`, `--distance-medium`, `--scale-press`.

- [ ] **Step 1.4: Add typography utilities**
  Add `.font-tabular`, `.text-balance`, `.text-pretty` utilities. Ensure `html` has `-webkit-font-smoothing: antialiased`.

- [ ] **Step 1.5: Semantic colors for dashboard**
  In `src/dashboard/dashboard.css`, define `--ok`, `--info`, `--warn`, `--bad` with muted premium values and ensure contrast >= 4.5:1.

- [ ] **Step 1.6: Verify**
  Run `npm run build` (must pass) and `npm run lint` (record current issues).

---

## Task 2: Global Interaction Patterns

**Files:**
- Modify: `src/index.css`
- Modify: `src/dashboard/dashboard.css`
- Modify: `src/components/ui/button.tsx`
- Test: manual visual check, Playwright smoke test

**Goal:** Make every clickable surface feel tactile and every transition consistent.

- [ ] **Step 2.1: Button press scale**
  Update the shadcn Button component to include `active:scale-[0.96]` and `transition-transform`. Disabled buttons do not scale.

- [ ] **Step 2.2: Card hover lift**
  Add a `.card-lift` utility class that applies `translateY(-1px)` and `--shadow-lift` on hover with `--duration-fast` and `--ease-smooth-out`.

- [ ] **Step 2.3: Focus rings**
  Standardize focus-visible rings using `--shadow-focus`. Visible in both themes.

- [ ] **Step 2.4: Theme toggle crossfade**
  In both landing and dashboard theme toggles, wrap sun/moon icons in `AnimatePresence` with spring transition and scale/blur crossfade.

- [ ] **Step 2.5: Input focus animation**
  Add animated focus ring to inputs: border-color transition + `--shadow-focus` on focus.

- [ ] **Step 2.6: Verify**
  Run dev server and visually test. Run `npm run build`.

---

## Task 3: Landing Page Premium Polish

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Modify: `src/components/RotatingWord.tsx`
- Test: Playwright landing tests, manual visual check

**Goal:** Make the marketing page feel high-end and cohesive.

- [ ] **Step 3.1: Hero glass panels**
  Wrap hero copy and terminal mockup in glass-like surfaces with backdrop blur, subtle border shadow, and concentric radius.

- [ ] **Step 3.2: Video depth**
  Ensure background video remains visible. Add subtle vignette/gradient overlay preserving readability.

- [ ] **Step 3.3: Typography refinement**
  Apply `text-balance` to headings, `text-pretty` to paragraphs, `font-tabular` to terminal numbers.

- [ ] **Step 3.4: Section reveals**
  Convert section enter animations into staggered reveals using Framer Motion variants with ~100ms stagger.

- [ ] **Step 3.5: Footer & CTAs**
  CTA buttons use press scale and hover lift. Footer links have visible focus outlines.

- [ ] **Step 3.6: Verify**
  Run `npm run build`. Run `npx playwright test landing.spec.ts`.

---

## Task 4: Dashboard Shell & Navigation

**Files:**
- Modify: `src/dashboard/Dashboard.tsx`
- Modify: `src/dashboard/dashboard.css`
- Test: Playwright dashboard tests

**Goal:** Make the dashboard frame feel premium and responsive.

- [ ] **Step 4.1: Sidebar inactive contrast**
  Increase inactive nav link contrast to >= 4.5:1 in both themes.

- [ ] **Step 4.2: Collapsed sidebar tooltips**
  When viewport is below 860px and sidebar collapses, render accessible tooltips for each nav item.

- [ ] **Step 4.3: Route transitions**
  Wrap dashboard page content in `AnimatePresence mode="wait"` and apply panel-reveal / crossfade transition between routes.

- [ ] **Step 4.4: Topbar polish**
  Hover lift on topbar buttons, visible focus rings, subtle notification bell animation.

- [ ] **Step 4.5: Mobile sidebar**
  Sidebar adapts below 768px with icon-only or sheet mode and no horizontal overflow.

- [ ] **Step 4.6: Verify**
  Run `npm run build`. Run dashboard Playwright tests at 1440px, 1024px, 768px, 375px.

---

## Task 5: Dashboard Shared Components

**Files:**
- Modify: `src/dashboard/ui.tsx`
- Modify: `src/dashboard/dashboard.css`
- Modify: `@/components/ui/*` as needed
- Test: component usage across pages, Playwright smoke tests

**Goal:** Shared UI pieces feel consistent and premium.

- [ ] **Step 5.1: Stat cards**
  Apply concentric radius, shadow-as-border, hover lift, and `font-tabular` to all stat values.

- [ ] **Step 5.2: Status badges**
  Re-introduce semantic colors (ALLOW/DENY/STEP_UP/NOTICE) using `--ok`, `--bad`, `--warn`, `--info` tokens.

- [ ] **Step 5.3: Segmented controls / tabs**
  Implement sliding active pill for tab groups using Framer Motion `layoutId`.

- [ ] **Step 5.4: Toasts**
  Add smooth enter/exit transitions to toasts.

- [ ] **Step 5.5: Empty states**
  Upgrade empty states with larger icon, layered opacity background, staggered reveal.

- [ ] **Step 5.6: Verify**
  Run `npm run build`. Spot-check each dashboard page.

---

## Task 6: Dashboard Pages Polish

**Files:**
- Modify: `src/dashboard/pages.tsx`
- Modify: `src/dashboard/Wizard.tsx`
- Test: Playwright dashboard tests

**Goal:** Every dashboard page looks and behaves premium.

- [ ] **Step 6.1: Overview page**
  Polish stat grid layout, responsive wrapping, card-lift, tabular nums, staggered reveal.

- [ ] **Step 6.2: Governance page**
  Polish policy composer modal open/close with scale animation, focus trap, ESC close.

- [ ] **Step 6.3: Inbox page**
  Color-code action buttons, improve empty state, add Copied! tooltip on command copy.

- [ ] **Step 6.4: Wizard polish**
  Highlight `.is-active` indicator, animated input focus rings, copy-toast feedback.

- [ ] **Step 6.5: Other pages**
  Apply consistent card styling, tabular nums, accessible toggles, improved empty states, focus rings to History, Providers, Devices, Settings, Notifications, Profile, Support, Help.

- [ ] **Step 6.6: Fix Date.now lint issues**
  Replace `Date.now()` calls during render in `pages.tsx` with memoized timestamps.

- [ ] **Step 6.7: Verify**
  Run `npm run lint`. Run `npx playwright test`.

---

## Task 7: Accessibility Pass

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/dashboard/Dashboard.tsx`
- Modify: `src/dashboard/pages.tsx`
- Modify: `src/dashboard/Wizard.tsx`
- Modify: `tests/*.spec.ts`

**Goal:** Meet WCAG AA and pass axe-core checks.

- [ ] **Step 7.1: Skip-to-content link**
  Add skip link at top of `App.tsx` and `Dashboard.tsx` moving focus to main content.

- [ ] **Step 7.2: Alt text audit**
  Ensure every `img` has non-empty alt. Decorative images use `alt=""`.

- [ ] **Step 7.3: Button labels**
  Every button has visible text or `aria-label`. Icon-only buttons have `aria-label`.

- [ ] **Step 7.4: Toggle labels**
  Every toggle switch has associated label or `aria-labelledby`.

- [ ] **Step 7.5: ARIA menus**
  Dropdowns have `aria-expanded`, `aria-haspopup`, `role="menu"` where appropriate.

- [ ] **Step 7.6: Contrast final check**
  Run axe-core via Playwright and fix any contrast violations.

- [ ] **Step 7.7: Verify**
  Run `npx playwright test` including axe tests.

---

## Task 8: Tests & Build Verification

**Files:**
- Modify: `tests/*.spec.ts`
- Modify: `playwright.config.ts` if needed

**Goal:** Prove the site is launch-ready with automated verification.

- [ ] **Step 8.1: Add dashboard route navigation test**
  Test visits `/app/dashboard`, `/app/governance`, `/app/inbox`, `/app/history`, `/app/providers`, `/app/devices`, `/app/settings` and asserts each renders without console errors.

- [ ] **Step 8.2: Add mobile viewport rendering test**
  Test renders landing + dashboard at 375px width and asserts no horizontal overflow.

- [ ] **Step 8.3: Add accessibility assertions**
  Add axe-core checks to landing and dashboard tests covering alt text, button labels, contrast.

- [ ] **Step 8.4: Clean root screenshots**
  Move or remove loose `premium-*.png` files from project root into `docs/assets/` or `public/`.

- [ ] **Step 8.5: Final verification**
  Run `npm run build`, `npm run lint`, `npx playwright test`. All must pass with >= 25 tests.

---

## Acceptance Criteria

- [ ] `npm run build` completes with zero errors/warnings.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npx playwright test` passes with >= 25 tests.
- [ ] Landing page feels premium in both light and dark themes.
- [ ] Dashboard renders without glitches at 1440px, 1024px, 768px, 375px.
- [ ] All clickable surfaces scale to 0.96 on press.
- [ ] All route/tab/segmented switches animate smoothly.
- [ ] Contrast meets WCAG AA everywhere.
- [ ] No horizontal overflow at 375px on any page.
