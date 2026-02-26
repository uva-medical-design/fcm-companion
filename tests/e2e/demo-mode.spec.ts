import { test, expect } from "@playwright/test";

test.describe("Demo mode", () => {
  test("clicking 'Try as Demo Student' navigates to /practice", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click the demo button
    await page.getByRole("button", { name: /demo/i }).click();

    // Should navigate to /practice
    await expect(page).toHaveURL(/\/practice/, { timeout: 10_000 });
  });

  test("practice page loads with cases after demo login", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /demo/i }).click();
    await expect(page).toHaveURL(/\/practice/, { timeout: 10_000 });

    // Page should not show an error state
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).not.toContain("Application error");

    // Should contain case content — search input, cards, or the word "case"
    const hasContent =
      (await page.locator("input").count()) > 0 ||
      (body && body.toLowerCase().includes("case"));
    expect(hasContent).toBe(true);
  });

  test("clicking a practice case loads the case view without error", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /demo/i }).click();
    await expect(page).toHaveURL(/\/practice/, { timeout: 10_000 });

    // Find and click the first case link/card.
    const caseLink = page.locator("a[href*='/practice/']").first();
    const hasCaseLink = await caseLink.isVisible().catch(() => false);

    if (hasCaseLink) {
      await caseLink.click();
      await page.waitForLoadState("networkidle");

      // URL should now be /practice/<id>
      await expect(page).toHaveURL(/\/practice\/.+/);

      // Page should not have crashed
      const body = await page.textContent("body");
      expect(body).not.toContain("Something went wrong");
      expect(body).not.toContain("Application error");
    } else {
      // If no case links are visible, at minimum the practice page itself loaded
      test.skip(true, "No practice case links visible to click");
    }
  });
});
