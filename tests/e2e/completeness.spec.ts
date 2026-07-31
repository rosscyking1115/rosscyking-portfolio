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
  test("every visible card carries the reveal animation", async ({ page }) => {
    // Would have caught: three <FadeIn> wrappers dropped when motion was
    // swapped for CSS, with no replacement. Hero and /projects got .reveal;
    // this component got nothing, and every card sat static.
    //
    // BROADENED, not weakened. This test used to read the stagger off
    // `animationDelay` alone. The cards now use a view() timeline, where the
    // offsets live in `animationRange` and `animationDelay` is 0 for every card
    // — the finding above would still be caught, but the assertion would fail
    // on a working page. Worse, `animationDelay` is still REPORTED by
    // getComputedStyle under a progress timeline even though nothing honours
    // it, so leaving the check as it was would have kept it green for a reason
    // unrelated to what it claims to test.
    //
    // So it asserts the intent instead: every card has an entrance, and the
    // cards do not all arrive together — by whichever mechanism is in force.
    await page.goto("/");

    const cards = page.locator('[data-lens-panel="all"] article');
    await expect(cards).not.toHaveCount(0);

    const motion = await cards.evaluateAll((els) =>
      els.map((el) => {
        const style = getComputedStyle(el);
        return {
          name: style.animationName,
          delay: style.animationDelay,
          range: `${style.animationRangeStart} ${style.animationRangeEnd}`,
          timeline: style.animationTimeline,
        };
      }),
    );

    for (const [i, card] of motion.entries()) {
      expect(card.name, `card ${i} has no entrance animation`).not.toBe("none");
    }

    // Scroll-driven where supported, load-time stagger where not. Either way
    // the offsets have to differ between cards.
    const offsets = motion.map((card) =>
      card.timeline === "auto" ? card.delay : card.range,
    );
    expect(
      new Set(offsets).size,
      "every card arrives at the same moment — the stagger is gone",
    ).toBeGreaterThan(1);
  });

  test("reduced motion removes the entrance outright, delay included", async ({
    browser,
  }) => {
    // Would have caught the state this pass found: the global reduce block in
    // global.css collapsed `animation-duration` but never touched
    // `animation-delay`, and `fill-mode: both` holds an element at opacity 0
    // for the whole delay. A visitor who asks for less motion still got the
    // staggered pop-in, just with instant tweens — the <h1> transparent for
    // 167ms and the proof strip for 360ms. Nothing failed, because the site
    // did have a prefers-reduced-motion block; it just did not finish the job.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    const animated = await page.evaluate(() =>
      [...document.querySelectorAll(".reveal, .reveal-on-scroll")]
        .map((el) => ({
          cls: el.className,
          name: getComputedStyle(el).animationName,
        }))
        .filter((el) => el.name !== "none"),
    );
    expect(
      animated,
      `elements still animating under prefers-reduced-motion: ${animated
        .map((el) => el.cls)
        .join(", ")}`,
    ).toEqual([]);

    // The observable consequence, asserted directly rather than inferred from
    // the CSS: nothing is being held transparent.
    const opacities = await page.evaluate(() =>
      [...document.querySelectorAll(".reveal, .reveal-on-scroll")].map((el) =>
        Number(getComputedStyle(el).opacity),
      ),
    );
    for (const opacity of opacities) expect(opacity).toBe(1);

    await context.close();
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
