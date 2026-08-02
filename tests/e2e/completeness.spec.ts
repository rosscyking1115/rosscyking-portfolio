import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { nowBuilding } from "../../src/lib/now-building";

/**
 * Completeness gates.
 *
 * Every other spec in this suite tests BEHAVIOUR: the action accepts a
 * submission, the redirect lands, the header is present. None of them could
 * fail because a component was never written, and four separate parity defects
 * survived the whole port for exactly that reason:
 *
 *   - /contact shipped with no design system applied, and passed.
 *   - FeaturedProjects lost all three of its entrance animations, and passed.
 *   - The "Now building" strip was never ported. Its data array is empty, so it
 *     renders nothing — indistinguishable from a component that does not exist.
 *   - There was no 404 route at all. A missing route answers 404, which is what
 *     a 404 route is supposed to do, so nothing looked wrong.
 *
 * The common shape: absence is invisible to a test that only asks "does what is
 * here work?". These assertions ask "is it all here?" instead.
 */

const ROUTES = ["/", "/about", "/projects", "/contact", "/projects/tfl-data-engineering"];

/** The build output, asserted directly where the browser cannot see it. */
const astroRoot = fileURLToPath(new URL("../../", import.meta.url));
const outputPath = (rel: string) => `${astroRoot}.vercel/output/${rel}`;

test.describe("completeness — 404 route (finding #1)", () => {
  test("an unknown path answers 404 with the site's own chrome", async ({ page }) => {
    // Would have caught: no 404.astro. Previously an unknown path fell through
    // to Vercel's generic 404 — right status, no nav, no footer, no way back.
    const response = await page.goto("/no-such-page-exists");
    expect(response?.status()).toBe(404);

    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
    await expect(page.locator("nav").first()).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    // The affordance that was actually missing: a route back.
    await expect(page.getByRole("link", { name: "Back to projects" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go home" })).toBeVisible();
  });

  test("the build emits 404.html and Vercel is told to serve it", async () => {
    // The dev server rendering 404.astro proves nothing about production: the
    // static file and the routing rule are what Vercel actually uses.
    expect(existsSync(outputPath("static/404.html")), "404.html was not built").toBe(
      true,
    );

    const config = JSON.parse(readFileSync(outputPath("config.json"), "utf8")) as {
      routes?: { src?: string; dest?: string; status?: number }[];
    };
    const catchAll = config.routes?.find((r) => r.dest === "/404.html");
    expect(catchAll, "no catch-all route to /404.html").toBeDefined();
    expect(catchAll?.status).toBe(404);
  });
});

test.describe("completeness — share-card metadata (finding #4)", () => {
  for (const route of ROUTES) {
    test(`${route} emits og:image:alt and twitter:image:alt`, async ({ page }) => {
      // Would have caught: both tags dropped on all five routes. The cards
      // rendered fine, so nothing looked broken — the alternative text was
      // simply absent wherever the site was unfurled.
      await page.goto(route);

      for (const selector of [
        'meta[property="og:image:alt"]',
        'meta[name="twitter:image:alt"]',
      ]) {
        const content = await page.locator(selector).getAttribute("content");
        expect(content, `${selector} missing on ${route}`).toBeTruthy();
        expect(content!.length).toBeGreaterThan(3);
      }
    });
  }
});

test.describe("completeness — title order (finding #3)", () => {
  test("home leads with the brand, every other route trails it", async ({ page }) => {
    // Would have caught: the layout applied one title form to every route, so
    // home rendered "<tagline> — Ross King" instead of Next's
    // "Ross King — <tagline>". site-config.ts documented the intended form all
    // along; only the code disagreed.
    await page.goto("/");
    expect(await page.title()).toMatch(/^Ross King — /);

    for (const route of ["/about", "/projects", "/contact"]) {
      await page.goto(route);
      expect(await page.title(), `${route} title`).toMatch(/ — Ross King$/);
    }
  });
});

test.describe("completeness — featured showcase (finding #5)", () => {
  /**
   * REWRITTEN, and this note is the point of the rewrite.
   *
   * The original finding was that three <FadeIn> wrappers were dropped when
   * `motion` was swapped for CSS: Hero and /projects got `.reveal`, this
   * component got nothing, and every card sat static while the rest of the
   * page animated. Two tests grew out of it, both asserting that the cards
   * HAVE an entrance.
   *
   * The design spec bans entrances outright (see the MOTION CONTRACT in
   * src/styles/global.css), so both tests now assert the opposite of what the
   * site should do. Left alone they would not even have gone red — they
   * queried `.reveal, .reveal-on-scroll`, which now matches nothing, so the
   * loops would have iterated zero times and passed vacuously. A dead green
   * test is worse than a deleted one; it reports coverage that does not exist.
   *
   * What survives is the finding underneath the mechanism: a change was made
   * across the site and ONE component was skipped. That is still the failure
   * mode worth gating, so it is now asserted as a property of every surface at
   * once rather than as a property of this component's animation.
   */
  test("no surface was skipped: cards are complete on arrival, everywhere", async ({
    page,
  }) => {
    // Would have caught the original finding — the showcase differing from
    // Hero and /projects after a site-wide motion change — and now also
    // catches the inverse, a reveal surviving on one surface after removal.
    for (const [route, selector] of [
      ["/", '[data-lens-panel="all"] article'],
      ["/projects", "[data-project] article"],
    ] as const) {
      await page.goto(route);
      const cards = page.locator(selector);
      await expect(cards, `${route} renders no cards at all`).not.toHaveCount(0);

      const held = await cards.evaluateAll((els) =>
        els
          .map((el, i) => {
            const style = getComputedStyle(el);
            return {
              i,
              opacity: Number(style.opacity),
              transform: style.transform,
              animation: style.animationName,
            };
          })
          .filter(
            (card) =>
              card.opacity < 1 || card.transform !== "none" || card.animation !== "none",
          ),
      );
      expect(held, `${route}: cards not fully present on arrival`).toEqual([]);
    }
  });
});

test.describe("completeness — now building (finding #6)", () => {
  test("the module exists and exports a list", () => {
    // Would have caught: src/lib/now-building.ts was never ported at all.
    // Importing it here fails the suite outright if the file goes missing.
    expect(Array.isArray(nowBuilding)).toBe(true);
  });

  test("a non-empty list renders the strip", async ({ page }) => {
    // Would have caught the part a page test cannot reach: with the real list
    // empty, the component renders nothing, so /-based assertions are blind to
    // whether the markup exists. The fixture route supplies entries.
    await page.goto("/dev-fixtures/now-building");

    const strip = page.getByRole("complementary", { name: "Now building" });
    await expect(strip).toBeVisible();
    await expect(strip.getByText("[ // ]")).toBeVisible();
    await expect(strip.getByText("fixture-project-one")).toBeVisible();
    await expect(strip.getByText("fixture-project-two")).toBeVisible();
    await expect(strip.getByText(/Private repos while in progress/)).toBeVisible();
  });

  test("the fixture route is absent from the production build", async () => {
    // The fixture is dev-only by way of getStaticPaths returning []. Guards
    // that are never exercised are guards that quietly stop working.
    expect(existsSync(outputPath("static/dev-fixtures"))).toBe(false);
  });
});

test.describe("completeness — lens switcher (finding #2)", () => {
  test("matches the ported control rather than a look-alike", async ({ page }) => {
    // Would have caught: the switcher was rewritten from scratch instead of
    // ported, losing the caption, the mono face, and the tinted active state.
    await page.goto("/");

    const group = page.getByRole("group", { name: "View this portfolio by role" });
    await expect(group.getByText(/Viewing as/)).toBeVisible();

    const active = group.locator('button[aria-pressed="true"]');
    const inactive = group.locator('button[aria-pressed="false"]').first();

    // Mono, not the sans body face.
    const font = await active.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font).toMatch(/Mono/i);

    // A 10% tint keeps the label in primary. The look-alike filled the pill
    // solid and inverted the text, which reads as a different control.
    await expect(active).toHaveCSS("color", "rgb(61, 90, 115)");
    const activeBg = await active.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(activeBg, "active pill should be tinted, not solid primary").not.toBe(
      "rgb(61, 90, 115)",
    );

    await expect(inactive).toHaveCSS("font-weight", "400");
    await expect(active).toHaveCSS("font-weight", "500");
  });
});
