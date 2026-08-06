import { test, expect } from '@playwright/test';

test('Revoke all sessions fires a destructive toast', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('aeg-dash-wizard-done', '1');
      localStorage.setItem('aeg-theme', 'dark');
    } catch {
      // ignore
    }
  });

  await page.goto('/#/app/profile');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  const revokeBtn = page.getByRole('button', { name: /revoke all sessions/i }).first();
  await revokeBtn.click();

  await expect(page.getByText(/all sessions revoked/i)).toBeVisible({ timeout: 2000 });
});
