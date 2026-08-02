import { expect, test } from "@playwright/test";

/**
 * About (design spec §04, 6a).
 *
 * The page's own claim is that the toolbox stopped being "a bare skills list …
 * a claim with nothing behind it". A count that is wrong, or a link that goes
 * somewhere other than the projects it claims, would make that claim false
 * while the page still looked right — so the tests follow the links rather
 * than reading the numbers.
 */

test.describe("about — the provenance toolbox", () => {
  test("every count matches the projects the filter actually returns", async ({
    page,
  }) => {
    // THE ASSERTION THAT MATTERS, and the one a snapshot could not make: the
    // number beside a tool has to equal the number of rows you land on when you
    // follow it. Two surfaces, one source — the same shape as the canonical
    // mark test, which exists because nothing checked that the SAME value
    // rendered in two places.
    await page.goto("/about");

    const tools = await page.locator("[data-tool-linked]").evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute("href") ?? "",
        name: link.childNodes[0]?.textContent?.trim() ?? "",
        count: Number(link.querySelector("span")?.textContent?.trim()),
      })),
    );
    expect(tools.length, "no tool carries a count at all").toBeGreaterThan(0);

    // Following all nineteen would be nineteen page loads on a single worker.
    // Three: the largest, the smallest, and one with a space in its name —
    // which is the case the `|`-delimited stack matching exists for.
    const sample = [
      tools.reduce((a, b) => (b.count > a.count ? b : a)),
      tools.reduce((a, b) => (b.count < a.count ? b : a)),
      tools.find((tool) => tool.name.includes(" ")) ?? tools[0]!,
    ];

    for (const tool of sample) {
      await page.goto(tool.href);
      await expect(
        page.locator("[data-project]:visible"),
        `${tool.name} claims ${tool.count} projects — the filter disagrees`,
      ).toHaveCount(tool.count);
    }
  });

  test("a practice with no project behind it carries no count and no link", async ({
    page,
  }) => {
    // The honesty half. The spec's complaint was that a bare list presents a
    // claim and a piece of evidence as the same kind of statement; this fails
    // if an unevidenced entry ever gains a link, or if the evidenced ones lose
    // theirs and everything flattens back into identical chips.
    await page.goto("/about");

    const unlinked = page.locator("[data-tool-unlinked]");
    await expect(
      unlinked,
      "every entry is evidenced — check the split still exists",
    ).not.toHaveCount(0);

    for (const item of await unlinked.all()) {
      await expect(item.locator("a")).toHaveCount(0);
      await expect(item).not.toHaveText(/\d/);
    }

    // And the standfirst counts them rather than asserting a number.
    const linked = await page.locator("[data-tool-linked]").count();
    const total = linked + (await unlinked.count());
    await expect(page.locator("[data-toolbox]")).toContainText(
      `${linked} of ${total} carry a project behind them`,
    );
  });
});

test.describe("about — the record rack", () => {
  test("is one rack, newest first, with a derived status on every entry", async ({
    page,
  }) => {
    // Three sections separated by ruler dividers became one dated record.
    // Chronology is the thing a reader is trying to reconstruct, so it has to
    // be the thing the page provides.
    await page.goto("/about");

    const rows = page.locator("[data-record]");
    await expect(rows).not.toHaveCount(0);

    const TOKENS = ["IN PROGRESS", "AWARDED", "VERIFIED", "SELF-PACED", "RECORDED"];
    const statuses = await rows.evaluateAll((entries) =>
      entries.map((entry) =>
        entry.querySelector("span:last-of-type")?.textContent?.trim(),
      ),
    );
    for (const status of statuses) {
      expect(TOKENS, `"${status}" is not one of the five tokens`).toContain(status);
    }

    // The MSc is in progress and the BSc is not — the two ends of the derivation.
    await expect(
      page.locator("[data-record]").filter({ hasText: "MSc Artificial Intelligence" }),
    ).toContainText("IN PROGRESS");
    await expect(
      page.locator("[data-record]").filter({ hasText: "BSc Computer Science" }),
    ).toContainText("AWARDED");
  });

  test("a verifiable credential links to its verification", async ({ page }) => {
    // VERIFIED is the only token that promises the reader something, so it has
    // to be backed by a link rather than by the word.
    await page.goto("/about");
    const verified = page.locator("[data-record]").filter({ hasText: "VERIFIED" });
    await expect(verified).not.toHaveCount(0);

    for (const entry of await verified.all()) {
      await expect(
        entry.getByRole("link", { name: /verify credential/i }),
        "an entry says VERIFIED with nothing to verify against",
      ).toBeVisible();
    }
  });
});

test.describe("about — the bio gets the page", () => {
  test("the bio is the largest body type on the site, and nothing is pinned beside it", async ({
    page,
  }) => {
    // "This is the only surface where you speak, and it was sharing attention
    // with a list of nouns." The toolbox was a sticky aside at every desktop
    // width; asserting the absence of `position: sticky` is what stops it
    // quietly coming back.
    await page.goto("/about");

    const bioSize = await page
      .locator("[data-bio] p")
      .first()
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
    expect(bioSize, "the bio is not set at 20px").toBeGreaterThanOrEqual(20);

    const sticky = await page.evaluate(
      () =>
        [...document.querySelectorAll("main *")].filter(
          (el) => getComputedStyle(el).position === "sticky",
        ).length,
    );
    expect(sticky, "something is pinned beside the bio again").toBe(0);

    // Larger than the home page's standfirst, which is the comparison that
    // makes "largest body type on the site" a fact rather than a wish.
    await page.goto("/");
    const heroSize = await page
      .locator("main p")
      .first()
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
    expect(bioSize).toBeGreaterThan(heroSize);
  });
});
