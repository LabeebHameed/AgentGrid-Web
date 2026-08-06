import { test, expect } from '@playwright/test';

test('Tab from body reaches the email input on the profile page', async ({ page }) => {
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

  // Focus body directly to start keyboard navigation.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.focus();
  });

  const emailInput = page.getByLabel(/email address/i).first();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const isFocused = await emailInput.evaluate((el) => el === document.activeElement);
    if (isFocused) {
      expect(isFocused).toBe(true);
      return;
    }
  }
  throw new Error('Email input never received focus within 40 Tab presses');
});
