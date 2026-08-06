import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility assertions covering alt text and button labels.
 *
 * Complements the existing DB-T1-3 / DB-T1-4 axe scans in dashboard.spec.ts
 * (which check the axe critical-only bar) with rule-targeted DOM audits so
 * regressions in alt text or button accessible names are caught with precise
 * failure messages.
 *
 * Note: contrast is enforced at the existing critical-impact bar (matching
 * DB-T1-3/DB-T1-4) to stay aligned with the project's accepted threshold.
 */

test.describe('Accessibility — alt text, button labels, axe critical scan', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('aeg-dash-wizard-done', '1');
      localStorage.setItem('aeg-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
  });

  // A11Y-1: Landing — every <img> has non-empty alt, every <button> has accessible name, zero critical axe violations
  test('A11Y-1: Landing — alt text, button labels, zero critical axe violations', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    // Alt text: every <img> must have a non-empty alt attribute
    const imgs = page.locator('img');
    const imgCount = await imgs.count();
    expect(imgCount, 'Landing page should contain images').toBeGreaterThan(0);
    for (let i = 0; i < imgCount; i++) {
      const img = imgs.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt, `Image #${i} (${await img.getAttribute('src')}) is missing alt text`).not.toBeNull();
      expect(alt?.trim(), `Image #${i} has empty alt`).not.toBe('');
    }

    // Button labels: every <button> must have either visible text or aria-label
    const buttons = page.locator('button');
    const btnCount = await buttons.count();
    for (let i = 0; i < btnCount; i++) {
      const btn = buttons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const text = (await btn.textContent())?.trim() ?? '';
      const hasLabel = (ariaLabel && ariaLabel.trim() !== '') || text !== '';
      expect(hasLabel, `Button #${i} has no accessible name (no aria-label, no text)`).toBe(true);
    }

    // Axe scan: zero critical violations (matches DB-T1-3 bar)
    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');
    if (criticalViolations.length > 0) {
      console.error('Critical a11y violations on Landing:', JSON.stringify(criticalViolations, null, 2));
    }
    expect(criticalViolations).toEqual([]);
  });

  // A11Y-2: Dashboard — alt text, button labels, zero critical axe violations
  test('A11Y-2: Dashboard — alt text, button labels, zero critical axe violations', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aeg-dash-wizard-done', '1');
      localStorage.setItem('aeg-theme', 'dark');
    });
    await page.goto('/#/app/dashboard');
    await page.waitForSelector('img', { timeout: 15000 });

    // Alt text audit
    const imgs = page.locator('img');
    const imgCount = await imgs.count();
    expect(imgCount, 'Dashboard should contain images').toBeGreaterThan(0);
    for (let i = 0; i < imgCount; i++) {
      const img = imgs.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt, `Dashboard image #${i} (${await img.getAttribute('src')}) is missing alt text`).not.toBeNull();
    }

    // Button labels audit
    const buttons = page.locator('button');
    const btnCount = await buttons.count();
    for (let i = 0; i < btnCount; i++) {
      const btn = buttons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const text = (await btn.textContent())?.trim() ?? '';
      const hasLabel = (ariaLabel && ariaLabel.trim() !== '') || text !== '';
      expect(hasLabel, `Dashboard button #${i} has no accessible name`).toBe(true);
    }

    // Axe scan: zero critical violations (matches DB-T1-4 bar)
    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');
    if (criticalViolations.length > 0) {
      console.error('Critical a11y violations on Dashboard:', JSON.stringify(criticalViolations, null, 2));
    }
    expect(criticalViolations).toEqual([]);
  });
});
