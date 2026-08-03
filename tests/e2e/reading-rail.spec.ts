import { expect, test } from "@playwright/test";

/**
 * The write-up's rail (execution audit, finding 03).
 *
 * The audit's measurement was a ratio, not a look: "the write-up is 5,852px at
 * 1440 and 7,643px at 390. The viewport narrows by 73% and the page grows 31%.
 * Every other route pays between 45% and 87% for the same narrowing." A page
 * that barely grows when the viewport collapses is a page that was never using
 * the width — the desktop layout was the mobile layout with margins.
 *
 * So the assertions here are geometric. Nothing in this file checks that
 * something "looks right"; it checks that the numbers the spec gives are the
 * numbers on the page, and that moving four things into a rail did not quietly
 * duplicate them.
 */

const ROUTE = "/projects/agent-release-gates";

test.describe("the reading rail", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("is 680 + 352 with a 120px gutter, and the three add up to 1152", async ({
    page,
  }) => {
    // THE NUMBERS ADD UP EXACTLY, which is why they are literals in the source
    // rather than fractions. 680 + 120 + 352 = 1152, the site's one wide
    // measure. A later tidy-up to `grid-cols-[2fr_1fr]` would look identical in
    // review, keep the rail on the right, and put the prose at 728px — off the
    // reading measure that every other prose surface on the site uses.
    await page.goto(ROUTE);

    const box = await page.evaluate(() => {
      const prose = document.querySelector(".doc")!.getBoundingClientRect();
      const rail = document
        .querySelector('aside[aria-label="Write-up navigation"]')!
        .getBoundingClientRect();
      return {
        prose: Math.round(prose.width),
        rail: Math.round(rail.width),
        gutter: Math.round(rail.left - prose.right),
      };
    });

    expect(box).toEqual({ prose: 680, rail: 352, gutter: 120 });
    expect(box.prose + box.gutter + box.rail).toBe(1152);
  });

  test("the rail sticks, and the page does not scroll it separately", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const rail = page.locator('aside[aria-label="Write-up navigation"] > div');
    await expect(rail).toHaveCSS("position", "sticky");
    // 96px — the spec's number, and the height the sticky header occupies.
    await expect(rail).toHaveCSS("top", "96px");
  });

  test("the cross-references MOVED into the rail — they were not copied", async ({
    page,
  }) => {
    // The failure this exists for is the obvious way to build a rail: leave the
    // prev/next nav at the foot and render another one beside the prose. Both
    // are in the accessible tree, both are in the tab order, and a screen
    // reader announces the next project twice on every write-up.
    await page.goto(ROUTE);
    await expect(
      page.getByRole("navigation", { name: "Project navigation" }),
    ).toHaveCount(1);
    await expect(
      page.locator('aside[aria-label="Write-up navigation"] [data-cross-references]'),
    ).toBeVisible();
  });

  test("every track entry points at a heading that exists", async ({ page }) => {
    // The track is derived from `render()`'s headings rather than authored, so
    // it cannot list a section that is not there — unless the slugs stop
    // matching, which is exactly the kind of thing that breaks silently when a
    // markdown pipeline changes its id generation.
    await page.goto(ROUTE);
    const links = page.locator("[data-track-link]");
    await expect(links).not.toHaveCount(0);

    const orphans = await links.evaluateAll((els) =>
      els
        .map((el) => el.getAttribute("data-track-link")!)
        .filter((slug) => !document.getElementById(slug)),
    );
    expect(orphans, "track entries with no heading to jump to").toEqual([]);
  });

  test("the track marks where the reader is, and marks exactly one", async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForLoadState("networkidle");

    // Scroll to a heading in the middle of the document and let the observer
    // settle. `expect.poll` rather than a snapshot: the mark is set from an
    // IntersectionObserver callback, and reading it synchronously after a
    // scroll is the mistake this suite has now made four times.
    const target = await page
      .locator("[data-track-link]")
      .nth(3)
      .getAttribute("data-track-link");
    await page.evaluate((slug: string) => {
      document
        .getElementById(slug)!
        .scrollIntoView({ behavior: "instant", block: "start" });
    }, target!);

    await expect
      .poll(async () => page.locator('[data-track-link][aria-current="true"]').count())
      .toBe(1);
    await expect(page.locator(`[data-track-link="${target}"]`)).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("the finding is a full-bleed band, and the only one on the route", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const band = page.locator("[data-finding-band]");
    await expect(band).toHaveCount(1);

    const full = await band.evaluate(
      (el) => Math.round(el.getBoundingClientRect().width) >= window.innerWidth - 1,
    );
    expect(full, "the finding band is not full-bleed").toBe(true);
  });
});

test.describe("the rail below xl", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("keeps the cross-references and drops the desktop-only apparatus", async ({
    page,
  }) => {
    // The track and the metrics are xl-only, and the reason is the audit's own
    // measurement rather than taste: this route is already the longest on the
    // site at 390, so anything that renders at the foot instead of beside the
    // prose is answering "the desktop layout is the mobile layout with margins"
    // by making the mobile layout longer. The cross-references stay because
    // they were at the foot before the rail existed.
    await page.goto(ROUTE);
    await expect(page.locator("[data-reading-track]")).toBeHidden();
    await expect(page.locator("[data-rail-metrics]")).toBeHidden();
    await expect(page.locator("[data-cross-references]")).toBeVisible();
  });
});
