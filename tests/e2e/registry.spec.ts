import { expect, test } from "@playwright/test";

import registry from "../../content/projects/registry.json";

const slugs = Object.keys(registry.projects);

test.describe("registry ↔ site (drift enumeration)", () => {
  test("every registry project has a detail page that renders", async ({ page }) => {
    for (const slug of slugs) {
      const res = await page.goto(`/projects/${slug}`);
      expect(res?.status(), `${slug} should return 200`).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1 }),
        `${slug} should render an <h1>`,
      ).toBeVisible();
    }
  });

  test("the gallery links to every registry project (count assertion)", async ({
    page,
  }) => {
    await page.goto("/projects");
    for (const slug of slugs) {
      await expect(
        page.locator(`a[href="/projects/${slug}"]`).first(),
        `gallery should link to ${slug}`,
      ).toBeVisible();
    }
  });
});

test.describe("role lenses", () => {
  test("home renders the default (all) lens featured set", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: /view this portfolio by role/i }),
    ).toBeVisible();
    for (const slug of registry.lenses.all.featured) {
      await expect(page.locator(`a[href="/projects/${slug}"]`).first()).toBeVisible();
    }
  });

  test("a lens re-ranks the featured set and titles the page", async ({ page }) => {
    await page.goto("/for/data-engineering");
    await expect(page).toHaveTitle(/Data Engineering/);
    await expect(
      page.locator('a[aria-current="page"]', { hasText: "Data Engineering" }),
    ).toBeVisible();
    for (const slug of registry.lenses["data-engineering"].featured) {
      await expect(page.locator(`a[href="/projects/${slug}"]`).first()).toBeVisible();
    }
  });

  test("the default lens and unknown lenses 404 under /for", async ({ page }) => {
    expect((await page.goto("/for/all"))?.status()).toBe(404);
    expect((await page.goto("/for/bogus-lens"))?.status()).toBe(404);
  });
});
