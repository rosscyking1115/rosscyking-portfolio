import { expect, test } from "@playwright/test";

import registry from "../../../content/projects/registry.json" with { type: "json" };

/**
 * Open Graph card gate (migration risk #3).
 *
 * Astro has no built-in ImageResponse and the docs carry no OG recipe, so this
 * is a hand-rolled satori + resvg pipeline. That makes it exactly the kind of
 * thing that breaks silently: a card that fails to render is invisible until
 * someone shares a link and gets a blank preview.
 *
 * The enumeration below reads content/projects/registry.json — the same
 * canonical source scripts/validate-projects.mjs gates — so adding a project
 * without a working card fails here, mirroring tests/e2e/registry.spec.ts in
 * the Next app.
 */

const slugs = Object.keys(registry.projects);

/** Read width/height straight out of the PNG IHDR chunk. */
function pngSize(buffer: Buffer): { width: number; height: number } {
  expect(
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "response is not a PNG",
  ).toBe(true);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test.describe("open graph cards", () => {
  /**
   * The project cards are checked in ONE sequential test rather than one test
   * per slug, and that is deliberate.
   *
   * In a real build these are prerendered static PNGs with zero per-request
   * cost. The dev server this suite runs against has no build, so it renders
   * each card on demand through satori + `@resvg/resvg-js` — a native module
   * that blocks the Node event loop while it rasterises. Eleven of those
   * arriving at once under Playwright's parallelism does not merely time out;
   * the server drops connections with `read ECONNRESET`.
   *
   * Verified as a harness artefact, not a defect: all ten pass in isolation and
   * only fail inside the full suite. Requesting them in sequence removes the
   * cause instead of hiding it behind a longer timeout, and every assertion
   * still names its slug, so a genuine failure is just as diagnosable.
   */
  test("the site-wide card renders at 1200x630", async ({ request }) => {
    const res = await request.get("/opengraph-image.png");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");

    const body = await res.body();
    expect(pngSize(body)).toEqual({ width: 1200, height: 630 });
    // A card that rendered no text still produces a valid but tiny PNG.
    expect(body.byteLength).toBeGreaterThan(10_000);
  });

  test("every project has a card, at the right size", async ({ request }) => {
    test.slow();

    for (const slug of slugs) {
      const res = await request.get(`/projects/${slug}/opengraph-image.png`);
      expect(res.status(), `${slug} card should return 200`).toBe(200);
      expect(
        res.headers()["content-type"],
        `${slug} card is not a PNG`,
      ).toContain("image/png");

      const body = await res.body();
      expect(pngSize(body), `${slug} card is the wrong size`).toEqual({
        width: 1200,
        height: 630,
      });
      expect(body.byteLength, `${slug} card looks empty`).toBeGreaterThan(10_000);
    }
  });

  test("every registry project is covered", () => {
    // Guards the loop above from silently becoming a no-op if the registry
    // import shape changes.
    expect(slugs.length).toBeGreaterThanOrEqual(10);
  });
});

test.describe("open graph meta tags", () => {
  test("a page points at the card with the right dimensions", async ({ page }) => {
    await page.goto("/contact");

    const content = (selector: string) =>
      page.locator(selector).first().getAttribute("content");

    expect(await content('meta[property="og:image"]')).toContain(
      "/opengraph-image.png",
    );
    expect(await content('meta[property="og:image:width"]')).toBe("1200");
    expect(await content('meta[property="og:image:height"]')).toBe("630");
    expect(await content('meta[name="twitter:card"]')).toBe("summary_large_image");
    expect(await content('meta[property="og:title"]')).toBe("Contact — Ross King");
  });
});
