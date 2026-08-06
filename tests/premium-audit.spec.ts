import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

const ROUTES: { hash: string; name: string; expectedH1: RegExp }[] = [
  { hash: '#/app/dashboard', name: '01-dashboard', expectedH1: /welcome|overview/i },
  { hash: '#/app/governance', name: '02-governance', expectedH1: /governance/i },
  { hash: '#/app/inbox', name: '03-inbox', expectedH1: /inbox/i },
  { hash: '#/app/providers', name: '04-providers', expectedH1: /providers/i },
  { hash: '#/app/devices', name: '05-devices', expectedH1: /devices/i },
  { hash: '#/app/settings', name: '06-settings', expectedH1: /settings/i },
  { hash: '#/app/support', name: '07-support', expectedH1: /support/i },
  { hash: '#/app/vault', name: '08-vault', expectedH1: /vault/i },
  { hash: '#/app/wallet', name: '09-wallet', expectedH1: /wallet/i },
  { hash: '#/app/audit', name: '10-audit', expectedH1: /audit/i },
  { hash: '#/app/notifications', name: '11-notifications', expectedH1: /notifications/i },
  { hash: '#/app/profile', name: '12-profile', expectedH1: /profile|operator/i },
  { hash: '#/app/help', name: '13-help', expectedH1: /help|shortcuts/i },
];

type Finding = { kind: 'FAIL' | 'WARN'; msg: string };

async function auditRoute(page: Page, hash: string, expectedH1: RegExp): Promise<{ findings: Finding[]; h1: string; }> {
  const findings: Finding[] = [];
  await page.goto(hash.startsWith('#') ? '/' + hash : hash, { waitUntil: 'load' });
  await page.waitForSelector('main h1, main h2', { timeout: 8000 }).catch(() => {
    findings.push({ kind: 'WARN', msg: 'no h1/h2 on page' });
  });
  await page.waitForTimeout(500);

  // ---- Sidebar (shadcn Sidebar: data-slot=sidebar-menu-button) ----
  const sidebarBtns = page.locator('[data-slot="sidebar-menu-button"]');
  const navCount = await sidebarBtns.count();
  if (navCount < 5) findings.push({ kind: 'WARN', msg: `sidebar has only ${navCount} menu buttons` });

  const ariaCurrent = await page.locator('[data-slot="sidebar-menu-button"][data-active="true"], [data-slot="sidebar-menu-button"][aria-current="page"]').count();
  // shadcn uses data-active when isActive; also ok if data-state=active
  const stateActive = await page.locator('[data-slot="sidebar-menu-button"][data-state="active"]').count();
  if (ariaCurrent === 0 && stateActive === 0) {
    findings.push({ kind: 'WARN', msg: `no active sidebar item (no data-active or data-state=active)` });
  }

  // ---- Page header h1 ----
  const mainH1 = await page.locator('main h1').first();
  const h1 = (await mainH1.innerText().catch(() => '')).trim();
  if (!h1) findings.push({ kind: 'FAIL', msg: 'main has no h1' });
  if (!expectedH1.test(h1)) {
    findings.push({ kind: 'WARN', msg: `h1 "${h1}" does not match ${expectedH1}` });
  }
  const h1FontPx = parseFloat(await mainH1.evaluate((el) => getComputedStyle(el).fontSize).catch(() => '0'));
  const h1Weight = await mainH1.evaluate((el) => getComputedStyle(el).fontWeight).catch(() => '');
  if (h1FontPx > 0 && h1FontPx < 22) {
    findings.push({ kind: 'WARN', msg: `h1 font-size ${h1FontPx}px feels small for premium page header` });
  }
  if (h1Weight && parseInt(h1Weight) < 500) {
    findings.push({ kind: 'WARN', msg: `h1 font-weight ${h1Weight} feels light for premium` });
  }

  // ---- Card surfaces ----
  const cardCount = await page.locator('main section, main article, main [data-slot="card"]').count();
  if (cardCount === 0) findings.push({ kind: 'WARN', msg: 'no card/section containers found in main' });

  // ---- Typography tokens ----
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  if (!/Inter|system|-apple|Segoe|Roboto|sans/i.test(bodyFont)) {
    findings.push({ kind: 'WARN', msg: `body font-family "${bodyFont.slice(0, 60)}" — no premium stack detected` });
  }

  const crimsonVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--crimson').trim());
  if (!crimsonVar) findings.push({ kind: 'WARN', msg: '--crimson CSS variable not defined' });

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (!bg || bg === 'rgba(0, 0, 0, 0)') findings.push({ kind: 'WARN', msg: `body background transparent: ${bg}` });

  // ---- Focus ring on first interactive ----
  const firstInteractive = page.locator('main button, main a[href], main input, main [tabindex="0"]').first();
  if (await firstInteractive.count()) {
    await firstInteractive.focus();
    const focus = await firstInteractive.evaluate((el) => {
      const s = getComputedStyle(el);
      return { outline: s.outline, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow };
    });
    const hasFocus = focus.outlineWidth !== '0px' || focus.boxShadow !== 'none';
    if (!hasFocus) findings.push({ kind: 'WARN', msg: `no visible focus ring (outline=${focus.outline})` });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  }

  return { findings, h1 };
}

test.describe('Premium DOM/CSS audit v2', () => {
  test.slow();

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('aeg-dash-wizard-done', '1');
        localStorage.setItem('aeg-theme', 'dark');
        Object.assign(window, { __TESTING__: true });
      } catch {
        // ignore
      }
    });
  });

  for (const route of ROUTES) {
    test(`audit ${route.name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (m: ConsoleMessage) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(`PAGE: ${e.message}`));

      await page.setViewportSize({ width: 1280, height: 800 });
      const { findings, h1 } = await auditRoute(page, route.hash, route.expectedH1);

      if (errors.length) findings.push({ kind: 'WARN', msg: `${errors.length} console error(s): ${errors[0].slice(0, 120)}` });

      console.log(`\n=== ${route.name} (${route.hash}) ===`);
      console.log(`h1: "${h1}"`);
      console.log(`findings: ${findings.length === 0 ? 'CLEAN' : ''}`);
      findings.forEach((f) => console.log(`  [${f.kind}] ${f.msg}`));

      const fails = findings.filter((f) => f.kind === 'FAIL');
      expect(fails).toEqual([]);
    });
  }
});
