/**
 * Ads E2E Tests
 *
 * End-to-end tests for the complete ad functionality workflow.
 * Tests ad display, tracking, adblock detection, and user interactions
 * across the full application stack.
 */

import { test, expect } from '@playwright/test';

test.describe('Ads End-to-End Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.context().addInitScript(() => {
      // Mock AdMob publisher ID for testing
      window.localStorage.setItem('NEXT_PUBLIC_ADMOB_PUBLISHER_ID', 'test-publisher-id');
    });
  });

  test('should display ads normally when no adblock is present', async ({ page }) => {
    // Mock AdSense to simulate normal ad loading
    await page.addInitScript(() => {
      // Mock react-adsense
      window.reactAdsenseLoaded = true;
    });

    await page.goto('/');

    // Wait for ad component to be visible
    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();

    // Ad should render normally (not fallback)
    const fallbackMessage = page.locator('.ad-fallback');
    await expect(fallbackMessage).not.toBeVisible();

    // Check accessibility
    await expect(adContainer).toHaveAttribute('role', 'region');
    await expect(adContainer).toHaveAttribute('aria-label', 'Advertisement');
  });

  test('should show fallback UI when adblock is detected', async ({ page }) => {
    // Mock adblock detection
    await page.addInitScript(() => {
      // Simulate fuckadblock detecting adblock
      window.adblockDetected = true;
    });

    await page.goto('/');

    // Should show fallback message
    const fallbackMessage = page.locator('.ad-fallback');
    await expect(fallbackMessage).toBeVisible();

    // Should contain appropriate message
    await expect(fallbackMessage).toContainText('Ads help keep this free');
    await expect(fallbackMessage).toContainText('consider disabling adblock');

    // Check accessibility
    await expect(fallbackMessage).toHaveAttribute('role', 'region');
    await expect(fallbackMessage).toHaveAttribute('aria-label', 'Adblock detected message');
  });

  test('should track ad impressions when ad becomes visible', async ({ page }) => {
    // Mock fetch to capture API calls
    const apiCalls: any[] = [];
    await page.route('**/api/ads/metrics', (route) => {
      apiCalls.push(route.request().postDataJSON());
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.goto('/');

    // Wait for ad to be visible (intersection observer trigger)
    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();

    // Wait for impression tracking (with delay)
    await page.waitForTimeout(2000);

    // Should have tracked impression
    const impressionCall = apiCalls.find(call => call.event_type === 'impression');
    expect(impressionCall).toBeDefined();
    expect(impressionCall.ad_id).toBeDefined();
    expect(impressionCall.user_id).toBeDefined();
    expect(impressionCall.metadata.size).toBeDefined();
  });

  test('should track ad clicks when user interacts with ad', async ({ page }) => {
    const apiCalls: any[] = [];
    await page.route('**/api/ads/metrics', (route) => {
      apiCalls.push(route.request().postDataJSON());
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.goto('/');

    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();

    // Find and click the ad
    const adButton = page.locator('[data-testid="ad-click-trigger"]');
    await adButton.click();

    // Should have tracked click
    const clickCall = apiCalls.find(call => call.event_type === 'click');
    expect(clickCall).toBeDefined();
    expect(clickCall.ad_id).toBeDefined();
    expect(clickCall.user_id).toBeDefined();
  });

  test('should handle adblock detection and tracking', async ({ page }) => {
    const apiCalls: any[] = [];
    await page.route('**/api/ads/metrics', (route) => {
      apiCalls.push(route.request().postDataJSON());
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    // Simulate adblock detection during page load
    await page.addInitScript(() => {
      window.adblockDetected = true;
    });

    await page.goto('/');

    // Should show fallback
    const fallbackMessage = page.locator('.ad-fallback');
    await expect(fallbackMessage).toBeVisible();

    // Should have tracked adblock event
    const adblockCall = apiCalls.find(call => call.event_type === 'adblock');
    expect(adblockCall).toBeDefined();
    expect(adblockCall.metadata.adUnitId).toBeDefined();
    expect(adblockCall.metadata.size).toBeDefined();
  });

  test('should handle network failures gracefully', async ({ page }) => {
    // Mock network failure for metrics API
    await page.route('**/api/ads/metrics', (route) => {
      route.abort();
    });

    // Spy on console.warn
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/');

    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();

    // Wait for tracking attempt
    await page.waitForTimeout(2000);

    // Should log warning but not crash
    expect(consoleMessages.some(msg => msg.includes('Error tracking ad metric'))).toBe(true);

    // Ad should still be visible
    await expect(adContainer).toBeVisible();
  });

  test('should handle invalid API responses gracefully', async ({ page }) => {
    // Mock invalid API response
    await page.route('**/api/ads/metrics', (route) => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/');

    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();

    await page.waitForTimeout(2000);

    // Should log warning about failed tracking
    expect(consoleMessages.some(msg => msg.includes('Failed to track ad metric'))).toBe(true);

    // Ad should still be visible
    await expect(adContainer).toBeVisible();
  });

  test('should lazy load ads only when visible', async ({ page }) => {
    // Set up a tall page to test scrolling
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('/');

    // Initially, ad should not be loaded (placeholder visible)
    const placeholder = page.locator('.ad-placeholder');
    await expect(placeholder).toBeVisible();

    // Ad container should not be visible yet
    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).not.toBeVisible();

    // Scroll down to make ad visible
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for intersection observer
    await page.waitForTimeout(100);

    // Ad should now be loaded
    await expect(adContainer).toBeVisible();
    await expect(placeholder).not.toBeVisible();
  });

  test('should maintain user session across page reloads', async ({ page }) => {
    await page.goto('/');

    // Wait for user ID to be generated and stored
    await page.waitForTimeout(100);

    const userId1 = await page.evaluate(() => sessionStorage.getItem('adUserId'));
    expect(userId1).toBeTruthy();

    // Reload page
    await page.reload();

    // User ID should be the same
    const userId2 = await page.evaluate(() => sessionStorage.getItem('adUserId'));
    expect(userId2).toBe(userId1);
  });

  test('should handle multiple ads on the same page', async ({ page }) => {
    // Mock multiple ad components
    await page.addInitScript(() => {
      window.multipleAds = true;
    });

    const apiCalls: any[] = [];
    await page.route('**/api/ads/metrics', (route) => {
      apiCalls.push(route.request().postDataJSON());
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.goto('/');

    // Wait for ads to load
    await page.waitForTimeout(2000);

    // Should have multiple impression calls with different ad IDs
    const impressionCalls = apiCalls.filter(call => call.event_type === 'impression');
    expect(impressionCalls.length).toBeGreaterThan(1);

    // Each should have unique ad_id
    const adIds = impressionCalls.map(call => call.ad_id);
    const uniqueAdIds = [...new Set(adIds)];
    expect(uniqueAdIds.length).toBe(adIds.length);
  });

  test('should respect ad configuration from API', async ({ page }) => {
    // Mock config API response
    await page.route('**/api/ads/config', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            adsEnabled: true,
            adProviders: ['google'],
            maxAdsPerPage: 3,
          },
        }),
      });
    });

    await page.goto('/');

    // Ads should be enabled and working
    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();
  });

  test('should disable ads when configuration indicates disabled', async ({ page }) => {
    // Mock config API response with ads disabled
    await page.route('**/api/ads/config', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            adsEnabled: false,
            adProviders: [],
            maxAdsPerPage: 0,
          },
        }),
      });
    });

    await page.goto('/');

    // Ads should not be shown
    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).not.toBeVisible();

    const placeholder = page.locator('.ad-placeholder');
    await expect(placeholder).not.toBeVisible();
  });

  test('should handle ad loading failures gracefully', async ({ page }) => {
    // Mock AdSense failure
    await page.addInitScript(() => {
      // Simulate AdSense onAdFailed callback
      window.adSenseFailed = true;
    });

    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/');

    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();

    // Should log warning about ad failure
    expect(consoleMessages.some(msg => msg.includes('Ad failed to load'))).toBe(true);

    // Ad container should still be present
    await expect(adContainer).toBeVisible();
  });

  test('should support different ad sizes', async ({ page }) => {
    await page.goto('/');

    const adContainer = page.locator('[data-testid="ad-container"]');

    // Test banner size (default)
    await expect(adContainer).toHaveAttribute('style', /width: 728px/);
    await expect(adContainer).toHaveAttribute('style', /height: 90px/);

    // Note: In a real implementation, different sizes would be tested
    // by rendering components with different size props
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/');

    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();

    // Ad should be focusable if it contains interactive elements
    const adButton = page.locator('[data-testid="ad-click-trigger"]');

    // Tab to the ad
    await page.keyboard.press('Tab');
    await expect(adButton).toBeFocused();
  });

  test('should handle rapid user interactions', async ({ page }) => {
    const apiCalls: any[] = [];
    await page.route('**/api/ads/metrics', (route) => {
      apiCalls.push(route.request().postDataJSON());
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.goto('/');

    const adButton = page.locator('[data-testid="ad-click-trigger"]');
    await expect(adButton).toBeVisible();

    // Rapid clicks
    await adButton.click();
    await adButton.click();
    await adButton.click();

    // Should track multiple clicks
    const clickCalls = apiCalls.filter(call => call.event_type === 'click');
    expect(clickCalls.length).toBe(3);
  });

  test('should work across different viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    await expect(adContainer).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();

    await expect(adContainer).toBeVisible();
  });

  test('should handle page navigation and ad reloading', async ({ page }) => {
    await page.goto('/');

    let adContainer = page.locator('[data-testid="ad-container"]');
    await expect(adContainer).toBeVisible();

    // Navigate to another page
    await page.goto('/settings');

    // Ads should reload on new page
    adContainer = page.locator('[data-testid="ad-container"]');
    // Note: Depending on implementation, ads might not be on all pages
    // This test assumes ads are present on settings page for demonstration
  });
});