import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./helpers";

test.describe("projects gallery", () => {
  test("lists projects and supports stack filter", async ({ page }) => {
    await page.goto("/projects");

    await expect(page.getByRole("heading", { level: 1, name: /Projects/ })).toBeVisible();

    // Click the Python filter chip (a curated, multi-project stack tag).
    await page.getByRole("link", { name: "Python", exact: true }).first().click();
    await expect(page).toHaveURL(/\?stack=Python/);

    // Reset to all projects
    await page.getByRole("link", { name: "All", exact: true }).click();
    await expect(page).toHaveURL("/projects");
  });

  test("project detail page renders MDX content", async ({ page }) => {
    await page.goto("/projects");

    // Click into the Scalable ML project specifically — selector targets the
    // h3-level project card title, not a nav or filter link.
    await page.getByRole("link", { name: /Scalable ML/i }).click();

    await expect(page).toHaveURL(/\/projects\/scalable-machine-learning-pyspark/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Scalable ML/i }),
    ).toBeVisible();
    // The MDX body's first heading should render as h2.
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    // Newer/Older nav exists at the bottom.
    await expect(page.getByRole("link", { name: /All projects/ })).toBeVisible();
  });

  test("unknown slug shows 404", async ({ page }) => {
    const response = await page.goto("/projects/this-does-not-exist-12345");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/projects");
    await expectNoA11yViolations(page);
  });
});
