import { expect, test } from "@playwright/test";

import registry from "../../../content/projects/registry.json" with { type: "json" };

/**
 * Home page gate (Phase B2).
 *
 * The proof strip and the featured sets are both computed from
 * content/projects/registry.json at build time — the whole point being that
 * they cannot drift from the project set. These assertions recompute the same
 * numbers from the same file, so a card or a metric going stale fails here.
 */

interface ProjectSpec {
  status: string;
  demo: string | null;
  metrics?: Record<string, string>;
}

const projects = Object.values(registry.projects) as ProjectSpec[];
const shipped = projects.filter((p) => p.status === "shipped");
const expectedTests = shipped.reduce((sum, project) => {
  for (const [label, value] of Object.entries(project.metrics ?? {})) {
    if (!/test/i.test(label)) continue;
    const n = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}, 0);

const lenses = registry.lenses as Record<
  string,
  { label: string; featured: string[] }
>;

test.describe("hero", () => {
  test("renders the headline, availability and calls to action", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("main h1")).toContainText(
      "I turn ambiguous data and AI problems into",
    );
    await expect(page.getByText(/Available for full-time roles/i)).toBeVisible();

    for (const label of ["View projects", "Download CV", "GitHub", "LinkedIn"]) {
      await expect(
        page.locator("main").getByRole("link", { name: label }),
      ).toBeVisible();
    }
  });

  test("the proof strip matches the registry, recomputed independently", async ({
    page,
  }) => {
    await page.goto("/");
    const strip = page.locator("[data-proof-strip]");
    await expect(strip).toBeVisible();

    // Recomputed from the registry rather than hardcoded, so this stays true as
    // projects are added — but still fails if the page stops reading the
    // registry and starts hardcoding numbers of its own.
    await expect(strip).toContainText(`${shipped.length} projects shipped`);
    await expect(strip).toContainText(
      `${expectedTests.toLocaleString("en-GB")} tests across them`,
    );
    await expect(strip).toContainText(
      `${shipped.filter((p) => p.demo).length} live demos`,
    );
  });
});

test.describe("featured showcase", () => {
  test("renders one panel per lens and shows only the default", async ({ page }) => {
    await page.goto("/");

    const panels = page.locator("[data-lens-panel]");
    await expect(panels).toHaveCount(Object.keys(lenses).length);
    await expect(page.locator('[data-lens-panel="all"]')).toBeVisible();
    await expect(page.locator('[data-lens-panel="data"]')).toBeHidden();
    await expect(page.locator('[data-lens-panel="ai"]')).toBeHidden();
  });

  test("each lens features exactly the projects the registry names", async ({
    page,
  }) => {
    for (const [key, lens] of Object.entries(lenses)) {
      await page.goto(key === "all" ? "/" : `/?lens=${key}`);
      const panel = page.locator(`[data-lens-panel="${key}"]`);
      await expect(panel).toBeVisible();

      for (const slug of lens.featured) {
        await expect(
          panel.locator(`a[href="/projects/${slug}"]`).first(),
          `${key} should feature ${slug}`,
        ).toBeVisible();
      }
      // The heading counts what is actually shown, so a dropped card is loud.
      await expect(panel.locator("[data-lens-headline]")).toContainText(
        "projects, shown working",
      );
      await expect(panel.locator("article")).toHaveCount(lens.featured.length);
    }
  });

  test("every featured card has a visual — no empty evidence frames", async ({
    page,
  }) => {
    // The frame is the section's signature. A project with neither a screenshot
    // nor terminal lines renders an empty box, which is easy to miss in review
    // and was a real defect on the Next site (HANDOFF P3, item 4).
    for (const key of Object.keys(lenses)) {
      await page.goto(key === "all" ? "/" : `/?lens=${key}`);
      const panel = page.locator(`[data-lens-panel="${key}"]`);

      // Wait for the panel to actually render before counting anything —
      // .count() does not retry, so a mid-render read looks like "no visual".
      await expect(panel.locator("article")).not.toHaveCount(0);

      for (const card of await panel.locator("article").all()) {
        const title = await card.locator("h3").textContent();
        const hasImage = (await card.locator("figure img").count()) > 0;
        const hasTerminal = (await card.locator("figure p").count()) > 0;
        expect(
          hasImage || hasTerminal,
          `${title?.trim()} has an empty evidence frame in the ${key} lens`,
        ).toBe(true);
      }
    }
  });

  test("switching lens re-ranks in place and updates the URL", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: lenses.ai!.label }).click();

    await expect(page.locator("html")).toHaveAttribute("data-lens", "ai");
    await expect(page).toHaveURL(/\?lens=ai$/);
    await expect(page.locator('[data-lens-panel="ai"]')).toBeVisible();
    await expect(page.locator('[data-lens-panel="all"]')).toBeHidden();
    await expect(
      page.getByRole("button", { name: lenses.ai!.label }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("screenshots are served responsively", async ({ page }) => {
    await page.goto("/");
    const image = page.locator('[data-lens-panel="all"] figure img').first();
    await expect(image).toBeVisible();
    // Astro optimises these because they are imported, not served from public/.
    // Losing the import would silently drop srcset and ship full-size PNGs.
    await expect(image).toHaveAttribute("srcset", /.+/);
  });
});

test.describe("information architecture", () => {
  test("the skills list is not duplicated on the home page", async ({ page }) => {
    // Ross's Phase 0 call (2026-07-27): show it once, on /about. The Next home
    // page rendered the same `skillGroups` as the About Toolbox aside.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /toolbox/i })).toHaveCount(0);
  });
});
