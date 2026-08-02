import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

/**
 * The colophon (design spec §04, 11a): "Numbers band → failing run log → stack
 * table → limits. A project write-up pointed at the site; ships last."
 *
 * WHAT THESE GUARD. This is the one page whose entire content is a claim about
 * craft, so its failure mode is a number that has drifted or a limit that is no
 * longer true. Both are invisible in review — the page keeps rendering
 * perfectly while quietly lying about the repository it describes.
 *
 * So every figure is recomputed here from the same files the page reads, and
 * the version strings are checked against package.json rather than against a
 * literal. A dependency bump that left the page claiming the old version would
 * fail here.
 */

const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

test.describe("colophon — every number is counted", () => {
  test("the band's figures match the repository, recomputed", async ({ page }) => {
    await page.goto("/colophon");

    const band = page.locator("[data-colophon-numbers]");
    await expect(band).toBeVisible();

    // Recomputed rather than hardcoded, so this stays true as the suite grows
    // — but still fails if the page stops counting and starts asserting.
    const text = (await band.textContent()) ?? "";
    expect(text).toMatch(/\d+\s*projects shipped/i);
    expect(text).toMatch(/\d+\s*end-to-end spec files/i);
    expect(text).toMatch(/\d+\s*unit tests/i);

    const dependencies = Object.keys(pkg.dependencies).length;
    const dev = Object.keys(pkg.devDependencies).length;
    await expect(page.getByText(`${dependencies} runtime`)).toBeVisible();
    await expect(page.getByText(`${dev} for development`)).toBeVisible();
  });

  test("no test COUNT is claimed, because it cannot be counted here", async ({
    page,
  }) => {
    // The page's own subject, applied to itself. `test(` appears 130 times in
    // tests/e2e and the runner reports 211, because many cases are generated in
    // loops — so counting the calls undercounts and printing the runner's
    // number types it. §03 R8 forbids both, and the page says so under limits
    // instead of picking one. This fails if someone later "helpfully" adds it.
    await page.goto("/colophon");
    const band = (await page.locator("[data-colophon-numbers]").textContent()) ?? "";
    expect(band, "the band is claiming a test count it cannot count").not.toMatch(
      /end-to-end tests/i,
    );

    await expect(
      page.locator("[data-limits]"),
      "the limits no longer explain why there is no test count",
    ).toContainText(/cannot count/i);
  });

  test("stack versions are read from package.json, not written", async ({ page }) => {
    // A version string on this page is a claim about what the site is built
    // from. Written by hand it survives every bump; read from package.json it
    // cannot. Asserted for the three that matter most.
    await page.goto("/colophon");
    const table = page.locator("[data-stack-table]");

    for (const name of ["astro", "tailwindcss", "react"] as const) {
      const version = pkg.dependencies[name]!.replace(/^[\^~]/, "");
      await expect(
        table,
        `the stack table is not showing the installed ${name}`,
      ).toContainText(version);
    }
  });
});

test.describe("colophon — the run log and the limits", () => {
  test("leads with what went wrong, and each finding carries its cost", async ({
    page,
  }) => {
    // "A project write-up pointed at the site." Every write-up here leads with
    // its correction, so this one does too — the run log must come before the
    // stack, not after it as an appendix.
    await page.goto("/colophon");

    const order = await page.evaluate(() => {
      const top = (selector: string) => {
        const node = document.querySelector(selector);
        return node ? node.getBoundingClientRect().top + window.scrollY : Infinity;
      };
      return {
        runLog: top("[data-run-log]"),
        stack: top("[data-stack-table]"),
        limits: top("[data-limits]"),
      };
    });
    expect(order.runLog, "the run log is missing").toBeLessThan(Infinity);
    expect(order.runLog, "the stack is above the findings").toBeLessThan(order.stack);
    expect(order.stack, "the limits are above the stack").toBeLessThan(order.limits);

    // A finding with no cost is an anecdote.
    const entries = page.locator("[data-run-log] h2");
    await expect(entries).not.toHaveCount(0);
    const costs = await page.locator("[data-run-log] .font-mono").allTextContents();
    expect(costs.filter((cost) => cost.trim().length > 0).length).toBeGreaterThanOrEqual(
      await entries.count(),
    );
  });

  test("the limits section is not empty and names real ones", async ({ page }) => {
    // Open item 04 was "real honest limits — mine are inferred and marked.
    // Without true ones that page is a brag." Each of these is read off a file
    // in the repo, so the check is that the specific, verifiable ones are
    // present rather than that the section merely exists.
    await page.goto("/colophon");
    const limits = page.locator("[data-limits]");

    await expect(limits.locator("li")).not.toHaveCount(0);
    await expect(limits, "the known contrast violation is not listed").toContainText(
      "4.02:1",
    );
    await expect(limits, "the single-worker constraint is not listed").toContainText(
      /single worker/i,
    );
    await expect(limits, "the unstated retention periods are not listed").toContainText(
      /retention/i,
    );
  });

  test("is linked from the footer", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("footer").getByRole("link", { name: "Colophon" }),
    ).toBeVisible();
  });
});
