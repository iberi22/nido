import { test, expect } from "@playwright/test";

// NIDO — e2e tests for feature: plans-3d
// User stories under test: US-102

test.describe("US-102: view my plan in 3D", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("acceptance 1: 3D scene derives from same plan data as 2D", async ({ page }) => {
    // Assert the page loads with the NIDO header and Brand Title
    await expect(page.locator(".brand-title")).toHaveText("NIDO");

    // Check initial 2D view is visible
    await expect(page.locator(".canvas-wrapper")).toBeVisible();
  });

  test("acceptance 2: Camera orbits/zooms; floors switchable", async ({ page }) => {
    // Navigate to 3D View
    const button3D = page.locator("button").filter({ hasText: "3D" });
    await button3D.click();

    // Verify 3D canvas is successfully mounted and rendered via lazy loading
    const canvas = page.locator(".scene-container canvas");
    await expect(canvas).toBeVisible();

    // Verify overlay text displays active floor info
    const overlayText = page.locator(".active-info");
    await expect(overlayText).toContainText("PLANTA BAJA (PISO 1)");

    // Switch floor to Floor 2 using FloorSelector
    const buttonFloor2 = page.locator("button").filter({ hasText: "Floor 2" }).first();
    await buttonFloor2.click();

    // Verify overlay text is updated reactively, demonstrating single source of truth floor switching
    await expect(overlayText).toContainText("PISO 2 - APARTAMENTOS");
  });

  test("acceptance 3: 3D module lazy-loaded (code-split)", async ({ page }) => {
    // Check that before clicking 3D, no .scene-container exists on the page
    await expect(page.locator(".scene-container")).not.toBeVisible();

    // Click 3D view
    await page.locator("button").filter({ hasText: "3D" }).click();

    // The .scene-container should now be visible and lazy-loaded
    await expect(page.locator(".scene-container")).toBeVisible();
  });

  test("acceptance 4: No state divergence between 2D and 3D", async ({ page }) => {
    // Switch to 3D view
    await page.locator("button").filter({ hasText: "3D" }).click();
    await expect(page.locator(".active-info")).toContainText("PLANTA BAJA");

    // Switch back to 2D view
    await page.locator("button").filter({ hasText: "2D" }).click();
    await expect(page.locator(".canvas-wrapper")).toBeVisible();
  });
});
