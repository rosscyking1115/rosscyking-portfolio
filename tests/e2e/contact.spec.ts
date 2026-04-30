import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./helpers";

test.describe("contact page", () => {
  test("renders the form and shows validation errors when submitted empty", async ({
    page,
  }) => {
    await page.goto("/contact");

    await expect(
      page.getByRole("heading", { level: 1, name: /Get in touch/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Send message/ }).click();

    const alerts = await page.getByRole("alert").allTextContents();
    expect(alerts.length).toBeGreaterThan(0);
  });

  test("accepts a valid submission and clears the form", async ({ page }) => {
    await page.goto("/contact");

    // ID-based selectors avoid label matching ambiguity.
    const name = page.locator("#name");
    const email = page.locator("#email");
    const message = page.locator("#message");

    await name.fill("Playwright Test");
    await email.fill("test@example.com");
    await message.fill(
      "Hello, this is an automated end-to-end test of the contact form.",
    );

    await page.getByRole("button", { name: /Send message/ }).click();

    // Form clears = submission succeeded. If validation failed instead, we'd
    // see role=alert nodes; surface that as the test failure for clarity.
    await Promise.race([
      expect(name).toHaveValue("", { timeout: 10_000 }),
      expect(page.getByRole("alert")).toBeHidden({ timeout: 10_000 }),
    ]);

    await expect(name).toHaveValue("");
    await expect(email).toHaveValue("");
    await expect(message).toHaveValue("");
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/contact");
    await expectNoA11yViolations(page);
  });
});
