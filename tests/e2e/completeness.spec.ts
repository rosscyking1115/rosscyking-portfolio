import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { nowBuilding } from "../../src/lib/now-building";
import { ROUTES as ALL_ROUTES } from "./routes";

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
  test("no surface was skipped: the arrival is on the rack and nowhere else", async ({
    page,
  }) => {
    // REWRITTEN A SECOND TIME, AND THE ASSERTION HAS NOW BEEN INVERTED TWICE.
    //
    //   v1  every card HAS an entrance   (the original finding: three <FadeIn>
    //       wrappers dropped, one component skipped)
    //   v2  no card has one              (§01 banned arrivals outright)
    //   v3  the rack has one, and only the rack   (Ross, 2 Aug 2026)
    //
    // Recorded rather than tidied, because the churn is the lesson. The FINDING
    // has been the same all three times — a change was made across the site and
    // ONE surface was skipped — and each rewrite pinned the mechanism of the
    // day instead of the property. So this version asserts the property: the
    // arrival is present exactly where it is meant to be, and absent everywhere
    // else, whatever it is implemented with.
    //
    // The v2 note is worth keeping too: left alone, v1 would not even have gone
    // red. It queried `.reveal, .reveal-on-scroll`, which matched nothing, so
    // the loop iterated zero times and passed vacuously. A dead green test is
    // worse than a deleted one; it reports coverage that does not exist.
    await page.goto("/");

    // EVERY DIRECT CHILD OF THE RACK, not every <article> in it. The rack is a
    // reading instrument and a list of rows, and the list arrives as one block
    // — so an article-level check would demand the attribute on each row and
    // fail against the correct implementation. Direct children is the shape
    // that survives the layout changing again, which it has twice now.
    const rack = page.locator('[data-lens-panel="all"] [data-rack] > *');
    await expect(rack, "the rack renders nothing at all").not.toHaveCount(0);
    for (const block of await rack.all()) {
      await expect(block, "a rack block was skipped by the arrival").toHaveAttribute(
        "data-enter",
        "scroll",
      );
    }

    // And nowhere else. /projects is the comparison surface and must be
    // complete the instant it loads — a filtered list whose rows fade in is the
    // defect the previous entrance was removed for.
    for (const route of ["/projects", "/about"]) {
      await page.goto(route);
      await expect(
        page.locator("[data-enter]"),
        `${route} has picked up an arrival it should not have`,
      ).toHaveCount(0);

      const held = await page.locator("main *").evaluateAll((els) =>
        els
          .map((el) => ({
            el: el.tagName.toLowerCase() + "." + (el.getAttribute("class") ?? ""),
            opacity: Number(getComputedStyle(el).opacity),
          }))
          .filter((entry) => entry.opacity < 1),
      );
      expect(held, `${route}: something is not fully present on arrival`).toEqual([]);
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

test.describe("completeness — the narrowing control (finding #2)", () => {
  /**
   * REWRITTEN, AND ITS PREMISE WAS INVERTED.
   *
   * The original assertion read: "a 10% tint keeps the label in primary. The
   * look-alike filled the pill solid and inverted the text, which reads as a
   * different control." It failed the moment the chip was built to the design
   * spec — because the spec draws exactly what that sentence calls a
   * look-alike:
   *
   *     selected — bg #3d5a73, text #fafafb, no border
   *
   * The tint was carried over from the Next lens switcher during the port and
   * then defended in a test, so the port's incidental styling became the thing
   * the suite protected the design FROM. That is worth stating plainly: a test
   * can pin the wrong thing so firmly that the right thing looks like a
   * regression.
   *
   * The finding underneath survives — the control was once rewritten from
   * scratch rather than ported, losing its caption and its mono face — and both
   * of those are still asserted. What changed is which active state is correct.
   */
  test("is the spec's chip: mono, pill, solid when selected", async ({ page }) => {
    await page.goto("/");

    const group = page.getByRole("group", { name: "View this portfolio by role" });
    await expect(group.getByText(/Viewing as/)).toBeVisible();

    const active = group.locator('button[aria-pressed="true"]');
    const inactive = group.locator('button[aria-pressed="false"]').first();

    // Mono, not the sans body face.
    const font = await active.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font).toMatch(/Mono/i);

    // Selected: solid accent, inverted label, no border.
    await expect(active).toHaveCSS("background-color", "rgb(61, 90, 115)");
    await expect(active).toHaveCSS("color", "rgb(250, 250, 251)");
    await expect(active).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");

    // Rest: transparent, bordered, muted.
    await expect(inactive).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(inactive).toHaveCSS("border-top-color", "rgb(205, 208, 214)");

    // A pill, not a rounded rectangle.
    const radius = await active.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).borderTopLeftRadius),
    );
    expect(radius, "the chip is not a pill").toBeGreaterThanOrEqual(99);
  });
});

test.describe("completeness — the site does not discuss visas (Ross, 3 Aug 2026)", () => {
  test("no route mentions a visa or sponsorship", async ({ page }) => {
    // AN ABSENCE ASSERTION, which is what this file is for. "Remove everything
    // related to visa" is the kind of instruction that gets 90% done: the
    // obvious label goes, and the clause survives in a bio paragraph, a meta
    // description, or an og:description generated from one of them. Nothing
    // 404s and nothing looks wrong, because a sentence that is still true is
    // not a bug — it is just a sentence he asked not to publish.
    //
    // It came from three places at once (a site-config token, the /contact
    // band, and content/about.mdx), which is exactly why this sweeps the
    // rendered text of every derived route rather than the file it was removed
    // from. The design spec's screen 16a still asks for the visa fact; this is
    // the thing that stops it being re-added by someone following the spec.
    //
    // NOT ASSERTED, AND WORTH SAYING: public/cv.pdf. It is a binary and this
    // gate cannot read it — if the CV names a visa route, the site links to a
    // document that says what the site does not.
    for (const route of ALL_ROUTES) {
      await page.goto(route);
      const text = (await page.locator("body").textContent()) ?? "";
      expect(text, `${route} mentions a visa or sponsorship`).not.toMatch(
        /visas?|sponsorship|sponsored/i,
      );

      const meta = await page
        .locator('meta[name="description"], meta[property="og:description"]')
        .evaluateAll((els) =>
          els.map((el) => el.getAttribute("content") ?? "").join(" "),
        );
      expect(meta, `${route} metadata mentions a visa`).not.toMatch(
        /visas?|sponsorship/i,
      );
    }
  });
});
