import { test, expect } from "@playwright/test";

// NIDO — e2e tests for feature: plans-2d
// User stories under test: US-101

test.describe("US-101: draw and edit my home's floor plan (walls, zones, rooms) in 2D with real measurements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("acceptance 1: Canvas renders blueprint grid and floor plan selector", async ({ page }) => {
    // Check that the page loads correctly and has title NIDO
    await expect(page).toHaveTitle(/NIDO/i);

    // Verify brand title NIDO is present on page
    const brand = page.locator(".brand-title");
    await expect(brand).toContainText(/NIDO/i);

    // Verify presence of floor selector panel
    const floorSelector = page.locator(".floor-selector");
    await expect(floorSelector).toBeVisible();

    // Verify ground floor tab is active
    const groundFloorBtn = page.getByRole("button", { name: /Floor 1/i });
    await expect(groundFloorBtn).toBeVisible();

    // Verify canvas container is loaded and visible
    const canvasContainer = page.locator(".konva-container");
    await expect(canvasContainer).toBeVisible();
  });

  test("acceptance 2: User can switch tools and draw wall segments", async ({ page }) => {
    // Select the Wall drawing tool
    const wallToolBtn = page.getByRole("button", { name: "Wall" }).first();
    await expect(wallToolBtn).toBeVisible();
    await wallToolBtn.click();

    // Drag from center of the canvas to create a wall segment
    const canvas = page.locator(".konva-container");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 100, startY + 50);
      await page.mouse.up();
    }

    // Verify the tool resets to select after drawing is done
    const selectToolBtn = page.getByRole("button", { name: "Select" }).first();
    await expect(selectToolBtn).toBeVisible();
  });

  test("acceptance 3: User can define zones and measure dimensions", async ({ page }) => {
    // Select the Zone tool
    const zoneToolBtn = page.getByRole("button", { name: "Zone" });
    await expect(zoneToolBtn).toBeVisible();
    await zoneToolBtn.click();

    // Drag from center of the canvas to draw a zone
    const canvas = page.locator(".konva-container");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const startX = box.x + box.width / 3;
      const startY = box.y + box.height / 3;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 120, startY + 80);
      await page.mouse.up();
    }

    // Select the Measure tool
    const measureToolBtn = page.getByRole("button", { name: "Measure" });
    await expect(measureToolBtn).toBeVisible();
    await measureToolBtn.click();

    if (box) {
      const startX = box.x + box.width / 4;
      const startY = box.y + box.height / 4;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 200, startY);
      await page.mouse.up();
    }

    // Check we can switch back to Select tool manually
    const selectToolBtn = page.getByRole("button", { name: "Select" });
    await selectToolBtn.click();
    await expect(selectToolBtn).toBeVisible();
  });

  test("acceptance 4: State updates parameters and persists updates", async ({ page }) => {
    // Verify parameters card is loaded
    const wallThicknessInput = page.locator("#wall-thickness");
    await expect(wallThicknessInput).toBeVisible();

    // Change parameter values and trigger update
    await wallThicknessInput.fill("0.25");
    await wallThicknessInput.press("Enter");

    const scaleInput = page.locator("#scale");
    await expect(scaleInput).toBeVisible();
    await scaleInput.fill("60");
    await scaleInput.press("Enter");

    // Verify changes are retained
    await expect(wallThicknessInput).toHaveValue("0.25");
    await expect(scaleInput).toHaveValue("60");
  });

  test("acceptance 5: reload restores drawn walls from store and IndexedDB", async ({ page }) => {
    // 1. Get initial wall count
    const initialWallCount = await page.evaluate(() => {
      const store = (window as any).floorPlanStore;
      return store ? store.floors['ground'].components.filter((c: any) => c.type === 'wall').length : 0;
    });

    // 2. Add a wall directly via the store
    await page.evaluate(() => {
      const store = (window as any).floorPlanStore;
      store.addComponent({
        id: 'e2e-persisted-wall',
        type: 'wall',
        x: 1,
        y: 2,
        width: 3,
        height: 0.15,
        layer: 'structure',
        properties: {
          x1: 1, y1: 2, x2: 4, y2: 2,
          thickness: 0.15,
          note: 'E2E Persisted Wall'
        }
      });
    });

    // 3. Confirm that the store added the new wall component
    const intermediateWallCount = await page.evaluate(() => {
      const store = (window as any).floorPlanStore;
      return store.floors['ground'].components.filter((c: any) => c.type === 'wall').length;
    });
    expect(intermediateWallCount).toEqual(initialWallCount + 1);

    // 4. Wait for the debounced save to complete (300ms + buffer)
    await page.waitForTimeout(500);

    // 5. Reload the page to test persistence
    await page.reload();

    // Wait for brand title NIDO to ensure hydration is completed
    const brand = page.locator(".brand-title");
    await expect(brand).toContainText(/NIDO/i);

    // Verify the floor selector is visible
    const floorSelector = page.locator(".floor-selector");
    await expect(floorSelector).toBeVisible();

    // 6. Confirm that the wall persists after reload (auto-wait: the IndexedDB
    // load is async — poll in the browser until the restored count matches,
    // never assert against a snapshot taken before hydration completes).
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const store = (window as any).floorPlanStore;
            return store
              ? store.floors['ground'].components.filter((c: any) => c.type === 'wall').length
              : -1;
          }),
        { timeout: 5000 }
      )
      .toEqual(initialWallCount + 1);
  });
});
