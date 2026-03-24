import { test, expect } from "@playwright/test";

// Requires the full stack running locally.
// Run: pnpm --filter @workspace/app-builder exec playwright test
// Set E2E_BASE_URL and E2E_SESSION_COOKIE env vars for authenticated tests.

const BASE_URL = process.env["E2E_BASE_URL"] || "http://localhost:5173";

test.describe("Basic chat → preview flow", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env["E2E_SESSION_COOKIE"]) {
      test.skip();
      return;
    }
    await page.context().addCookies([
      {
        name: "sid",
        value: process.env["E2E_SESSION_COOKIE"]!,
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("home page loads project list", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("h1, [data-testid='project-list']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("sends a message and receives a streaming response", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/project/new`);

    const chatInput = page
      .locator("textarea[placeholder], input[type='text']")
      .first();
    await chatInput.fill("בנה לי כפתור כחול");
    await chatInput.press("Enter");

    await expect(
      page
        .locator("[data-testid='ai-message'], .message-assistant, .ai-response")
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("preview iframe updates after generation", async ({ page }) => {
    await page.goto(`${BASE_URL}/project/new`);

    const chatInput = page.locator("textarea, input[type='text']").first();
    await chatInput.fill("צור דף HTML פשוט עם כותרת שלום עולם");
    await chatInput.press("Enter");

    const iframe = page.frameLocator("iframe").first();
    await expect(iframe.locator("body")).toBeVisible({ timeout: 45_000 });
  });
});
