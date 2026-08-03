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

test.describe("figure provenance (design pass, home interactions)", () => {
  test("the slot is always present and always occupied", async ({ page }) => {
    // "The slot is always present and always occupied — so nothing shifts."
    // Both halves are the design. A slot that APPEARS on hover pushes the page
    // down at the moment the reader's pointer is somewhere specific, which is
    // the worst possible time; an empty reserved strip reads as a rendering
    // fault. So it starts occupied and never empties.
    await page.goto("/");
    const slot = page.locator("[data-provenance]");
    await expect(slot).toBeVisible();
    await expect(slot).toHaveText(/Hover or focus a figure/);
  });

  test("each figure names where it is counted from, and it costs no layout", async ({
    page,
  }) => {
    await page.goto("/");
    const slot = page.locator("[data-provenance]");
    const figures = page.locator("[data-figure]");
    await expect(figures).toHaveCount(3);

    // Measured against the SECTION BELOW the band, because that is what a
    // growing slot would push. R9's whole reason for a fixed slot is that this
    // number does not move.
    // The VISIBLE panel. `[data-lens-panel]` matches all three and the first
    // two are display:none, so an unscoped locator measures a box that has no
    // position and reports "nothing moved" whatever happens.
    //
    // DOCUMENT-RELATIVE, not viewport-relative. `boundingBox()` is measured
    // from the viewport, and `hover()` scrolls its target into view — so the
    // first version of this reported the rack moving 88px UP, which is the page
    // scrolling and not the band growing. Fifth time in this suite that a
    // measurement has caught the page mid-move.
    const offsetTop = () =>
      page
        .locator('[data-lens-panel="all"] [data-rack]')
        .evaluate((el) => Math.round(el.getBoundingClientRect().top + window.scrollY));
    const before = await offsetTop();

    for (let i = 0; i < 3; i++) {
      await figures.nth(i).hover();
      await expect(slot).not.toHaveText(/Hover or focus a figure/);
      // Every source names the QUERY, not the answer — "counted from the
      // registry" is true of all three and tells a reader nothing.
      await expect(slot).toHaveText(/registry|shipped|metric/i);
    }

    expect(await offsetTop(), "the provenance slot moved the page").toBe(before);
  });

  test("a figure is a real control, because hover does not exist on a phone", async ({
    page,
  }) => {
    // THE FAILURE THIS EXISTS FOR. Built as a hover rule on a <span>, this
    // interaction would be desktop-only on a site whose traffic is mostly
    // phones — and it would have looked finished. A button works on a tap, on
    // Tab, and under a screen reader.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const figure = page.locator("[data-figure]").first();
    await expect(figure).toHaveRole("button");
    await expect(figure).toHaveAttribute("aria-describedby", "proof-provenance");

    // `click`, not `tap`: Playwright's `tap` needs a context with `hasTouch`,
    // and what is being asserted is that the affordance is a CONTROL rather
    // than a hover rule — a control answers both.
    await figure.click();
    await expect(page.locator("[data-provenance]")).toHaveText(/shipped/i);
  });

  test("the figures are one row at 40px on a phone", async ({ page }) => {
    // Execution audit, finding 06: the three figures used to STACK, spending
    // roughly 430px on eleven characters, which made the band — the site's one
    // scale break at 1440 — into the longest low-density passage on the site at
    // 390. The audit's own fix, and its reasoning: "they are short and they
    // read fine small."
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const columns = await page
      .locator("[data-proof-strip]")
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns, "the proof figures are not one row on a phone").toBe(3);
    await expect(page.locator("[data-count-to]").first()).toHaveCSS("font-size", "40px");
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
      // Read off the MAJOR heading rather than a `data-lens-headline` hook: R9
      // made this the route's one 32px heading, and a rung is a stronger anchor
      // than an attribute nothing else uses.
      await expect(panel.getByRole("heading", { level: 2 }).first()).toContainText(
        "projects, shown working",
      );
      // AND THE COUNTER AGREES WITH IT. Two numbers about the same set on the
      // same screen is exactly the drift §03 R8 exists for; both are computed
      // from the same prerendered panel, and this is what says so.
      await expect(panel.locator("[data-lens-counter]")).toContainText(
        `/?lens=${key} · ${lens.featured.length} of`,
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
    // §03 R7, RESTORED AFTER A ROUND TRIP, and the round trip is why this note
    // is longer than the test.
    //
    // On 2 Aug 2026 the rack was rebuilt as three open cards, and this
    // assertion was rewritten to count one frame per featured project. Ross
    // reverted the layout the same day, so R7 is back in force and so is the
    // count. What that sequence proves is worth keeping: the assertion tracked
    // the layout both times, which means it was never testing R7 — it was
    // testing whatever the component happened to do.
    //
    // So the failure it names is the one that does not move: the frame is the
    // section's signature, and a project with neither a screenshot nor terminal
    // lines renders an EMPTY box — easy to miss in review, and a real defect on
    // the Next site (HANDOFF P3, item 4).
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

  test("exactly one image is eager, however many frames are in the markup", async ({
    page,
  }) => {
    // THE COST OF OVERRULING R7, ASSERTED SO IT CANNOT DRIFT.
    //
    // Three prerendered lens panels means three rack frames in the document
    // even under R7, and the only reason that is defensible is that two of them
    // are lazy and sit inside a display:none panel. Extend the `eager`
    // condition to "the reading instrument of every lens", which reads
    // perfectly reasonable in a diff, and the home page starts fetching three
    // full-size screenshots before it paints.
    await page.goto("/");
    const eager = await page.locator("main img:not([loading='lazy'])").count();
    expect(eager, "more than one image is eager on first paint").toBe(1);
  });

  test("the bench opens in place, and the preview is the short form", async ({
    page,
  }) => {
    // Ross's call, 2 Aug 2026: "below project should all be able to toggle open
    // a drop down, show a simple version of the feature card, and all
    // interactive."
    await page.goto("/");
    const panel = page.locator('[data-lens-panel="all"]');
    const rows = panel.locator("[data-bench] details");
    await expect(rows).not.toHaveCount(0);

    const first = rows.first();
    const preview = first.locator("figure");
    await expect(preview).toBeHidden();

    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await expect(preview).toBeVisible();

    // "All interactive" — the way out of the preview is a real link, not a
    // stretched overlay. A stretched link over the summary would swallow the
    // toggle and navigate away from the row you just opened, which is what the
    // first cut of this did.
    await expect(first.getByRole("link", { name: /Read the write-up/ })).toHaveAttribute(
      "href",
      /^\/projects\//,
    );

    // And it closes again. A disclosure that only opens is a layout change
    // dressed as a control.
    await first.locator("summary").click();
    await expect(first).not.toHaveAttribute("open", "");
  });

  test("a bench preview loads no image until it is opened", async ({ page }) => {
    // Nineteen frames sit in closed bench previews across the three lens
    // panels. The claim that this costs nothing is a claim about
    // `loading="lazy"` inside a closed <details> — plausible, widely assumed,
    // and worth CONFIRMING rather than asserting, because if it is wrong the
    // home page quietly fetches nineteen screenshots and the disclosure has
    // bought a page-weight problem to solve a page-length one.
    //
    // ── THE FIRST VERSION OF THIS TEST MEASURED THE WRONG THING ──────────────
    // It read `naturalWidth`, on the reasoning that a decoded image has a width
    // and an un-fetched one does not. It failed at 2 of 19 — and the two were
    // real: agent-release-gates and tfl-data-engineering are featured in the
    // `all` rack AND benched in the `ai` and `data` panels, so their bytes were
    // already in the cache and the <img> decoded from it with no request at
    // all. The prediction was right about the NETWORK and the instrument was
    // measuring the DECODE.
    //
    // So it measures requests, and it measures the ones that matter: a src that
    // only a bench preview uses. Anything shared with a rack card is going to
    // be fetched regardless of what the disclosure does.
    // Keyed on the SOURCE FILE rather than on the URL. Astro emits a `srcset`
    // of three widths through `/_image?href=…&w=…`, so the URL the browser
    // actually requests is never the one in `src` — comparing those directly
    // finds nothing and passes for the wrong reason.
    const sourceFile = (url: string) => {
      try {
        return new URL(url, "http://x").searchParams.get("href") ?? url;
      } catch {
        return url;
      }
    };

    const requested = new Set<string>();
    page.on("request", (request) => {
      if (request.resourceType() === "image") requested.add(sourceFile(request.url()));
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const benchOnly: string[] = await page.evaluate(() => {
      const href = (img: Element) => {
        const raw = img.getAttribute("src") ?? "";
        try {
          return new URL(raw, location.href).searchParams.get("href") ?? raw;
        } catch {
          return raw;
        }
      };
      const rack = new Set([...document.querySelectorAll("[data-rack] img")].map(href));
      return [
        ...new Set(
          [...document.querySelectorAll("[data-bench] details:not([open]) img")]
            .map(href)
            .filter((file) => file && !rack.has(file)),
        ),
      ];
    });
    expect(
      benchOnly.length,
      "no bench preview has a screenshot of its own to test with",
    ).toBeGreaterThan(0);

    const fetched = benchOnly.filter((file) => requested.has(file));
    expect(fetched, "a closed bench row fetched its own screenshot").toEqual([]);

    // Filtered to a row that HAS an image: not every project has a screenshot —
    // some publish a terminal readout instead — and picking blindly would make
    // this pass or fail on the bench's alphabetical order.
    const first = page
      .locator('[data-lens-panel="all"] [data-bench] details')
      .filter({ has: page.locator("img") })
      .first();
    await first.locator("summary").click();
    await expect(first.locator("figure")).toBeVisible();

    // …and opening it does fetch one, so the frame is not simply empty.
    await expect
      .poll(async () =>
        first
          .locator("img")
          .first()
          .evaluate((img) => (img as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
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
