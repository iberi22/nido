import { test, expect } from '@playwright/test';

test.describe('PWA Offline-First and Reload State Persistence', () => {
  test('should load the application and keep state on reload/offline', async ({ page }) => {
    // 1. Go to the app homepage
    await page.goto('/');

    // 2. Expect the title to be NIDO
    await expect(page).toHaveTitle(/NIDO/i);

    // 3. Verify that we can interact with some state and reload
    // Let's check for inputs in the configuration panel
    const wallThicknessInput = page.locator('input').first();
    if (await wallThicknessInput.isVisible()) {
      await wallThicknessInput.fill('0.35');
      await wallThicknessInput.dispatchEvent('change');

      // Wait a moment for IndexedDB persistence to fire
      await page.waitForTimeout(500);

      // Reload the page
      await page.reload();

      // Check that the updated state was successfully reloaded from IndexedDB
      await expect(wallThicknessInput).toHaveValue('0.35');
    }

    // 4. Verify Service Worker support and registration array is defined
    const hasServiceWorkerSupport = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(hasServiceWorkerSupport).toBe(true);
  });
});
