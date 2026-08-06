import { test, expect } from '@playwright/test';

test.describe('Setup Wizard E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('aeg-dash-wizard-done');
      localStorage.setItem('aeg-theme', 'dark'); // start in dark mode by default for consistency
    });
    await page.goto('/#/app/dashboard');
    // Wait for the wizard dialog to mount
    await expect(page.locator('.ad-wiz')).toBeVisible();
  });

  // WIZ-T1-1
  test('WIZ-T1-1: License key input activation', async ({ page }) => {
    const input = page.locator('input[placeholder="paste your license key"]');
    const activateBtn = page.locator('button:has-text("Activate")');
    
    await input.fill('LICENSE-XYZ-123');
    await activateBtn.click();
    
    // Check that we moved to Step 2 (Agent setup)
    await expect(page.locator('.ad-wiz h2')).toContainText('Agent setup');
    
    // Verify toast or updated settings (licenseKey check in localStorage or setting UI)
    const toast = page.locator('.ad-toast');
    await expect(toast).toContainText('License activated');
  });

  // WIZ-T1-2
  test('WIZ-T1-2: Agent Setup step updates agent name', async ({ page }) => {
    // Navigate to step 2 (index 1)
    await page.locator('.ad-wiz-step').nth(1).click();
    await expect(page.locator('.ad-wiz h2')).toContainText('Agent setup');
    
    const nameInput = page.locator('input.ad-input');
    await nameInput.fill('Security Sentinel');
    
    // Description card should update
    const descCardName = page.locator('.ad-row-name');
    await expect(descCardName).toContainText('Security Sentinel');
  });

  // WIZ-T1-3
  test('WIZ-T1-3: Providers step allows toggling Stripe/Twilio', async ({ page }) => {
    // Navigate to step 3 (index 2)
    await page.locator('.ad-wiz-step').nth(2).click();
    await expect(page.locator('.ad-wiz h2')).toContainText('Providers');
    
    // Find twilio provider row toggle
    const twilioRow = page.locator('.ad-row:has-text("Twilio")');
    const toggle = twilioRow.locator('button[role="switch"]');
    
    const isInitiallyOn = await toggle.getAttribute('aria-checked') === 'true';
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', isInitiallyOn ? 'false' : 'true');
  });

  // WIZ-T1-4
  test('WIZ-T1-4: Phone linking step handles sending verification code', async ({ page }) => {
    // Navigate to step 4 (index 3)
    await page.locator('.ad-wiz-step').nth(3).click();
    await expect(page.locator('.ad-wiz h2')).toContainText('Link phone');
    
    const phoneInput = page.locator('input[placeholder="+1 555 000 0000"]');
    const sendBtn = page.locator('button:has-text("Send code")');
    
    await phoneInput.fill('+15551234567');
    await sendBtn.click();
    
    // Code input field should appear
    await expect(page.locator('input[placeholder="••••••"]')).toBeVisible();
    await expect(page.locator('.ad-toast')).toContainText('Code sent');
  });

  // WIZ-T1-5
  test('WIZ-T1-5: Connect AI command generator updates CLI commands', async ({ page }) => {
    // Navigate to step 5 (index 4)
    await page.locator('.ad-wiz-step').nth(4).click();
    await expect(page.locator('.ad-wiz h2')).toContainText('Connect AI');
    
    // Check initial command contains "Research Agent" (default name)
    const cmdCode = page.locator('code.mono');
    await expect(cmdCode).toContainText('--agent "Research Agent"');
    await expect(cmdCode).toContainText('--client claude');
    
    // Switch to ChatGPT client
    const chatGptTab = page.locator('.ad-seg button:has-text("ChatGPT")');
    await chatGptTab.click();
    await expect(cmdCode).toContainText('--client chatgpt');
    
    // Test the copy button tooltip overlay
    const copyBtn = page.locator('button[aria-label="Copy command"]');
    await copyBtn.click();
    const tooltip = page.locator('.copied-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Copied!');
  });

  // WIZ-T2-1
  test('WIZ-T2-1: License key activate button remains disabled with empty/whitespace input', async ({ page }) => {
    const input = page.locator('input[placeholder="paste your license key"]');
    const activateBtn = page.locator('button:has-text("Activate")');
    
    await input.fill('   ');
    await expect(activateBtn).toBeDisabled();
    await input.fill('');
    await expect(activateBtn).toBeDisabled();
  });

  // WIZ-T2-2
  test('WIZ-T2-2: Next and Back step navigation boundaries', async ({ page }) => {
    // Step 0: Back button should not exist
    await expect(page.locator('button:has-text("Back")')).not.toBeVisible();
    
    // Click skip/next (Step 0 is optional, so Skip this step is visible)
    const skipBtn = page.locator('button:has-text("Skip this step")');
    await skipBtn.click();
    
    // Now on step 2, Back button should be visible
    const backBtn = page.locator('button:has-text("Back")');
    await expect(backBtn).toBeVisible();
    
    // Click Back
    await backBtn.click();
    await expect(page.locator('.ad-wiz h2')).toContainText('License');
  });

  // WIZ-T2-3
  test('WIZ-T2-3: Setup phone step prevents verification submit with short code', async ({ page }) => {
    await page.locator('.ad-wiz-step').nth(3).click();
    const phoneInput = page.locator('input[placeholder="+1 555 000 0000"]');
    const sendBtn = page.locator('button:has-text("Send code")');
    
    await phoneInput.fill('+15551234567');
    await sendBtn.click();
    
    const codeInput = page.locator('input[placeholder="••••••"]');
    const verifyBtn = page.locator('button:has-text("Verify & link")');
    
    await codeInput.fill('12'); // too short
    await expect(verifyBtn).toBeDisabled();
  });

  // WIZ-T2-4
  test('WIZ-T2-4: Closing/skipping wizard via Close X button', async ({ page }) => {
    const closeBtn = page.locator('button[aria-label="Skip wizard"]');
    await closeBtn.click();
    
    // Wizard should disappear
    await expect(page.locator('.ad-wiz')).not.toBeVisible();
    
    // Verify LocalStorage flag set
    const flag = await page.evaluate(() => localStorage.getItem('aeg-dash-wizard-done'));
    expect(flag).toBe('1');
  });

  // WIZ-T2-5
  test('WIZ-T2-5: Finishing setup on step 5 redirects user to overview', async ({ page }) => {
    // Go to step 5
    await page.locator('.ad-wiz-step').nth(4).click();
    // Check that the stepper step is active (.is-active class)
    const fifthStep = page.locator('.ad-wiz-step').nth(4);
    await expect(fifthStep).toHaveClass(/is-active/);
    
    const finishBtn = page.locator('button:has-text("Finish setup")');
    await finishBtn.click();
    
    // Wizard should close
    await expect(page.locator('.ad-wiz')).not.toBeVisible();
    
    // Verify redirection to Overview page / Dashboard
    const topBarTitle = page.locator('header');
    await expect(topBarTitle).toContainText('Dashboard');
  });
});
