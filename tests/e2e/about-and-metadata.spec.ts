import { expect, test } from "@playwright/test";

import registry from "../../content/projects/registry.json" with { type: "json" };

/**
 * /about and the metadata routes (Phase B3).
 *
 * The metadata routes are the quietest things on the site: nothing visibly
 * breaks if the sitemap loses half its URLs or the manifest 404s, and nobody
 * notices until search traffic drops. Hence a gate.
 */

const slugs = Object.keys(registry.projects);

test.describe("about page", () => {
  test("renders every section in order", async ({ page }) => {
    await page.goto("/about");

    await expect(page.locator("main h1")).toHaveText(
      "I build data and ML systems you can audit.",
    );

    // The registration marks are the page's structure. Losing one means a
    // section silently vanished.
    const marks = await page
      .locator("main .text-primary")
      .filter({ hasText: /^\[/ })
      .allTextContents();
    expect(marks.map((m) => m.trim())).toEqual([
      "[ About ]",
      "[ 01 ]",
      "[ 02 ]",
      "[ 03 ]",
      "[ 04 ]",
      "[ 05 ]",
    ]);
  });

  test("the bio renders from content/about.mdx", async ({ page }) => {
    await page.goto("/about");
    const bio = page.locator("[data-bio]");
    // Imported directly from the repo-root MDX — no copy, no front matter.
    // `expect(locator).not.toHaveCount(0)` RETRIES; `await locator.count()`
    // is a one-shot snapshot that reads 0 if it lands mid-render. That is
    // exactly how this test failed once the suite grew and the dev server
    // started compiling pages on demand under load.
    await expect(bio.locator("p")).not.toHaveCount(0);
    await expect(bio).toContainText("MSc Artificial Intelligence candidate");
  });

  test("education, certifications and virtual training all populate", async ({
    page,
  }) => {
    await page.goto("/about");
    await expect(page.locator("main ol li h3")).not.toHaveCount(0);

    const lists = page.locator("main ul.divide-y");
    await expect(lists).toHaveCount(2);
    for (const list of await lists.all()) {
      await expect(list.locator("li")).not.toHaveCount(0);
    }
  });

  test("the Toolbox owns the skills list, and excludes Languages", async ({ page }) => {
    await page.goto("/about");

    const toolbox = page.locator("[data-toolbox]");
    await expect(toolbox.locator("> div")).not.toHaveCount(0);
    // Languages get their own block below; duplicating them in the toolbox was
    // the behaviour the Next page deliberately filtered out.
    await expect(toolbox).not.toContainText("Languages");

    await expect(page.locator("[data-languages] li")).not.toHaveCount(0);
  });
});

test.describe("structured data", () => {
  test("emits Person and WebSite schema", async ({ page }) => {
    await page.goto("/");
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const types = blocks.map((raw) => JSON.parse(raw)["@type"]);
    expect(types).toContain("Person");
    expect(types).toContain("WebSite");

    const person = blocks
      .map((raw) => JSON.parse(raw))
      .find((d) => d["@type"] === "Person");
    expect(person.name).toBe("Cheng-Yuan King");
    expect(person.sameAs).toEqual(
      expect.arrayContaining([expect.stringContaining("github.com")]),
    );
  });
});

test.describe("sitemap", () => {
  test("lists the four static routes and every project", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");

    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

    for (const path of ["", "/projects", "/about", "/contact"]) {
      expect(locs, `sitemap is missing ${path || "/"}`).toContain(
        `https://rosscyking.com${path}`,
      );
    }
    for (const slug of slugs) {
      expect(locs, `sitemap is missing ${slug}`).toContain(
        `https://rosscyking.com/projects/${slug}`,
      );
    }
    // Four static + every project, and nothing else. Gate 5 diffs this against
    // a sitemap captured from production.
    expect(locs).toHaveLength(4 + slugs.length);
  });

  test("keeps the home page at top priority", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const homeEntry = xml
      .split("<url>")
      .find((block) => block.includes("<loc>https://rosscyking.com</loc>"));
    expect(homeEntry).toContain("<priority>1</priority>");
    expect(homeEntry).toContain("<changefreq>weekly</changefreq>");
  });
});

test.describe("robots and manifest", () => {
  test("robots.txt points at the sitemap and blocks only /api/", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");

    const body = await res.text();
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Sitemap: https://rosscyking.com/sitemap.xml");
    // Astro's own assets must stay crawlable so Google can render the page.
    expect(body).not.toContain("/_astro");
  });

  test("the manifest is served and lists its icons", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);

    const manifest = JSON.parse(await res.text());
    expect(manifest.short_name).toBe("Ross King");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    // Next omitted icons because it served them at hash-suffixed URLs; Astro's
    // are stable, so they are listed and must therefore resolve.
    expect(manifest.icons.map((i: { src: string }) => i.src)).toEqual([
      "/icon.png",
      "/apple-icon.png",
    ]);
  });

  test("both icons render as real PNGs at the right size", async ({ request }) => {
    for (const [path, expected] of [
      ["/icon.png", 512],
      ["/apple-icon.png", 180],
    ] as const) {
      const res = await request.get(path);
      expect(res.status(), `${path} should be served`).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");

      const body = await res.body();
      expect(
        body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        `${path} is not a PNG`,
      ).toBe(true);
      expect(body.readUInt32BE(16), `${path} is the wrong width`).toBe(expected);
      expect(body.readUInt32BE(20), `${path} is the wrong height`).toBe(expected);
    }
  });
});
