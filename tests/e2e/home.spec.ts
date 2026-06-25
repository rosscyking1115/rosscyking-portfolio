import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./helpers";

test.describe("home page", () => {
  test("renders the hero, projects strip, and skills cluster", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /measurable systems/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Four projects/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /How I work/i }),
    ).toBeVisible();
  });

  test("primary CTAs link to /projects and the CV", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "View projects" }).first(),
    ).toHaveAttribute("href", "/projects");
    await expect(page.getByRole("link", { name: /Download CV/ }).first()).toHaveAttribute(
      "href",
      "/cv.pdf",
    );
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/");
    await expectNoA11yViolations(page);
  });
});
