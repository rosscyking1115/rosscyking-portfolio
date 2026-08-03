import { expect, test } from "@playwright/test";

import { ROUTES } from "./routes";

/**
 * R9 — one band and one major section per route.
 *
 * This gate is the design pass's own merge check, quoted from it:
 *
 *   "On each route count: exactly one #f0f1f3 full-bleed block or zero;
 *    exactly one 32px heading; no 28px headings anywhere. Any route failing
 *    that count has not been converted."
 *
 * ── WHY A COUNT AND NOT A LOOK ───────────────────────────────────────────────
 * R9 is a QUOTA, not a set of sizes. Four heading sizes with no limit on how
 * often each may be used is a worse problem than one heading size used
 * everywhere — it is the same flatness with more vocabulary. The sizes are only
 * how a reader tells which rung they are on; the rule is that a route gets one
 * loud thing and one louder thing and no more.
 *
 * A quota cannot be enforced by review. Nobody reads a page and notices it now
 * has two 32px headings, because two 32px headings look completely normal. It
 * has to be counted, per route, by something that does not get bored.
 */

/**
 * Routes not yet converted, each with the reason and what unblocks it.
 *
 * Named rather than skipped silently, because a pending list that is invisible
 * is a pending list that becomes permanent. Every entry here is a route the
 * design pass has an allocation for and this repository has not applied yet.
 */
const PENDING: Record<string, string> = {
  "/": "blocked on open item 10 — Ross has not chosen 18a, 18b or 18c",
  // The rail and the BAND landed with build-order step 4; what is left is the
  // .doc heading scale. R9 gives this route MAJOR = "Method", and marking ONE
  // authored <h2> as the major rung needs authored data — the same argument
  // recorded for the summary/full toggle. `.doc h2` is 25.6px on every write-up
  // until then, which is off the ladder, which is why this stays here.
  "/projects/agent-release-gates":
    "the .doc heading scale — MAJOR is an authored h2 and needs registry data to name it",
  "/contact": "build-order step 5 — needs the same grid and the receipt state",
};

/** The R9 rung sizes, in the px getComputedStyle reports. */
const MAJOR = 32;
const MINOR = 22;

test.describe("R9 — the section ladder", () => {
  for (const route of ROUTES) {
    const pending = PENDING[route];

    test(`${route} obeys the quota${pending ? " (pending)" : ""}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const counted = await page.evaluate(() => {
        const describe = (el: Element) =>
          `${el.tagName.toLowerCase()} "${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40)}"`;

        // A BAND is full-bleed and filled. Detected by geometry and colour
        // rather than by an attribute, so a band that forgets to declare itself
        // is still counted — the quota is about what the reader sees.
        const muted = getComputedStyle(document.documentElement)
          .getPropertyValue("--muted")
          .trim();
        const bands: string[] = [];
        for (const el of document.querySelectorAll("main *")) {
          const box = el.getBoundingClientRect();
          if (box.width < window.innerWidth - 1) continue;
          if (box.height < 40) continue;
          const bg = getComputedStyle(el).backgroundColor;
          if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") continue;
          // Resolve the token to the same rgb() form the browser reports.
          const probe = document.createElement("div");
          probe.style.color = muted;
          document.body.append(probe);
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          if (bg === resolved) bands.push(describe(el));
        }

        // Section headings. Three exclusions, each with a reason rather than a
        // convenience:
        //
        //   <h1>          The page's own title, not a rung. R9 legislates the
        //                 ladder BELOW the page name, and one h1 per page is
        //                 already asserted elsewhere.
        //   li, article   A heading that titles a repeated ITEM is not a
        //                 section heading. Every instrument row carries an h3
        //                 with the project's name; ten rows are one section,
        //                 not ten. Counting them would make the quota
        //                 unsatisfiable on every list surface on the site.
        //   .doc          The write-up body is a long-form document with its
        //                 own numbered heading scale. R9 has an allocation for
        //                 that route and it is applied with the sticky-rail
        //                 pass; until then it is in PENDING above.
        //
        // The first run of this gate omitted all three and reported the row
        // titles on /projects, /about and /404 as ladder violations at 16px —
        // three failures that were entirely the selector's fault.
        const sections = [...document.querySelectorAll("main h2, main h3")]
          .filter((el) => !el.closest("li, article, .doc"))
          .map((el) => ({
            el: describe(el),
            size: Math.round(Number.parseFloat(getComputedStyle(el).fontSize)),
          }));

        return { bands, sections };
      });

      const majors = counted.sections.filter((s) => s.size === MAJOR);
      const offLadder = counted.sections.filter(
        (s) => s.size !== MAJOR && s.size !== MINOR,
      );

      if (pending) {
        // Still asserted, just inverted: a pending route is EXPECTED to fail the
        // ladder. When one starts passing by accident the reason has gone stale
        // and this says so, which is the only way a pending list stays honest.
        expect(
          majors.length === 1 && offLadder.length === 0 && counted.bands.length <= 1,
          `${route} now satisfies R9, but is still listed as pending: ${pending}`,
        ).toBe(false);
        return;
      }

      expect(
        counted.bands,
        `${route}: R9 allows at most one full-bleed band`,
      ).toHaveLength(Math.min(counted.bands.length, 1));
      expect(counted.bands.length, `${route}: more than one band`).toBeLessThanOrEqual(1);
      expect(majors, `${route}: R9 allows exactly one MAJOR heading`).toHaveLength(1);
      expect(
        offLadder,
        `${route}: headings off the ladder — every section heading is 32px (MAJOR) or 22px (MINOR), and 28px is abolished`,
      ).toEqual([]);
    });
  }
});
