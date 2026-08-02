import { expect, test } from "@playwright/test";

import registry from "../../content/projects/registry.json" with { type: "json" };

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

const lenses = registry.lenses as Record<string, { label: string; featured: string[] }>;

test.describe("hero", () => {
  test("renders the headline, availability and calls to action", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("main h1")).toContainText(
      "I work on AI evaluation and reliability.",
    );
    await expect(page.getByText(/Available for full-time roles/i)).toBeVisible();

    for (const label of ["View projects", "Download CV", "GitHub", "LinkedIn"]) {
      await expect(page.locator("main").getByRole("link", { name: label })).toBeVisible();
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

  test("each lens features exactly the projects the registry names", async ({ page }) => {
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
      // SCOPED TO THE RACK. Every InstrumentRow is an <article> too, so an
      // unscoped count now takes in the bench below and returns the whole
      // portfolio. The assertion was right about the wrong scope.
      await expect(panel.locator("[data-rack] article")).toHaveCount(
        lens.featured.length,
      );

      // And the bench holds exactly what the rack does not, so no project is
      // dropped between the two and none appears twice. This is the half that
      // makes "home shows work running, the index compares" checkable — a
      // project missing from BOTH used to be invisible.
      const benchCount = await panel.locator("[data-bench] [data-instrument]").count();
      expect(
        benchCount + lens.featured.length,
        `${key}: rack + bench does not add up to the portfolio`,
      ).toBe(Object.keys(registry.projects).length);
    }
  });

  test("exactly one instrument reads, and only it loads an image", async ({ page }) => {
    // TWO findings in one assertion, and the second is new.
    //
    // The original: the frame is the section's signature, and a project with
    // neither a screenshot nor terminal lines renders an EMPTY box — easy to
    // miss in review, and a real defect on the Next site (HANDOFF P3, item 4).
    // That still has to hold for whichever instrument is reading.
    //
    // The new one: §03 R7, "only the reading instrument loads an image". Every
    // featured project used to carry its own frame — four screenshots per lens,
    // twelve across the three prerendered panels. Nothing failed, because the
    // page looked fine; the cost was bytes and the flatness finding 08 named.
    for (const key of Object.keys(lenses)) {
      await page.goto(key === "all" ? "/" : `/?lens=${key}`);
      const panel = page.locator(`[data-lens-panel="${key}"]`);
      await expect(panel.locator("[data-rack] article")).not.toHaveCount(0);

      const framed = panel.locator("[data-rack] figure");
      await expect(
        framed,
        `${key}: ${await framed.count()} instruments are framed — R7 allows one`,
      ).toHaveCount(1);

      // …and that one is not an empty box.
      const hasImage = (await framed.locator("img").count()) > 0;
      const hasTerminal = (await framed.locator("p").count()) > 0;
      const title = await panel.locator("[data-rack] h3").first().textContent();
      expect(
        hasImage || hasTerminal,
        `${title?.trim()} has an empty evidence frame in the ${key} lens`,
      ).toBe(true);

      // Every other row keeps its title and its headline number at full
      // legibility — "receding removes the frame, the screenshot and the
      // elevation, never the readability."
      for (const row of await panel.locator("[data-instrument]").all()) {
        await expect(row.locator("h3")).not.toBeEmpty();
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
    await expect(page.getByRole("button", { name: lenses.ai!.label })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("screenshots are served responsively", async ({ page }) => {
    await page.goto("/");
    const image = page.locator('[data-lens-panel="all"] [data-rack] figure img').first();
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
