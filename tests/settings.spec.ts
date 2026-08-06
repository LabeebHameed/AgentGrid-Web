import { test, expect } from '@playwright/test';

test.describe('Settings Overview', () => {

  test.beforeEach(async ({ page }) => {
    // Skip the wizard and start in dark mode so the dashboard renders directly.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('aeg-dash-wizard-done', '1');
      localStorage.setItem('aeg-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
  });

  // SO-T1-1: SettingsOverview renders all 6 status cards at /app/settings.
  // Each card must have the documented data-testid and contain a clickable
  // surface that links to its detail route.
  test('Overview renders 6 status cards', async ({ page }) => {
    await page.goto('/#/app/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    // Page header still says "Settings" so existing nav breadcrumbs keep working.
    await expect(page.locator('header')).toContainText('Settings');

    // Six cards, each with its data-testid.
    const cardIds = [
      'card-enforcement',
      'card-license',
      'card-workspace',
      'card-notifications',
      'card-security',
      'card-audit',
    ];

    for (const id of cardIds) {
      const card = page.locator(`[data-testid="${id}"]`);
      await expect(card, `card "${id}" must be present`).toBeVisible();
    }

    // Every card itself is the anchor — assert the href on the card root.
    await expect(page.locator('[data-testid="card-enforcement"]')).toHaveAttribute('href', /\/app\/settings\/security/);
    await expect(page.locator('[data-testid="card-license"]')).toHaveAttribute('href', /\/app\/settings\/account/);
    await expect(page.locator('[data-testid="card-workspace"]')).toHaveAttribute('href', /\/app\/settings\/workspace/);
    await expect(page.locator('[data-testid="card-notifications"]')).toHaveAttribute('href', /\/app\/settings\/notifications/);
    await expect(page.locator('[data-testid="card-security"]')).toHaveAttribute('href', /\/app\/settings\/security/);
    await expect(page.locator('[data-testid="card-audit"]')).toHaveAttribute('href', /\/app\/settings\/audit/);
  });

  // SO-T1-2: Sub-routes must not 404. Stub pages render a placeholder so the
  // cards above always have somewhere to land.
  test('Detail sub-routes render placeholders without 404', async ({ page }) => {
    const subpaths = [
      '/#/app/settings/security',
      '/#/app/settings/account',
      '/#/app/settings/workspace',
      '/#/app/settings/notifications',
      '/#/app/settings/audit',
    ];

    for (const hash of subpaths) {
      await page.goto(hash);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(200);
      await expect(page.locator('#main-content')).toBeVisible();
    }
  });

  // SO-T1-4: Recent changes panel renders below the 6 cards and either shows
  // a list of recent settings-related ledger rows OR an empty-state message.
  test('Recent changes panel', async ({ page }) => {
    await page.goto('/#/app/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
    const panel = page.locator('[data-testid="recent-changes"]');
    await expect(panel).toBeVisible();
    const rows = page.locator('[data-testid="recent-change-row"]');
    const empty = page.locator('[data-testid="recent-changes-empty"]');
    await expect(rows.or(empty)).toBeVisible();
    if (await empty.isVisible()) {
      await expect(empty).toContainText('No changes in the last 30 days.');
    }
  });

  // SO-T1-6: Routing matrix renders 6 event rows × 3 channels; toggles persist across reload.
  test('Routing matrix toggles persist', async ({ page }) => {
    await page.goto('/#/app/settings/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="routing-matrix"]')).toBeVisible();
    for (const ev of [
      'stepup_required',
      'mandate_denied',
      'mandate_expiring',
      'device_paired',
      'member_invited',
      'weekly_digest',
    ]) {
      await expect(
        page.locator(`[data-testid="routing-row-${ev}"]`)
      ).toBeVisible();
    }
    const toggle = page.locator('[aria-label="route stepup_required via sms"]');
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    await page.waitForTimeout(150);
    const after = await toggle.getAttribute('aria-checked');
    expect(before).not.toBe(after);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
    const afterReload = await page
      .locator('[aria-label="route stepup_required via sms"]')
      .getAttribute('aria-checked');
    expect(afterReload).toBe(after);
  });

  // SO-T1-7: Quiet-hours fields (start, end, timezone) persist across reload.
  test('Quiet hours fields persist', async ({ page }) => {
    await page.goto('/#/app/settings/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="quiet-hours"]')).toBeVisible();

    const start = page.locator('[data-testid="quiet-hours-start"]');
    const end = page.locator('[data-testid="quiet-hours-end"]');
    const tz = page.locator('[data-testid="quiet-hours-tz"]');

    await start.fill('21:30');
    await end.fill('06:30');
    await tz.selectOption('Asia/Tokyo');
    // Wait for debounce
    await page.waitForTimeout(700);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="quiet-hours-start"]')).toHaveValue('21:30');
    await expect(page.locator('[data-testid="quiet-hours-end"]')).toHaveValue('06:30');
    await expect(page.locator('[data-testid="quiet-hours-tz"]')).toHaveValue('Asia/Tokyo');
  });

  // SO-T1-5: Notifications channels render with Email / SMS / Push / Webhook rows.
  test('Notifications channels render', async ({ page }) => {
    await page.goto('/#/app/settings/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="channels-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-sms"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-push"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-webhook"]')).toBeVisible();
  });

  // SO-T1-8: Send me a test email CTA shows a success toast (deterministic via Math.random stub).
  test('Send me a test email shows toast', async ({ page }) => {
    await page.goto('/#/app/settings/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="test-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-test-email"]')).toBeVisible();

    // Stub Math.random so we deterministically test the success path
    await page.addInitScript(() => {
      Math.random = () => 0.1; // < 0.9 → success
    });
    // Reload to apply the stub
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    await page.locator('[data-testid="send-test-email"]').click();
    // Toast appears after 600ms
    await expect(page.locator('.ad-toast')).toContainText('Test email sent to', { timeout: 3000 });
  });

  // SO-T1-3: Each card carries a status pill whose tone reflects live store state.
  test('Cards reflect live store state', async ({ page }) => {
    await page.goto('/#/app/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    // Enforcement card — defaults to ON, so pill text is "On".
    const enforcementPill = page.locator('[data-testid="card-enforcement"]').getByText(/^On$/);
    await expect(enforcementPill).toBeVisible();

    // Workspace card — always "Active".
    const workspacePill = page.locator('[data-testid="card-workspace"]').getByText(/^Active$/);
    await expect(workspacePill).toBeVisible();

    // Audit card — always "On" and reflects ledger size.
    const auditPill = page.locator('[data-testid="card-audit"]').getByText(/^On$/);
    await expect(auditPill).toBeVisible();
    const auditText = await page.locator('[data-testid="card-audit"]').innerText();
    expect(auditText).toMatch(/Ledger captures/);
  });
});
