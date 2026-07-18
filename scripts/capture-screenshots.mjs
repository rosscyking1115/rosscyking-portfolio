#!/usr/bin/env node
/**
 * Capture live-demo screenshots for the featured-work showcase.
 *
 *   npm run shots            # capture every target
 *   npm run shots -- neobank # capture targets whose slug includes "neobank"
 *
 * Output: public/projects/screenshots/<slug>.png (1600x1000 @1x).
 * Streamlit Community Cloud apps sleep after inactivity — the script clicks
 * the wake-up button and waits for the app to render before shooting.
 * Screenshots are committed, so a failed capture never breaks the build;
 * re-run locally when a demo's UI changes.
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public/projects/screenshots");
const VIEWPORT = { width: 1600, height: 1000 };

/**
 * Per-slug capture quirks (mechanics, not facts). The LIST of what to shoot
 * and each demo URL is DERIVED FROM content/projects/registry.json below, so a
 * new or renamed demo can never be missed or left stale here. Only the handful
 * of capture tweaks a demo needs live in this override map.
 */
const OPTIONS = {
  // Render's free tier cold-starts slowly — give the first load extra settle.
  "cashflow-risk": { settleMs: 45_000 },
  // First visit shows a region picker then a 3-step tour: pick UK, skip tour.
  "cited-market-brief-agent": { clickSequence: ["United Kingdom", "Skip"] },
};

const registry = JSON.parse(
  await readFile(path.join(ROOT, "content/projects/registry.json"), "utf8"),
);

// One target per project that has a live demo. Streamlit Community Cloud apps
// (…streamlit.app) get wake-up + embed handling; the embed suffix is inferred.
const projectTargets = Object.entries(registry.projects)
  .filter(([, spec]) => spec.demo)
  .map(([slug, spec]) => {
    const streamlit = spec.demo.includes("streamlit.app");
    const url = streamlit
      ? `${spec.demo}${spec.demo.includes("?") ? "&" : "?"}embed=true`
      : spec.demo;
    return { slug, url, streamlit, ...(OPTIONS[slug] ?? {}) };
  });

// The live site itself is not a registry project — shot into docs/ for the README.
const TARGETS = [
  {
    slug: "site-home",
    url: "https://rosscyking.com",
    streamlit: false,
    out: "docs/site-home.png",
  },
  ...projectTargets,
];

async function wakeStreamlit(page) {
  // Sleeping apps show a wake-up interstitial. `isVisible()` doesn't wait, so
  // give the interstitial a moment to render before deciding it isn't there.
  const wakeButton = page.locator('[data-testid="wakeup-button-viewer"]');
  const asleep = await wakeButton
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (asleep) {
    console.log("    app is asleep — waking it (can take a few minutes)…");
    await wakeButton.click();
  }
  // Community Cloud serves the app inside an iframe (…/~/+/). Wait for the
  // Streamlit root to render real content inside that frame.
  const app = page.frameLocator('iframe[src*="/~/"]');
  await app
    .locator('[data-testid="stAppViewContainer"]')
    .waitFor({ state: "visible", timeout: 300_000 });
  // The container mounts before the script finishes — charts, metrics, and
  // dataframes stream in after. Wait for actual rendered content (a chart,
  // metric, or table) so we don't shoot a half-painted page.
  await app
    .locator(
      '[data-testid="stPlotlyChart"], [data-testid="stVegaLiteChart"], [data-testid="stMetric"], [data-testid="stDataFrame"], [data-testid="stArrowVegaLiteChart"]',
    )
    .first()
    .waitFor({ state: "visible", timeout: 180_000 });
  // Let the "running" status widget clear and charts finish drawing.
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(8_000);
}

async function capture(browser, target) {
  const page = await browser.newPage({ viewport: VIEWPORT, colorScheme: "light" });
  try {
    console.log(`  ${target.slug}`);
    await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (target.streamlit) {
      await wakeStreamlit(page);
    } else {
      await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(target.settleMs ?? 1_500);
    }
    for (const label of target.clickSequence ?? []) {
      // Each click dismisses an onboarding overlay; some render after a beat,
      // so wait for the control before clicking and ignore any that don't show.
      const control = page.getByText(label, { exact: true }).first();
      if (await control.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await control.click();
        await page.waitForTimeout(1_500);
      }
    }
    const file = target.out
      ? path.join(process.cwd(), target.out)
      : path.join(OUT_DIR, `${target.slug}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file });
    console.log(`    saved ${path.relative(process.cwd(), file)}`);
    return true;
  } catch (error) {
    console.error(`    FAILED: ${error.message.split("\n")[0]}`);
    return false;
  } finally {
    await page.close();
  }
}

const filter = process.argv[2];
const targets = filter ? TARGETS.filter((t) => t.slug.includes(filter)) : TARGETS;
if (targets.length === 0) {
  console.error(`No screenshot target matches "${filter}".`);
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
console.log(`Capturing ${targets.length} screenshot(s)…`);
let failures = 0;
for (const target of targets) {
  if (!(await capture(browser, target))) failures += 1;
}
await browser.close();
console.log(
  failures === 0 ? "All captures succeeded." : `${failures} capture(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
