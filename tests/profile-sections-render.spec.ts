import { test, expect } from '@playwright/test';

test.describe('Profile page — sections render', () => {
  test.beforeEach(async ({ page }) => {
    // Set localStorage BEFORE the app initializes so the wizard is skipped.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('aeg-dash-wizard-done', '1');
        localStorage.setItem('aeg-theme', 'dark');
      } catch {
        // ignore
      }
    });
  });

  test('all six sections, DID monogram, and current device chip are visible', async ({ page }) => {
    await page.goto('/#/app/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // The pinned identity hero displays the DID monogram.
    await expect(page.getByText(/did:key:/).first()).toBeVisible();

    // All six section titles.
    await expect(page.getByText('Contact').first()).toBeVisible();
    await expect(page.getByText('Security').first()).toBeVisible();
    await expect(page.getByText('Active sessions').first()).toBeVisible();
    await expect(page.getByText('Preferences').first()).toBeVisible();
    await expect(page.getByText('Danger zone').first()).toBeVisible();

    // The current device row carries a "current" chip.
    await expect(page.getByText('current').first()).toBeVisible();
  });
});
