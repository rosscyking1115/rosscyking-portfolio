/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 90,
  tabWidth: 2,
  useTabs: false,
  arrowParens: "always",
  endOfLine: "lf",
  // prettier-plugin-astro must come before the Tailwind plugin: the Tailwind
  // class sorter runs as a post-processor over whatever parser produced the
  // AST, so it needs the Astro parser already registered.
  plugins: ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  overrides: [{ files: "*.astro", options: { parser: "astro" } }],
};

export default config;
