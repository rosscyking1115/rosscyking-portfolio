import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./helpers";

test.describe("about page", () => {
  test("renders bio, education timeline, and toolbox", async ({ page }) => {
    await page.goto("/about");

    // The page's single h1 is the positioning statement; the name sits in the
    // registration mark above it.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Cheng-Yuan King").first()).toBeVisible();
    await expect(page.getByText("Education", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "MSc Artificial Intelligence" }),
    ).toBeVisible();
    await expect(page.getByText("JLPT N1")).toBeVisible();
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/about");
    await expectNoA11yViolations(page);
  });
});
