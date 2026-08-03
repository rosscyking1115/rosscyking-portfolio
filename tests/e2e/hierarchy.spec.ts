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
const PENDING: Record<string, string> = {};

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
          if (!el.checkVisibility()) continue;
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
        //   REPEATED       A heading that titles a repeated ITEM is not a
        //   ITEMS          section heading. Every instrument row carries an h3
        //                  with the project's name; ten rows are one section,
        //                  not ten.
        //
        //                  Named by the hooks the items actually use, NOT by
        //                  `article`. It was `li, article` for one run, and the
        //                  write-up wraps its whole body in an <article> for
        //                  semantic reasons — so the moment that route came off
        //                  the pending list the gate reported it as having zero
        //                  MAJOR headings while the page had exactly one, at
        //                  32px, verifiably. A convenience selector that had
        //                  been silently excluding an entire route since the
        //                  day it was written.
        //   .doc h3       A SUB-heading inside a long-form document, not a
        //                 section. `.doc h2` IS counted — the write-up's ladder
        //                 was the last route converted, and excluding the whole
        //                 `.doc` would have left the one page with nine equal
        //                 sections passing a gate about section hierarchy.
        //
        // The first run of this gate omitted all three and reported the row
        // titles on /projects, /about and /404 as ladder violations at 16px —
        // three failures that were entirely the selector's fault.
        // VISIBLE ONLY, and this is a fourth exclusion with a fourth reason.
        // The home page prerenders one panel per lens and shows the chosen one
        // with CSS, so the document carries three MAJOR headings and the reader
        // sees one. R9 is a quota on what is on the SCREEN — a rule about
        // hierarchy cannot be enforced against markup nobody is looking at.
        //
        // `checkVisibility()` with its defaults excludes `display: none` and
        // keeps opacity-0 elements, which is the right way round here too: a
        // heading held at zero opacity by an arrival is still a heading on the
        // page, and hiding it from the count would let a route smuggle a second
        // MAJOR in behind an entrance.
        const sections = [...document.querySelectorAll("main h2, main h3")]
          .filter((el) => el.checkVisibility())
          .filter((el) => !el.closest("li, [data-instrument], [data-rack] article"))
          .filter((el) => !(el.tagName === "H3" && el.closest(".doc")))
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
