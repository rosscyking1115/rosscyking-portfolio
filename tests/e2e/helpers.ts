import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

interface A11yOptions {
  /**
   * Extra axe rules to disable. Use sparingly — every disable is a debt.
   * Document WHY in a comment next to the call site.
   */
  disableRules?: string[];
}

export async function expectNoA11yViolations(page: Page, opts: A11yOptions = {}) {
  // Settle entrance animations so contrast is measured on final colors, not on
  // text caught mid-fade. FadeIn renders content fully under reduced motion.
  await page.emulateMedia({ reducedMotion: "reduce" });

  let builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);

  if (opts.disableRules?.length) {
    builder = builder.disableRules(opts.disableRules);
  }

  const results = await builder.analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}
