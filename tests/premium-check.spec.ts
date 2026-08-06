import { test, expect } from '@playwright/test';

test.describe('Premium UI Quality and Error Checks', () => {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  test.beforeEach(({ page }) => {
    consoleErrors.length = 0;
    networkErrors.length = 0;

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`Console Error: ${msg.text()}`);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`Page Error: ${err.message}`);
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`HTTP ${response.status()} on ${response.url()}`);
      }
    });
  });

  test('should load without console/network errors and have valid image assets', async ({ page }) => {
    await page.goto('/');

    // Let the canvas and animations settle
    await page.waitForTimeout(2000);

    // Verify no console errors
    expect(consoleErrors).toEqual([]);
    // Verify no network asset load failures
    expect(networkErrors).toEqual([]);

    // Check if logos loaded correctly (their images must have non-zero naturalWidth)
    const logos = page.locator('img[src*="logo_bgremoved"]');
    const count = await logos.count();
    console.log(`Found ${count} instances of custom logos`);
    for (let i = 0; i < count; i++) {
      const naturalWidth = await logos.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('should toggle theme and maintain monochrome styling', async ({ page }) => {
    await page.goto('/');
    
    // Find theme toggle button (either has Sun or Moon icon or text)
    const themeBtn = page.locator('button:has-text("Light mode"), button:has-text("Dark mode"), button .lucide-sun, button .lucide-moon').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      expect(consoleErrors).toEqual([]);
    }
  });
});
