import { test, expect } from '@playwright/test';

test.describe('Privacy Settings', () => {
  test('should display cookie consent banner', async ({ page }) => {
    await page.goto('/');

    const consentBanner = page.locator('[data-testid="cookie-consent"]');
    await expect(consentBanner).toBeVisible();
  });

  test('should allow accepting cookies', async ({ page }) => {
    await page.goto('/');

    const acceptButton = page.locator('[data-testid="accept-cookies"]');
    await acceptButton.click();

    const consentBanner = page.locator('[data-testid="cookie-consent"]');
    await expect(consentBanner).not.toBeVisible();
  });

  test('should toggle privacy mode in settings', async ({ page }) => {
    // Assuming user is logged in, navigate to settings
    await page.goto('/settings');

    const privacyToggle = page.locator('[data-testid="privacy-mode-toggle"]');
    await expect(privacyToggle).toBeVisible();

    // Toggle on
    await privacyToggle.check();
    await expect(privacyToggle).toBeChecked();

    // Toggle off
    await privacyToggle.uncheck();
    await expect(privacyToggle).not.toBeChecked();
  });
});
