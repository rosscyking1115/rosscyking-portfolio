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
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const OUT_DIR = path.join(process.cwd(), "public/projects/screenshots");
const VIEWPORT = { width: 1600, height: 1000 };

/** slug -> demo URL. `streamlit: true` enables wake-up + embed handling. */
const TARGETS = [
  {
    slug: "internal-ai-agent-eval-lab",
    url: "https://agent-release-gates.streamlit.app/?embed=true",
    streamlit: true,
  },
  {
    slug: "neobank-product-analytics",
    url: "https://neobank-appuct-analytics.streamlit.app/?embed=true",
    streamlit: true,
  },
  {
    slug: "marketing-effectiveness-lab",
    url: "https://marketing-effectiveness-lab.streamlit.app/?embed=true",
    streamlit: true,
  },
  {
    // The legacy Streamlit dashboard was retired; the GitHub Pages report is
    // the public visual until the renter-facing app gets a public URL.
    slug: "uk-property-analytics",
    url: "https://rosscyking1115.github.io/uk-housing-decision-support/",
    streamlit: false,
  },
  {
    // Dismiss the first-visit region picker by choosing the UK edition.
    slug: "cited-market-brief-agent",
    url: "https://cited-market-brief-agent.vercel.app",
    streamlit: false,
    clickText: "United Kingdom",
  },
  {
    slug: "fromatob-file-converter",
    url: "https://fromatob.app",
    streamlit: false,
  },
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
  await page
    .frameLocator('iframe[src*="/~/"]')
    .locator('[data-testid="stAppViewContainer"]')
    .waitFor({ state: "visible", timeout: 300_000 });
  // Charts and dataframes stream in after the container mounts.
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(4_000);
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
      await page.waitForTimeout(1_500);
    }
    if (target.clickText) {
      await page.getByText(target.clickText, { exact: true }).first().click();
      await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
    const file = path.join(OUT_DIR, `${target.slug}.png`);
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
