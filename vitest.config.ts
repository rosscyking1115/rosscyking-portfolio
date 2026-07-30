import { getViteConfig } from "astro/config";

/**
 * Unit tests, carried across at cutover.
 *
 * The Next app ran 30 vitest tests over six files. Deleting `src/` deleted
 * everything they imported, and the CI job is a REQUIRED check — so a suite
 * that "passes" because its tests were removed would be worse than one that
 * fails. All 30 are accounted for; each file carries a note on what changed.
 *
 * `getViteConfig` is Astro's own helper: it hands vitest the project's real
 * Vite pipeline, which is what lets tests/unit/ui-components.test.ts compile
 * and render actual `.astro` components through the Container API.
 *   https://docs.astro.build/en/guides/testing/#vitest
 *
 * TYPING NOTE. Astro types `getViteConfig`'s argument as Vite's own
 * `UserConfig`, which has no `test` key — so this file, which is the documented
 * usage and works correctly at runtime, fails `astro check` with ts(2353).
 * `mergeConfig` is not an escape: `getViteConfig` returns a lazy config
 * function, not a plain object, so merging it breaks the Vite server outright.
 *
 * The file is therefore excluded in tsconfig.json rather than cast to `any`.
 * It is build tooling typed by vitest, not application code, and silencing the
 * error with a cast would hide any real one that appeared later.
 */
export default getViteConfig({
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Only the modules the unit tests actually exercise. Coverage over the
      // whole app would be dominated by .astro files these tests do not touch
      // and cannot meaningfully cover — that is the e2e suite's job.
      include: [
        "src/lib/utils.ts",
        "src/lib/theme.ts",
        "src/lib/contact-schema.ts",
        "src/lib/email-template.ts",
        "src/lib/button-variants.ts",
        "src/lib/badge-variants.ts",
      ],
    },
  },
});
