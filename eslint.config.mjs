import { defineConfig, globalIgnores } from "eslint/config";
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

/**
 * Rewritten at cutover.
 *
 * The previous config was `eslint-config-next` (core-web-vitals + typescript),
 * which cannot survive the removal of Next: the package is gone, and its rules
 * judge React/Next idioms this codebase no longer contains.
 *
 * The replacement keeps a real lint gate rather than quietly dropping one —
 * typescript-eslint for the `.ts`/`.tsx` that remains (the contact island, the
 * form controls, the OG card renderer), and eslint-plugin-astro for `.astro`
 * files, which understands the frontmatter/template split that plain TS
 * parsing chokes on.
 *
 * Type checking is NOT duplicated here. `astro check` owns it, and that is what
 * `npm run typecheck` runs.
 */
export default defineConfig([
  globalIgnores([
    "dist/**",
    ".astro/**",
    ".vercel/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    // Dev tooling (Node scripts), not application code.
    "scripts/**",
    // The vendored design mocks and their runtime. Third-party, bundled, and
    // explicitly not to be ported — the spec says so and docs/design-bundle's
    // own README repeats it. Linting someone else's minified runtime reports
    // seven findings about code nobody may change.
    "docs/design-bundle/**",
  ]),
  tseslint.configs.recommended,
  astro.configs.recommended,
]);
