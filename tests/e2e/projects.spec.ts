import { expect, test, type Page } from "@playwright/test";

import registry from "../../content/projects/registry.json" with { type: "json" };

/**
 * Projects log and write-up gate.
 *
 * Enumerated from content/projects/registry.json — the same canonical source
 * scripts/validate-projects.mjs gates — so adding a project without a working
 * page fails here rather than shipping a 404.
 */

const slugs = Object.keys(registry.projects);

type ProjectSpec = {
  mark: number;
  status?: string;
  demo?: string | null;
  headline?: { mode?: string } | null;
};
const spec = (slug: string) => (registry.projects as Record<string, ProjectSpec>)[slug]!;

/** The order the READER sees, which is CSS `order`, not DOM order. */
const painted = (page: Page) =>
  page.locator("[data-project]").evaluateAll((rows) =>
    rows
      .filter((row) => (row as HTMLElement).offsetParent !== null)
      .map((row) => ({
        slug: row.querySelector("a")?.getAttribute("href")?.split("/").pop() ?? "",
        order: Number(getComputedStyle(row).order),
      }))
      .sort((a, b) => a.order - b.order)
      .map((row) => row.slug),
  );

test.describe("the log (design spec §04)", () => {
  test("every project is one row, carrying its mark and its evidence", async ({
    page,
  }) => {
    // The card grid became a ten-row log because comparison is a column
    // problem — audit findings 04 and 05. Everything the gallery test asserted
    // is still asserted here against the shape that replaced it, plus the two
    // cells the grid never had.
    await page.goto("/projects");

    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();

    const rows = page.locator("[data-project]");
    await expect(rows).toHaveCount(slugs.length);
    await expect(page.locator("[data-project-count]")).toHaveText(
      `${slugs.length} projects · one table`,
    );
    await expect(rows.first().locator("[data-catalogue]")).toHaveText("01");

    for (const slug of slugs) {
      await expect(
        page.locator(`[data-project] a[href="/projects/${slug}"]`),
        `${slug} is missing from the log`,
      ).toHaveCount(1);
    }

    // Finding 05, closed: "the index — the one surface built for comparing
    // projects — carries no numbers at all."
    await expect(page.locator("[data-instrument] [title^='Corrected']")).not.toHaveCount(
      0,
    );
    // `exact` matters: the struck pair also spells the number out for screen
    // readers as "Withdrawn: 99.31%. Corrected to 79.92% …", so a loose match
    // finds two elements and fails on strict mode rather than on the finding.
    await expect(page.getByText("79.92%", { exact: true })).toBeVisible();
  });

  test("no project summary is published on two index surfaces", async ({ page }) => {
    // §03 R2: "no summary paragraph on two index surfaces." The home showcase
    // and this page used to print the SAME summary string, differing only in
    // whether a screenshot sat beside the words — which is exactly what made
    // them read as one component rendered twice (finding 04). The prose now
    // lives only on the write-up.
    await page.goto("/");
    const home = (await page.locator("main").textContent()) ?? "";

    await page.goto("/projects");
    const index = (await page.locator("main").textContent()) ?? "";

    // A distinctive clause from a home card. Long enough to be one project's
    // own sentence rather than a phrase any two projects might share.
    const marker = "Answers one question well";
    const start = home.indexOf(marker);
    expect(start, "the sample clause is not on the home page any more").toBeGreaterThan(
      -1,
    );
    const clause = home.slice(start, start + 60);
    expect(index, "the index is republishing a home page summary").not.toContain(clause);
  });

  test("the ledger's test total is the home page's test total", async ({ page }) => {
    // §03 R8: "numbers are counted, not typed … a hand-written total is a
    // number that can drift." Compares the two SURFACES rather than either
    // against a literal, so the test cannot go stale when a project is added.
    //
    // The designer's mock is the worked example of the failure: its neobank row
    // read 617 tests while its own footer said 1,681, and only one of those can
    // be the source.
    await page.goto("/");
    const onHome = ((await page.locator("main").textContent()) ?? "").match(
      /([\d,]+)\s*TESTS/i,
    );
    expect(onHome, "the home proof readout has no test total").not.toBeNull();

    await page.goto("/projects");
    await expect(page.getByText(`${onHome![1]} tests total`)).toBeVisible();
  });
});

test.describe("sort — the evidence note as an axis (§04)", () => {
  test("reading order is the canonical mark, not the publish date", async ({ page }) => {
    await page.goto("/projects");
    const marks = (await painted(page)).map((slug) => spec(slug).mark);
    expect(marks).toEqual([...marks].sort((a, b) => a - b));
  });

  test("corrected first puts every correction above every other row", async ({
    page,
  }) => {
    // The thesis of the page. "Show me the ones he had to correct" is only a
    // thing a hiring manager can do if the metric mode is an axis rather than a
    // sentence buried in the prose.
    await page.goto("/projects?sort=corrected");
    const order = await painted(page);
    const modeOf = (slug: string) => spec(slug).headline?.mode ?? "NONE";

    const firstOther = order.findIndex((slug) => modeOf(slug) !== "CORRECTED");
    expect(firstOther, "no corrections rendered at all").toBeGreaterThan(0);
    for (const slug of order.slice(firstOther)) {
      expect(
        modeOf(slug),
        `${slug} is corrected but sorted below one that is not`,
      ).not.toBe("CORRECTED");
    }
  });

  test("a shared ?sort= link is correct before first paint", async ({ page }) => {
    // The whole reason sorting is four precomputed ranks and one attribute: the
    // inline head script sets `data-sort` before the browser has anything to
    // paint, so the list never rearranges itself in front of the reader.
    await page.goto("/projects?sort=live");
    await expect(page.locator("html")).toHaveAttribute("data-sort", "live");

    const rank = (slug: string) =>
      spec(slug).status === "archived" ? 2 : spec(slug).demo ? 0 : 1;
    const ranks = (await painted(page)).map(rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  test("an unknown sort falls back rather than emptying the page", async ({ page }) => {
    await page.goto("/projects?sort=not-a-sort");
    await expect(page.locator("html")).toHaveAttribute("data-sort", "order");
    await expect(page.locator("[data-project]:visible")).toHaveCount(slugs.length);
  });

  test("changing the sort is a filter, not a navigation", async ({ page }) => {
    // §03 R3: "No full navigation for a filter." Asserted by watching for a
    // navigation that must not happen — the stack filter this replaced was a
    // strip of <a> links, so every chip cost a round trip.
    await page.goto("/projects");

    // A marker on `window`, not Playwright's `framenavigated`. That event also
    // fires for same-document history changes, so it counts the control's own
    // `replaceState` and the test would fail against correct behaviour. A value
    // that only survives if the document was never replaced is the real signal.
    await page.evaluate(() => {
      (window as unknown as { __sameDocument?: boolean }).__sameDocument = true;
    });

    await page
      .locator('[data-narrow-chip][data-narrow="sort"][data-narrow-value="tests"]')
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-sort", "tests");

    const survived = await page.evaluate(
      () => (window as unknown as { __sameDocument?: boolean }).__sameDocument === true,
    );
    expect(survived, "changing the sort reloaded the page").toBe(true);

    // …and the URL still describes what is on screen, so it can be shared.
    expect(page.url()).toContain("sort=tests");
  });
});

test.describe("stack filter", () => {
  /**
   * The Next page read `?stack=` on the server. A prerendered page cannot, so
   * every row is rendered and an inline head script hides the rest before first
   * paint. These assert the behaviour that replaced it.
   */
  test("a shared ?stack= link shows only matching projects", async ({ page }) => {
    await page.goto("/projects?stack=dbt");

    const visible = page.locator("[data-project]:visible");
    const count = await visible.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(slugs.length);

    for (const row of await visible.all()) {
      expect(await row.getAttribute("data-stack")).toContain("|dbt|");
    }
    await expect(page.locator("[data-project-count]")).toHaveText(
      `${count} projects · one table`,
    );
    await expect(
      page.locator('[data-narrow-chip][data-narrow="stack"][data-narrow-value="dbt"]'),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("a stack containing a space still filters", async ({ page }) => {
    // The reason rows carry `|`-delimited stacks: CSS's `~=` operator matches
    // whitespace-separated values, so "GitHub Actions" would never match.
    await page.goto("/projects?stack=GitHub%20Actions");

    const visible = page.locator("[data-project]:visible");
    await expect(visible).not.toHaveCount(0);
    for (const row of await visible.all()) {
      expect(await row.getAttribute("data-stack")).toContain("|GitHub Actions|");
    }
    for (const row of await page.locator("[data-project]").all()) {
      if (await row.isVisible()) continue;
      expect(await row.getAttribute("data-stack")).not.toContain("|GitHub Actions|");
    }
  });

  test("no filter shows everything", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.locator("[data-project]:visible")).toHaveCount(slugs.length);
    await expect(
      page.locator('[data-narrow-chip][data-narrow="stack"][data-narrow-value=""]'),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("an unknown stack shows the empty state rather than a blank page", async ({
    page,
  }) => {
    await page.goto("/projects?stack=not-a-real-stack");
    await expect(page.locator("[data-project]:visible")).toHaveCount(0);
    await expect(page.getByText(/No projects with that stack/i)).toBeVisible();
  });

  test("filter and sort compose, without either forgetting the other", async ({
    page,
  }) => {
    // Two independent attributes on one element rather than two passes over one
    // list, which is what makes composing them free. Asserted anyway: "narrowed
    // AND re-ordered" is the state a shared link is most likely to carry, and
    // the one a JavaScript implementation is most likely to get wrong.
    await page.goto("/projects?stack=dbt&sort=tests");
    const visible = page.locator("[data-project]:visible");
    await expect(visible).not.toHaveCount(0);
    for (const row of await visible.all()) {
      expect(await row.getAttribute("data-stack")).toContain("|dbt|");
    }
    await expect(page.locator("html")).toHaveAttribute("data-sort", "tests");
  });

  test("the narrowing script is inline in <head>, not bundled", async ({ page }) => {
    await page.goto("/projects?stack=dbt");

    // Bundled, this script would be deferred past first paint and the full,
    // unsorted list would flash first. The assertion moved from "precedes the
    // grid" to "is in <head>" when the lens, the stack filter and the sort
    // became one control with one resolver.
    const inHead = await page.evaluate(() =>
      [...document.head.querySelectorAll("script:not([src])")].some((node) =>
        node.textContent?.includes("data-project"),
      ),
    );
    expect(inHead, "no inline narrowing script found in <head>").toBe(true);
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
      await expect(page.locator("main h1"), `${slug} has no title`).not.toBeEmpty();
      await expect(
        page.locator('meta[property="og:image"]'),
        `${slug} should point at its own OG card`,
      ).toHaveAttribute(
        "content",
        new RegExp(`/projects/${slug}/opengraph-image\\.png$`),
      );
    }
  });

  test("renders the header, metrics and neighbour navigation", async ({ page }) => {
    await page.goto("/projects/tfl-data-engineering");

    await expect(page.locator("main h1")).toHaveText(
      "London Cycle-Hire Analytics Platform",
    );
    // Catalogue number matches the log's, not a per-page counter.
    await expect(page.locator("header span.text-primary").first()).toHaveText("[ 01 ]");

    // Pinned metrics come from the MDX front matter, which validate-projects
    // gates against registry.json — a stale number fails CI before it ships.
    //
    // Located by `data-metric-value`, not by `.font-mono.text-2xl`. The class
    // string was a styling detail standing in for a contract: the values are
    // now `text-lg sm:text-2xl`, because at 320px each cell is ~90px and
    // `90.91%` in 24px mono was being clipped by the wrapper's overflow. The
    // metric was still rendered and still correct; only the class had moved.
    const metrics = page.locator("[data-metric-value]");
    await expect(metrics).not.toHaveCount(0);
    await expect(metrics.first()).not.toBeEmpty();

    const neighbours = page.getByRole("navigation", { name: "Project navigation" });
    await expect(neighbours.getByRole("link")).not.toHaveCount(0);
  });

  test("MDX renders through the .doc styles with numbered headings", async ({ page }) => {
    await page.goto("/projects/tfl-data-engineering");
    const doc = page.locator(".doc");
    await expect(doc).toBeVisible();
    await expect(doc.locator("h2")).not.toHaveCount(0);

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

test.describe("the canonical mark (2026-08-01 design audit, finding 01)", () => {
  /**
   * The mark rendered as `[ 05 ]` must be the SAME NUMBER for a given project on
   * every surface that shows it.
   *
   * It was not. Home numbered by position within the lens's featured array,
   * while /projects and the write-up numbered by a global publishedAt-descending
   * sort — so Agent Release Safety Gates was `01` on the home page and `05`
   * everywhere else, and London Cycle-Hire was `03` on home and `01` elsewhere.
   * IndexMark's own contract is that the mark is always TRUE, so this was a
   * defect rather than a cosmetic wrinkle, and it survived a full design pass,
   * a content reconciliation and two audits without anything going red.
   *
   * Nothing existing could have caught it: every assertion checked that A mark
   * rendered, never that the SAME mark rendered in two places. That is the gap
   * this closes.
   */
  test("a project shows one number on home, the index and its write-up", async ({
    page,
  }) => {
    const featured = registry.lenses.all.featured as string[];

    await page.goto("/");
    const onHome = new Map<string, string>();
    for (const slug of featured) {
      const card = page
        .locator(`[data-lens-panel="all"] article`)
        .filter({ has: page.locator(`a[href="/projects/${slug}"]`) });
      const mark = await card.locator("span.text-primary").first().textContent();
      onHome.set(slug, (mark ?? "").trim());
    }

    await page.goto("/projects");
    const onIndex = new Map<string, string>();
    for (const slug of featured) {
      const row = page
        .locator("[data-project]")
        .filter({ has: page.locator(`a[href="/projects/${slug}"]`) });
      const mark = await row.locator("[data-catalogue]").first().textContent();
      onIndex.set(slug, (mark ?? "").trim());
    }

    for (const slug of featured) {
      await page.goto(`/projects/${slug}`);
      const raw = await page.locator("header span.text-primary").first().textContent();
      const onWriteUp = (raw ?? "").replace(/[[\]\s]/g, "");

      expect(
        onHome.get(slug),
        `${slug}: home says ${onHome.get(slug)}, the index says ${onIndex.get(slug)}`,
      ).toBe(onIndex.get(slug));
      expect(
        onWriteUp,
        `${slug}: its own page says ${onWriteUp}, the index says ${onIndex.get(slug)}`,
      ).toBe(onIndex.get(slug));
    }
  });

  test("every rendered mark matches the registry, and none is positional", async ({
    page,
  }) => {
    // The registry is the single source. A mark computed from list position
    // would still agree with itself across surfaces while disagreeing with the
    // frozen value — this is what separates "consistent" from "correct".
    await page.goto("/projects");
    const rendered = await page.locator("[data-project]").evaluateAll((rows) =>
      rows.map((row) => ({
        slug: row.querySelector("a[href^='/projects/']")?.getAttribute("href") ?? "",
        mark: row.querySelector("[data-catalogue]")?.textContent?.trim() ?? "",
      })),
    );

    expect(rendered.length).toBeGreaterThan(0);
    for (const { slug, mark } of rendered) {
      const id = slug.replace("/projects/", "");
      const expected = String(spec(id).mark).padStart(2, "0");
      expect(mark, `${id} renders ${mark} but the registry says ${expected}`).toBe(
        expected,
      );
    }
  });
});
