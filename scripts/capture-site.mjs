#!/usr/bin/env node
/**
 * Capture the site itself, for a design pass.
 *
 *   npm run shots:site
 *
 * Output: docs/design-pass/<route>-<viewport>-<theme>.png, gitignored.
 *
 * ── WHY THIS IS NOT `npm run shots` ──────────────────────────────────────────
 * That script captures the LIVE DEMOS the project cards embed — other people's
 * running applications, committed to public/ because a failed capture must not
 * break the build. This captures THIS site, for uploading to a design session,
 * and the two have opposite requirements: those are small, stable and belong in
 * the repo; these are large, regenerate in a minute, and would add megabytes per
 * pass to a repository that has no use for last month's screenshots.
 *
 * ── THE ROUTES ARE DERIVED, NOT LISTED ───────────────────────────────────────
 * Same reasoning as tests/e2e/routes.ts, which found a real accessibility
 * violation the moment it replaced three hardcoded lists: a page written by hand
 * cannot fail for a route that is not on it. A design brief assembled from a
 * hand-written list has the same blind spot — the designer reviews what someone
 * remembered to send, and /privacy goes another quarter without being looked at.
 *
 * ── AND IT WAITS FOR THE ARRIVAL ─────────────────────────────────────────────
 * The home page animates on load (see the MOTION CONTRACT in global.css), so a
 * naive capture photographs the masthead mid-fade at 1.25:1 and the rack at zero
 * opacity. Every shot waits for document-timeline animations to finish and walks
 * the page first, so the scroll-triggered arrivals have all fired.
 */
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs/design-pass");
const BASE = process.env.SITE_URL ?? "http://localhost:4321";

/** Read the route list off src/pages, the same way the e2e suite does. */
async function routes() {
  const pagesDir = path.join(ROOT, "src", "pages");
  const found = [];

  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Dev-only fixtures are not routes on the built site.
        if (entry.name === "dev-fixtures") continue;
        await walk(full);
        continue;
      }
      if (!/\.(astro|md|mdx)$/.test(entry.name)) continue;

      const rel = path.relative(pagesDir, full).replace(/\\/g, "/");
      // Dynamic segments need a real slug; one representative is enough for a
      // design pass, and it is the reading instrument's own project.
      if (rel.includes("[")) continue;
      const route =
        "/" + rel.replace(/\.(astro|md|mdx)$/, "").replace(/(^|\/)index$/, "");
      found.push(route === "" ? "/" : route);
    }
  }

  await walk(pagesDir);
  found.push("/projects/agent-release-gates");
  return [...new Set(found)].sort();
}

const SHOTS = [
  { name: "desktop", width: 1440, height: 900, themes: ["light", "dark"] },
  { name: "tablet", width: 768, height: 1024, themes: ["light"] },
  { name: "mobile", width: 390, height: 844, themes: ["light"] },
];

const slug = (route) => (route === "/" ? "home" : route.slice(1).replace(/\//g, "-"));

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const list = await routes();
let count = 0;

for (const shot of SHOTS) {
  for (const theme of shot.themes) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
      colorScheme: theme,
      deviceScaleFactor: 2,
    });
    // The site's own toggle wins over the OS and reads a cookie, so set both or
    // every capture is of a `system` visitor.
    await context.addCookies([
      { name: "theme", value: theme, domain: "localhost", path: "/" },
    ]);
    const page = await context.newPage();

    for (const route of list) {
      await page.goto(BASE + route, { waitUntil: "networkidle" });

      // Fire every scroll-triggered arrival, then return to the top.
      await page.evaluate(async () => {
        const step = window.innerHeight / 2;
        for (let y = 0; y <= document.body.scrollHeight; y += step) {
          window.scrollTo({ top: y, behavior: "instant" });
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        window.scrollTo({ top: 0, behavior: "instant" });
      });

      // Nothing is still moving. A scroll or view timeline never finishes by
      // design, so only document-timeline animations are waited on.
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .every(
            (animation) =>
              animation.timeline?.constructor.name !== "DocumentTimeline" ||
              animation.playState === "finished",
          ),
      );

      const file = path.join(OUT_DIR, `${slug(route)}-${shot.name}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: true });
      count += 1;
      console.log(`  ${path.basename(file)}`);
    }

    await context.close();
  }
}

await browser.close();
console.log(`\n${count} screenshot(s) in docs/design-pass/`);
