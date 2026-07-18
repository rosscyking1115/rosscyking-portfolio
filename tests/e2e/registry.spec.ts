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

test.describe("role lenses (in-place switcher)", () => {
  test("home renders the default (all) lens featured set", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("group", { name: /view this portfolio by role/i }),
    ).toBeVisible();
    for (const slug of registry.lenses.all.featured) {
      await expect(page.locator(`a[href="/projects/${slug}"]`).first()).toBeVisible();
    }
  });

  test("clicking a lens re-ranks the featured set in place", async ({ page }) => {
    await page.goto("/");
    // community-energy-flex is featured under `all` but not `data-engineering`;
    // neobank is the reverse — a clean before/after pair.
    await expect(
      page.locator('a[href="/projects/community-energy-flex"]').first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Data Engineering" }).click();

    await expect(page).toHaveURL(/\?lens=data-engineering/);
    await expect(
      page.getByRole("button", { name: "Data Engineering", pressed: true }),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/projects/neobank-product-analytics"]').first(),
    ).toBeVisible();
    await expect(page.locator('a[href="/projects/community-energy-flex"]')).toHaveCount(
      0,
    );
  });

  test("a shared ?lens= URL renders that lens on load", async ({ page }) => {
    await page.goto("/?lens=ai-safety");
    await expect(
      page.getByRole("button", { name: "AI Safety & Evaluation", pressed: true }),
    ).toBeVisible();
    for (const slug of registry.lenses["ai-safety"].featured) {
      await expect(page.locator(`a[href="/projects/${slug}"]`).first()).toBeVisible();
    }
  });

  test("old /for/<lens> links redirect to the home lens", async ({ page }) => {
    await page.goto("/for/analytics-engineering");
    await expect(page).toHaveURL(/\/\?lens=analytics-engineering$/);
    for (const slug of registry.lenses["analytics-engineering"].featured) {
      await expect(page.locator(`a[href="/projects/${slug}"]`).first()).toBeVisible();
    }
  });
});
