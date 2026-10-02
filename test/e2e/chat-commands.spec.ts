import { test, expect } from "@playwright/test";

test.describe("US-106: Chat commands for 2D/3D modifications", () => {
  test.beforeEach(async ({ page }) => {
    // skip onboarding
    await page.addInitScript(() => {
      window.localStorage.setItem('nido_onboarding_seen', 'true');
    });
    await page.goto("/");
  });

  test("acceptance 1: AI Chat can add a wall and then undo it", async ({ page }) => {
    // Open chat panel if not open
    const chatPanel = page.getByTestId("ai-chat-panel");
    if (!(await chatPanel.isVisible())) {
      await page.getByTestId("toggle-ai-chat").click();
    }

    // Type command
    const input = page.getByRole("textbox", { name: /comando/i, exact: false }).or(page.locator('input[type="text"]'));
    await input.fill("agrega una pared de 3 m al norte");
    await page.getByRole("button", { name: /enviar|send/i }).first().click();

    // Preview shows up
    const confirmBtn = page.getByRole("button", { name: /confirmar|confirm/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Check results output
    const logItem = page.getByTestId("ai-skill-result").filter({ hasText: "aplicado:" }).last();
    await expect(logItem).toBeVisible();

    // Verify wall is added: check store model lengths indirectly or undo enabling
    const undoBtn = page.getByRole("button", { name: /deshacer|undo/i }).first();
    await expect(undoBtn).toBeEnabled();

    // Type undo command instead of clicking button to generate log entry
    await input.fill("deshacer");
    await page.getByRole("button", { name: /enviar|send/i }).first().click();

    const undoLogItem = page.getByTestId("ai-skill-result").filter({ hasText: "deshacer:" }).last();
    await expect(undoLogItem).toBeVisible();
    await expect(undoLogItem).toContainText(/Hecho/i);
  });
});
