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
   * These assertions have now been rewritten three times, and it is worth being
   * explicit about why rather than letting the history look like churn.
   *
   * The FINDING never changed: three <FadeIn> wrappers were dropped when motion
   * was swapped for CSS, and the featured showcase shipped with no entrance at
   * all while the suite stayed green. What changed each time is the MECHANISM —
   * CSS one-shot, then a CSS view() timeline, now GSAP + ScrollTrigger. Each
   * rewrite moved the assertion closer to the observable behaviour and further
   * from the implementation, because an assertion pinned to a mechanism fails
   * on a working page the moment the mechanism is replaced.
   *
   * So these test what a visitor experiences: the cards are hidden before you
   * reach them, they resolve when you do, and they un-resolve if you go back.
   * That is true of any correct implementation and false of a broken one.
   */
  test("featured cards are hidden until reached, and resolve when reached", async ({
    page,
  }) => {
    await page.goto("/");
    const cards = page.locator('[data-lens-panel="all"] [data-motion="focus"]');
    await expect(cards).not.toHaveCount(0);
    // GSAP sets the initial state on init; give it a frame to run.
    await page.waitForTimeout(600);

    const opacityOf = () =>
      cards.evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));

    const atTop = await opacityOf();
    expect(
      Math.min(...atTop),
      "no featured card is hidden on load — the entrance is missing",
    ).toBeLessThan(0.5);

    await cards.last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    const scrolled = await opacityOf();
    expect(
      Math.max(...scrolled),
      "scrolling to a card did not resolve it",
    ).toBeGreaterThan(0.9);
  });

  test("the reveal is scroll-linked, not a one-shot", async ({ page }) => {
    // Would have caught a regression to a play-once animation: a one-shot holds
    // its end state forever, so scrolling back up leaves the card fully opaque.
    // Reversibility is the property Ross specified — progress is a function of
    // scroll POSITION, not of elapsed time.
    await page.goto("/");
    const cards = page.locator('[data-lens-panel="all"] [data-motion="focus"]');
    await page.waitForTimeout(600);

    const opacityOf = () =>
      cards.evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));

    const before = await opacityOf();
    await cards.last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    const during = await opacityOf();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
    const after = await opacityOf();

    expect(Math.max(...during), "cards never resolved").toBeGreaterThan(
      Math.max(...before),
    );
    for (const [i, value] of after.entries()) {
      expect(
        Math.abs(value - before[i]!),
        `card ${i} did not un-resolve on scrolling back — ${before[i]} then ${value}`,
      ).toBeLessThan(0.1);
    }
  });

  test("the hero never animates opacity, so LCP is not gated on the script", async ({
    page,
  }) => {
    // The hero is the largest-contentful-paint element. An element at opacity 0
    // has not been painted, so fading it in would push LCP behind GSAP's
    // download and execution. The hero animates TRANSFORM ONLY for that reason,
    // and this is the assertion that stops someone "tidying" it into a fade.
    await page.goto("/");
    await page.waitForTimeout(600);
    const hero = page.locator('[data-motion="rise"]');
    await expect(hero).not.toHaveCount(0);

    const opacities = await hero.evaluateAll((els) =>
      els.map((el) => Number(getComputedStyle(el).opacity)),
    );
    for (const [i, opacity] of opacities.entries()) {
      expect(opacity, `hero element ${i} is transparent — LCP is now behind GSAP`).toBe(
        1,
      );
    }
  });

  test("with no JavaScript at all, the page is readable rather than blank", async ({
    browser,
  }) => {
    // The property: NOTHING is hidden by CSS. GSAP applies the initial hidden
    // state itself at init, so if the script never runs — JS disabled, chunk
    // 404s, an error in a dependency — no element was ever hidden and the page
    // renders complete and static. Without it, one failed request ships a page
    // of invisible cards.
    //
    // Asserted with JavaScript disabled rather than by blocking the chunk,
    // because this suite runs against `astro dev`, which INLINES component
    // scripts into the HTML — there is no request to intercept. Blocking by URL
    // passes against a build and silently fails here, which is a worse test
    // than no test. Disabling JS reproduces the same end state in both.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    const opacities = await page
      .locator("[data-motion]")
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));
    expect(opacities.length, "no motion elements rendered at all").toBeGreaterThan(0);
    for (const opacity of opacities) expect(opacity).toBe(1);

    await context.close();
  });

  test("reduced motion hides nothing and animates nothing", async ({ browser }) => {
    // The CSS version had a bug of exactly this shape: it reset
    // `animation-duration` but never `animation-delay`, and `fill-mode: both`
    // held elements at opacity 0 for the whole delay — so a visitor who asked
    // for less motion still got the staggered pop-in, just with instant tweens.
    // Measured at the time: the <h1> transparent for 167ms, the proof strip for
    // 360ms. MotionScript now returns early instead, so nothing is ever hidden.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForTimeout(900);

    const opacities = await page
      .locator("[data-motion]")
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));
    expect(opacities.length).toBeGreaterThan(0);
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
