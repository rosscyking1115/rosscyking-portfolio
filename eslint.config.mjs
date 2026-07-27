import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dev tooling (Node scripts), not application code.
    "scripts/**",
    // The Astro app is a self-contained project with its own toolchain
    // (`astro check`, its own tsconfig/prettier). Linting it with
    // eslint-config-next would judge Astro code by Next's rules.
    // Remove this when astro/ is promoted to the repo root.
    "astro/**",
  ]),
]);

export default eslintConfig;
