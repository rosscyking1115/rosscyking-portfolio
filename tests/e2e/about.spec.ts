import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./helpers";

test.describe("about page", () => {
  test("renders bio, education timeline, and CV download link", async ({ page }) => {
    await page.goto("/about");

    await expect(
      page.getByRole("heading", { level: 1, name: /Cheng-Yuan/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Download CV/ })).toHaveAttribute(
      "href",
      "/cv.pdf",
    );
    await expect(
      page.getByRole("heading", { level: 2, name: "Education" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Languages" }),
    ).toBeVisible();
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/about");
    await expectNoA11yViolations(page);
  });
});
