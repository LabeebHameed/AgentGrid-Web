# AgentTag.me

> Identity for AI agents · Free public beta

AgentTag is the control plane that gives every autonomous agent its own cryptographic identity, signed mandates, and tamper-evident audit trail — so an agent can act on your behalf without ever acting without you.

This repository contains the marketing landing page and the demo control-plane surface. Live product: <https://agenttag.me>.

---

## Stack

- **React 19** — UI runtime
- **Vite 8** — dev server + build
- **TypeScript** — strict types
- **Framer Motion** — micro-interactions, hero reveals
- **Lenis** — smooth scroll
- **Playwright** — end-to-end coverage
- **axe-core** — accessibility audits on Landing Page + Dashboard

No backend is shipped in this repository. The demo control-plane at `#/app/*` shows realistic-but-mocked operational data.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over `src/` |
| `npx playwright test` | Run the full E2E suite (auto-starts dev server) |
| `npx playwright test landing.spec.ts` | Single suite |

## Environment

This repo reads no secrets at build time. To wire the deferred features (newsletter endpoint, pricing checkout, real auth), see `TODO.md`.

## Project layout

```
src/
  App.tsx                Landing page (single page, anchored sections)
  Router.tsx             Hash router: landing / dashboard / footer stubs
  StubPage.tsx           Branded stub for footer legal/content pages
  main.tsx               Bootstraps React, mounts <Router>
  index.css              Design tokens, components, dark theme overrides
  components/WorldMap.tsx
  dashboard/             Mock control-plane UI prefixed by /#/app/*
public/                 Static assets (logos, video, robots, sitemap)
tests/                   Playwright spec files
TODO.md                  Deferred work (post-launch)
```

## Conventions

- Hash routing only (`/`, `/#/app/dashboard`, `/#/terms`, …). No `react-router` is installed by design.
- Footer stubs are React components rendered through `<StubPage>`. New stubs: add a slug to `STUB_ROUTES` in `src/Router.tsx` + a copy block in `src/StubPage.tsx`.
- Theme is attribute-driven (`<html data-theme="dark">`). Toggle persists in `localStorage.aeg-theme`.

## Deploy

Build → upload `dist/`. Recommended targets: Vercel, Netlify, Cloudflare Pages. See `TODO.md` for the post-launch CI workflow.

## License

Proprietary. © 2026 AgentTag.me.
