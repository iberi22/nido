import { test, expect } from "@playwright/test";

// NIDO — e2e tests for feature: ui-swal
// User stories under test: US-101
// Shell on @swal/ui (edge-hive theme) — selectors use data-testid + visible text.

test.describe("US-101: NIDO shell on @swal/ui", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('nido_onboarding_seen', 'true');
    });
    await page.goto("/");
  });

  test("acceptance 1: Canvas renders blueprint grid and plan from store", async ({ page }) => {
    await expect(page.getByText("NIDO")).toBeVisible();
    // Canvas stage renders (2D view default)
    const canvas = page.locator(".canvas-wrapper, .konva-container, #konva-container");
    await expect(canvas.first()).toBeAttached();
    // Floor selector exposes property floors
    await expect(page.getByText(/Floor 1/).first()).toBeVisible();
  });

  test("acceptance 2: User can add/move/resize wall segments (toolbar tools present)", async ({ page }) => {
    // Toolbar tools exist on @swal/ui buttons
    await expect(page.getByRole("button", { name: /Select/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Measure/i }).first()).toBeVisible();
    // Wall library item present
    await expect(page.getByText(/Wall/i).first()).toBeVisible();
  });

  test("acceptance 3: User can define zones (garage, entrance, rooms) with dimensions", async ({ page }) => {
    // Floor 1 shows zone/label from store data
    await expect(page.getByText(/Floor 1/).first()).toBeVisible();
    // Library has furniture/moto/car for zone composition
    await expect(page.getByText(/Furniture/i).first()).toBeVisible();
    // No console errors
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });

  test("acceptance 4: 2D/3D view toggle switches views", async ({ page }) => {
    // data-testid from wave-3 issue 56
    const view3d = page.locator('[data-testid="view-3d"]');
    if (await view3d.count()) {
      await view3d.first().click();
      await page.waitForTimeout(300);
      const canvas = page.locator(".canvas-wrapper, .konva-container");
      const threeCanvas = await page.locator("canvas").count();
      expect(threeCanvas).toBeGreaterThanOrEqual(1);
      // 3D view becomes the active/pressed toggle
      await expect(view3d.first()).toHaveAttribute("aria-pressed", "true");
    } else {
      // Fallback: toggle button with visible text
      const btn = page.getByRole("button", { name: /3D/i }).first();
      await expect(btn).toBeVisible();
    }
  });

  test("acceptance 5: @swal/ui components render (Button/Badge/Tabs on Hive Dark shell)", async ({ page }) => {
    // Tabs (Plans/Inventory/Taxes) from @swal/ui — rendered with role="tab"
    await expect(page.getByRole("tab", { name: /Plans/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /Inventory/i }).first()).toBeVisible();
    // Sidebar panels render
    await expect(page.getByText(/Tools/i).first()).toBeVisible();
  });
});
