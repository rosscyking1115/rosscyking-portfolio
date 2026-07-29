import { expect, test } from "@playwright/test";

import registry from "../../../content/projects/registry.json" with { type: "json" };

/**
 * Projects gallery and write-up gate (Phase B).
 *
 * Enumerated from content/projects/registry.json — the same canonical source
 * scripts/validate-projects.mjs gates — so adding a project without a working
 * page fails here rather than shipping a 404.
 */

const slugs = Object.keys(registry.projects);

test.describe("gallery", () => {
  test("lists every project with a catalogue number and stack chips", async ({
    page,
  }) => {
    await page.goto("/projects");

    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();

    const cards = page.locator("[data-project]");
    await expect(cards).toHaveCount(slugs.length);
    await expect(page.locator("[data-project-count]")).toHaveText(
      `${slugs.length} projects`,
    );

    // Catalogue numbers are assigned over the full list and zero-padded.
    await expect(cards.first().locator("[data-catalogue]")).toHaveText("01");

    for (const slug of slugs) {
      await expect(
        page.locator(`[data-project] a[href="/projects/${slug}"]`),
        `${slug} is missing from the gallery`,
      ).toHaveCount(1);
    }
  });
});

test.describe("stack filter", () => {
  /**
   * The Next page read `?stack=` on the server. A prerendered page cannot, so
   * every card is rendered and an inline head script hides the rest before
   * first paint. These assert the behaviour that replaced it.
   */
  test("a shared ?stack= link shows only matching projects", async ({ page }) => {
    await page.goto("/projects?stack=dbt");

    const visible = page.locator("[data-project]:visible");
    const count = await visible.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(slugs.length);

    for (const card of await visible.all()) {
      expect(await card.getAttribute("data-stack")).toContain("|dbt|");
    }
    await expect(page.locator("[data-project-count]")).toHaveText(`${count} projects`);
    await expect(page.locator('[data-stack-chip="dbt"]')).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("a stack containing a space still filters", async ({ page }) => {
    // The reason cards carry `|`-delimited stacks: CSS's `~=` operator matches
    // whitespace-separated values, so "GitHub Actions" would never match.
    await page.goto("/projects?stack=GitHub%20Actions");

    const visible = page.locator("[data-project]:visible");
    expect(await visible.count()).toBeGreaterThan(0);
    for (const card of await visible.all()) {
      expect(await card.getAttribute("data-stack")).toContain("|GitHub Actions|");
    }
    for (const card of await page.locator("[data-project]").all()) {
      if (await card.isVisible()) continue;
      expect(await card.getAttribute("data-stack")).not.toContain("|GitHub Actions|");
    }
  });

  test("no filter shows everything", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.locator("[data-project]:visible")).toHaveCount(slugs.length);
    await expect(page.locator('[data-stack-chip=""]')).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("an unknown stack shows the empty state rather than a blank page", async ({
    page,
  }) => {
    await page.goto("/projects?stack=not-a-real-stack");
    await expect(page.locator("[data-project]:visible")).toHaveCount(0);
    await expect(page.getByText(/No projects with that stack/i)).toBeVisible();
  });

  test("the filter script runs inline, before the cards are parsed", async ({
    page,
  }) => {
    await page.goto("/projects?stack=dbt");

    // `is:inline` keeps the script where its component sits rather than moving
    // it to <head>, and ProjectFilter renders above the list. Parsing order is
    // therefore what prevents the flash: the rule is injected before the
    // browser has any cards to paint. Bundling the script would defer it past
    // first paint and the full list would appear first.
    const order = await page.evaluate(() => {
      const script = [...document.querySelectorAll("script:not([src])")].find((node) =>
        node.textContent?.includes("data-project"),
      );
      const grid = document.querySelector("[data-projects-grid]");
      if (!script || !grid) return null;
      // Node.DOCUMENT_POSITION_FOLLOWING === 4
      return Boolean(script.compareDocumentPosition(grid) & 4);
    });

    expect(order, "no inline filter script found").not.toBeNull();
    expect(order, "filter script must precede the card grid").toBe(true);
  });
});

test.describe("write-ups", () => {
  test("every registry project has a page", async ({ page }) => {
    test.slow();
    for (const slug of slugs) {
      const response = await page.goto(`/projects/${slug}`);
      expect(response?.status(), `${slug} should render`).toBe(200);
      // Scoped to <main>: Astro's dev toolbar injects its own <h1> elements
      // ("Audit", "Settings"...), so a bare h1 locator matches five things.
      await expect(
        page.locator("main h1"),
        `${slug} has no title`,
      ).not.toBeEmpty();
      await expect(
        page.locator('meta[property="og:image"]'),
        `${slug} should point at its own OG card`,
      ).toHaveAttribute("content", new RegExp(`/projects/${slug}/opengraph-image\\.png$`));
    }
  });

  test("renders the header, metrics and neighbour navigation", async ({ page }) => {
    await page.goto("/projects/tfl-data-engineering");

    await expect(page.locator("main h1")).toHaveText(
      "London Cycle-Hire Analytics Platform",
    );
    // Catalogue number matches the gallery's, not a per-page counter.
    await expect(page.locator("header span.text-primary").first()).toHaveText("[ 01 ]");

    // Pinned metrics come from the MDX front matter, which validate-projects
    // gates against registry.json — a stale number fails CI before it ships.
    const metrics = page.locator(".font-mono.text-2xl");
    expect(await metrics.count()).toBeGreaterThan(0);
    await expect(metrics.first()).not.toBeEmpty();

    const neighbours = page.getByRole("navigation", { name: "Project navigation" });
    await expect(neighbours.getByRole("link")).not.toHaveCount(0);
  });

  test("MDX renders through the .doc styles with numbered headings", async ({
    page,
  }) => {
    await page.goto("/projects/tfl-data-engineering");
    const doc = page.locator(".doc");
    await expect(doc).toBeVisible();
    expect(await doc.locator("h2").count()).toBeGreaterThan(0);

    // The auto-numbering counter is the signature; losing it is silent.
    const marker = await page.evaluate(
      () => getComputedStyle(document.querySelector(".doc h2")!, "::before").content,
    );
    expect(marker).toContain("counter");
  });

  test("code blocks carry both Shiki themes and follow the theme toggle", async ({
    page,
  }) => {
    // agent-release-gates is the write-up with fenced code in it.
    await page.goto("/projects/agent-release-gates");
    const code = page.locator(".astro-code").first();
    await expect(code).toBeVisible();

    const colours = await page.evaluate(() => {
      const span = document.querySelector(".astro-code span[style]")!;
      const light = getComputedStyle(span).color;
      document.documentElement.classList.add("dark");
      const dark = getComputedStyle(span).color;
      document.documentElement.classList.remove("dark");
      return { light, dark, style: span.getAttribute("style") ?? "" };
    });

    // `defaultColor: false` keeps both themes as variables rather than baking
    // one in — without it the dark rules have nothing to switch to.
    expect(colours.style).toContain("--shiki-light");
    expect(colours.style).toContain("--shiki-dark");
    expect(colours.light).not.toBe(colours.dark);
  });
});
