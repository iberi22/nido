import { test as it, expect } from '@playwright/test';

it.describe('Edge-Mesh Sync Store E2E Tests', () => {

  it('should initialize with a mesh client and trigger save publish', async ({ page }) => {
    // 1. Inject the mock test client using page.addInitScript
    await page.addInitScript(() => {
      (window as any).nidoTestMeshClientEnabled = true;
      (window as any).nidoLastPublishedState = null;
      (window as any).nidoTestMeshClient = {
        namespace: 'swal/nido/test-instance-e2e',
        isConnected: true,
        publishPresence: (presence: string) => {
          (window as any).nidoLastPresence = presence;
        },
        publishState: (namespace: string, state: any) => {
          (window as any).nidoLastPublishedState = state;
        },
        onStateUpdate: (cb: any) => {
          (window as any).nidoTriggerIncomingState = cb;
        }
      };
    });

    // 2. Load page
    await page.goto('/');

    // 3. Verify NIDO loads
    await expect(page).toHaveTitle(/NIDO/i);

    // 4. Trigger state change on the UI (e.g. scale input or wall thickness input)
    const wallThicknessInput = page.locator('input#wall-thickness');
    await expect(wallThicknessInput).toBeVisible();

    await wallThicknessInput.fill('0.25');
    await wallThicknessInput.dispatchEvent('change');

    // 5. Wait for the debounce save / intervals to fire
    await page.waitForTimeout(800);

    // 6. Verify that publishState was called with the updated wallThickness config
    const lastPublished = await page.evaluate(() => {
      return (window as any).nidoLastPublishedState;
    });

    expect(lastPublished).toBeTruthy();
    expect(lastPublished.config.wallThickness).toBe(0.25);
  });

  it('should reactively merge incoming mesh state updates', async ({ page }) => {
    // 1. Inject the mock test client using page.addInitScript
    await page.addInitScript(() => {
      (window as any).nidoTestMeshClientEnabled = true;
      (window as any).nidoLastPublishedState = null;
      (window as any).nidoTestMeshClient = {
        namespace: 'swal/nido/test-instance-e2e',
        isConnected: true,
        publishPresence: (presence: string) => {
          (window as any).nidoLastPresence = presence;
        },
        publishState: (namespace: string, state: any) => {
          (window as any).nidoLastPublishedState = state;
        },
        onStateUpdate: (cb: any) => {
          (window as any).nidoTriggerIncomingState = cb;
        }
      };
    });

    // 2. Load page
    await page.goto('/');

    // 3. Verify input is visible
    const wallThicknessInput = page.locator('input#wall-thickness');
    await expect(wallThicknessInput).toBeVisible();

    // 4. Simulate receiving a state update via the mesh client
    await page.evaluate(() => {
      const trigger = (window as any).nidoTriggerIncomingState;
      if (trigger) {
        trigger({
          currentFloorId: 'ground',
          zoom: 175,
          updatedAt: Date.now() + 100000,
          config: {
            wallThickness: 0.45,
            scale: 60,
            plot: { width: 6, height: 26, margin: 100 },
            colors: {}
          },
          floors: {}
        });
      }
    });

    // 5. Verify the UI reacted and shows the incoming wall thickness value
    await expect(wallThicknessInput).toHaveValue('0.45');
  });

  it('should queue state updates while offline and flush them upon reconnection', async ({ page, context }) => {
    // 1. Inject mock client with dynamic isConnected reflecting navigator.onLine
    await page.addInitScript(() => {
      (window as any).nidoTestMeshClientEnabled = true;
      (window as any).nidoLastPublishedState = null;
      (window as any).nidoPublishHistory = [];
      (window as any).nidoTestMeshClient = {
        namespace: 'swal/nido/test-instance-offline',
        get isConnected() {
          return navigator.onLine;
        },
        publishPresence: (presence: string) => {
          (window as any).nidoLastPresence = presence;
        },
        publishState: (namespace: string, state: any) => {
          (window as any).nidoLastPublishedState = state;
          if (!(window as any).nidoPublishHistory) {
            (window as any).nidoPublishHistory = [];
          }
          (window as any).nidoPublishHistory.push(state);
        },
        onStateUpdate: (cb: any) => {
          (window as any).nidoTriggerIncomingState = cb;
        }
      };
    });

    // 2. Load page
    await page.goto('/');

    // 3. Verify NIDO loads
    await expect(page).toHaveTitle(/NIDO/i);

    // 4. Force browser context offline
    await context.setOffline(true);
    await page.waitForTimeout(500); // let intervals update status

    // 5. Make a change on the UI while offline
    const wallThicknessInput = page.locator('input#wall-thickness');
    await expect(wallThicknessInput).toBeVisible();

    await wallThicknessInput.fill('0.85');
    await wallThicknessInput.dispatchEvent('change');

    // Wait a bit to ensure it is saved/queued and NOT published
    await page.waitForTimeout(800);

    // Verify nothing was published with 0.85 during offline state
    const publishedBeforeReconnect = await page.evaluate(() => {
      const history = (window as any).nidoPublishHistory || [];
      return history.some((s: any) => s.config?.wallThickness === 0.85);
    });
    expect(publishedBeforeReconnect).toEqual(false);

    // 6. Go back online
    await context.setOffline(false);

    // Wait for the sync reconnect interval (every 300ms) to fire and flush
    await page.waitForTimeout(800);

    // Verify it was successfully flushed and published
    const lastPublished = await page.evaluate(() => {
      return (window as any).nidoLastPublishedState;
    });

    expect(lastPublished).toBeTruthy();
    expect(lastPublished.config.wallThickness).toBe(0.85);
  });
});
