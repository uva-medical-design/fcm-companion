import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Log in as Demo Student by clicking the "Try as Demo Student" button
 * on the login page. This uses the app's own auth flow, which properly
 * sets user context + localStorage before navigating.
 */
async function loginAsDemoStudent(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Click "Try as Demo Student" button — this sets user context and navigates to /practice
  await page.getByRole("button", { name: /demo/i }).click();

  // Wait for the app to navigate after login
  await expect(page).toHaveURL(/\/practice/, { timeout: 10_000 });
}

/**
 * Navigate to a student page using the sidebar/bottom nav links.
 * This uses Next.js client-side routing (preserves React context)
 * instead of page.goto() which does a full reload and loses state.
 */
async function navigateViaNav(
  page: import("@playwright/test").Page,
  label: string,
  urlPattern: RegExp
) {
  // Click the nav link — use first() in case both desktop sidebar and mobile nav are in DOM
  await page.getByRole("link", { name: label, exact: true }).first().click();
  await expect(page).toHaveURL(urlPattern, { timeout: 10_000 });
  await page.waitForLoadState("networkidle");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Login page", () => {
  test("loads and shows the roster picker", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Title should be visible
    await expect(page.getByText("FCM Companion")).toBeVisible();

    // Either the roster select or the loading / error state should appear.
    // We check that the page did not blow up with an unhandled error.
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");

    // The "Try as Demo Student" button is always rendered
    await expect(page.getByRole("button", { name: /demo/i })).toBeVisible();
  });

  test("shows student names in roster when loaded", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // If Supabase is available the select trigger shows "Select your name"
    const trigger = page.getByRole("combobox");
    const hasRoster = await trigger.isVisible().catch(() => false);

    if (hasRoster) {
      // Open the select to verify names appear
      await trigger.click();

      // At least one known student name should be in the dropdown
      const knownNames = [
        "Matt",
        "Derek",
        "Kevin",
        "Danielle",
        "Farah",
        "Maddie",
        "Christopher",
        "Joselyne",
      ];

      const dropdownText = await page.locator("[role='listbox']").textContent();
      const found = knownNames.some(
        (name) => dropdownText && dropdownText.includes(name)
      );
      expect(found).toBe(true);
    }
  });

  test("clicking Continue after selecting a student navigates to /cases", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const trigger = page.getByRole("combobox");
    const hasRoster = await trigger.isVisible().catch(() => false);

    if (hasRoster) {
      // Open dropdown and pick the first option
      await trigger.click();
      const firstOption = page.locator("[role='option']").first();
      await firstOption.click();

      // Click Continue
      await page.getByRole("button", { name: /continue/i }).click();

      // Should have navigated to /cases or /dashboard depending on role
      await expect(page).toHaveURL(/\/(cases|dashboard)/, { timeout: 10_000 });
    }
  });
});

test.describe("Student navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoStudent(page);
  });

  test("Practice page loads after demo login", async ({ page }) => {
    // loginAsDemoStudent already verified we're on /practice
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).not.toContain("Application error");

    // The practice library should show case cards or a search input
    const hasSearchOrCases =
      (await page.locator("input").count()) > 0 ||
      (await page.locator("[data-slot='card']").count()) > 0 ||
      (body && body.toLowerCase().includes("case"));
    expect(hasSearchOrCases).toBe(true);
  });

  test("Navigate to Cases via nav link", async ({ page }) => {
    await navigateViaNav(page, "Cases", /\/cases/);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).not.toContain("Application error");
  });

  test("Navigate to OSCE Prep via nav link", async ({ page }) => {
    await navigateViaNav(page, "OSCE Prep", /\/osce/);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).not.toContain("Application error");
  });

  test("Navigate to Plan Ahead via nav link", async ({ page }) => {
    await navigateViaNav(page, "Plan Ahead", /\/plan/);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).not.toContain("Application error");
  });

  test("Navigate to Notes via nav link", async ({ page }) => {
    await navigateViaNav(page, "Notes", /\/notes/);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).not.toContain("Application error");
  });

  test("Navigate to Design Lab via nav link", async ({ page }) => {
    await navigateViaNav(page, "Design Lab", /\/design-lab/);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).not.toContain("Application error");
  });

  test("Navigate to Resources via nav link", async ({ page }) => {
    await navigateViaNav(page, "Resources", /\/reference/);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).not.toContain("Application error");
  });
});
