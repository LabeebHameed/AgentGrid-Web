import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Dashboard E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Set localStorage flag so the setup wizard is marked as done,
    // allowing the dashboard to render directly.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('aeg-dash-wizard-done', '1');
      localStorage.setItem('aeg-theme', 'dark'); // start in dark mode
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.goto('/#/app/dashboard');
  });

  // DB-T1-1: Dashboard route navigation
  test('DB-T1-1: Dashboard route navigation updates URL and page view', async ({ page }) => {
    // Assert we start at Dashboard (Overview)
    await expect(page).toHaveURL(/#\/app\/dashboard/);
    await expect(page.locator('header')).toContainText('Dashboard');
    // Main Dashboard is now the "Overview" — a floored, aggregate-only
    // view. Per-agent detail lives in the Governance tab.
    await expect(page.locator('.ad-scroll')).toContainText('Overview');
    await expect(page.locator('.ad-scroll')).toContainText('System posture');
    await expect(page.locator('.ad-scroll')).toContainText('Mandate coverage by family');

    // Define navigation items to click, expected hash, and expected content in PageHeader
    const navItems = [
      { name: 'Governance', hash: '#/app/governance', title: 'Governance' },
      { name: 'Inbox', hash: '#/app/inbox', title: 'Inbox' },
      { name: 'Audit Ledger', hash: '#/app/audit', title: 'Audit Ledger' },
      { name: 'Providers', hash: '#/app/providers', title: 'Providers' },
      { name: 'Devices', hash: '#/app/devices', title: 'Devices' },
      { name: 'Settings', hash: '#/app/settings', title: 'Settings' }
    ];

    for (const item of navItems) {
      // Find the sidebar button by text and click it
      const navBtn = page.locator(`.ad-nav-item:has-text("${item.name}")`);
      await navBtn.click();
      
      // Verify URL hash updates correctly
      await expect(page).toHaveURL(new RegExp(item.hash.replace('/', '\\/')));

      // Verify correct page title is shown
      await expect(page.locator('header')).toContainText(item.title);
    }
  });

  // DB-T1-2: Mobile viewport rendering
  test('DB-T1-2: Mobile viewport rendering adapts layout and prevents horizontal overflow', async ({ page }) => {
    // Set viewport to 375px width (standard mobile)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500); // Let CSS calculations and reflow finish

    // Mobile trigger should be visible
    const trigger = page.locator('[data-sidebar="trigger"]').first();
    await expect(trigger).toBeVisible();

    // Desktop sidebar container should be hidden on mobile
    const sidebar = page.locator('.ad-side');
    await expect(sidebar).not.toBeVisible();

    // Check that there is no horizontal layout overflow on the page body
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  // DB-T1-3: Accessibility check - Landing Page
  test('DB-T1-3: Accessibility check on Landing Page has no critical violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Run accessibility scan
    const results = await new AxeBuilder({ page }).analyze();
    
    // Filter for critical violations
    const criticalViolations = results.violations.filter(v => v.impact === 'critical');
    
    if (criticalViolations.length > 0) {
      console.error('Critical accessibility violations on Landing Page:', JSON.stringify(criticalViolations, null, 2));
    }
    
    expect(criticalViolations).toEqual([]);
  });

  // DB-T1-4: Accessibility check - Dashboard Page
  test('DB-T1-4: Accessibility check on Dashboard Page has no critical violations', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Run accessibility scan on the dashboard view
    const results = await new AxeBuilder({ page }).analyze();
    
    // Filter for critical violations
    const criticalViolations = results.violations.filter(v => v.impact === 'critical');
    
    if (criticalViolations.length > 0) {
      console.error('Critical accessibility violations on Dashboard Page:', JSON.stringify(criticalViolations, null, 2));
    }
    
    expect(criticalViolations).toEqual([]);
  });

  // DB-T1-5: Sidebar theme toggle adapts the theme properly
  test('DB-T1-5: Sidebar theme toggle updates theme attribute', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Click the theme toggle button in the sidebar
    const themeBtn = page.locator('.ad-theme-toggle');
    await themeBtn.click();
    await page.waitForTimeout(200);

    // Verify it changed to light mode (attribute is removed)
    await expect(html).not.toHaveAttribute('data-theme', 'dark');

    // Toggle back
    await themeBtn.click();
    await page.waitForTimeout(200);
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  // DB-T1-6: Direct route navigation renders each page without console errors
  test('DB-T1-6: Each dashboard route renders directly via hash with zero console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`PageError: ${err.message}`));

    const routes = [
      { hash: '#/app/dashboard', title: 'Dashboard' },
      { hash: '#/app/governance', title: 'Governance' },
      { hash: '#/app/inbox', title: 'Inbox' },
      { hash: '#/app/history', title: 'History' },
      { hash: '#/app/providers', title: 'Providers' },
      { hash: '#/app/devices', title: 'Devices' },
      { hash: '#/app/settings', title: 'Settings' },
    ];

    for (const r of routes) {
      await page.goto(`/${r.hash}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(300); // let route transition settle
      await expect(page).toHaveURL(new RegExp(r.hash.replace('/', '\\/')));
      await expect(page.locator('header')).toContainText(r.title);
      // main content must be visible (skip-link target)
      await expect(page.locator('#main-content')).toBeVisible();
    }

    // Some console errors from third-party CDNs (Unsplash images) can appear
    // depending on network. Filter to errors that come from our own origin.
    const ourOriginErrors = consoleErrors.filter(
      (e) => !/unsplash|favicon/i.test(e),
    );
    expect(ourOriginErrors, `Unexpected console errors: ${ourOriginErrors.join('\n')}`).toEqual([]);
  });

  // Settings: Enforcement toggle persists across page reload
  test('enforcement toggle persists', async ({ page }) => {
    // Navigate to Settings → Security (the consolidated detail route that
    // keeps the enforcement, license, API URL, and step-up controls).
    await page.goto('/#/app/settings/security');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    // Locate the global enforcement toggle by its aria-label
    const toggle = page.locator('[aria-label="global enforcement"]');
    await expect(toggle).toBeVisible();

    // Capture initial state, then flip
    const initialChecked = await toggle.getAttribute('aria-checked');
    const expectedAfterFlip = initialChecked === 'true' ? 'false' : 'true';
    await toggle.click();

    // Verify it flipped immediately
    await expect(toggle).toHaveAttribute('aria-checked', expectedAfterFlip);

    // Reload the page — state should survive (in-memory module-level store)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    // Re-locate the toggle after reload and assert it persisted
    const toggleAfterReload = page.locator('[aria-label="global enforcement"]');
    await expect(toggleAfterReload).toBeVisible();
    await expect(toggleAfterReload).toHaveAttribute('aria-checked', expectedAfterFlip);
  });
});
