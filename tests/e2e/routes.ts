import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Every HTML route a visitor can reach, DERIVED from src/pages.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * The accessibility gate, the responsive gate and the motion gate each carried
 * their own hardcoded list of routes. Every one of them looked comprehensive.
 * None of them noticed when /privacy and /colophon shipped: two new pages,
 * three gates, zero coverage, and nothing went red — because a hardcoded list
 * cannot fail for something that is not on it.
 *
 * That is the defect this repository keeps finding in itself. AGENTS.md states
 * it plainly: "a test suite verifies that what exists behaves correctly. It
 * says nothing about what should exist and does not." A route list written by
 * hand is the same shape of blind spot one level up — the gate is only as
 * complete as the last person to remember it.
 *
 * So the list is read off the filesystem. Adding a page to src/pages adds it to
 * the accessibility scan, the viewport-fit sweep and the motion sweep, in both
 * themes, without anyone deciding to.
 *
 * ── WHAT IS EXCLUDED, AND WHY EACH ONE IS SAFE ───────────────────────────────
 *   *.ts endpoints        icons, manifest, robots, sitemap, OG cards. Not HTML,
 *                         so there is nothing to scan for contrast or overflow.
 *   dev-fixtures/         `getStaticPaths` returns [] outside DEV, so these are
 *                         not routes on the built site at all. completeness.spec.ts
 *                         already asserts their absence from the output.
 *   [slug] directories    one representative is named below, because scanning
 *                         ten write-ups of the same component is ten times the
 *                         runtime for the same finding.
 */
const PAGES_DIR = join(process.cwd(), "src", "pages");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Dev-only fixtures are not routes on the built site.
      return entry === "dev-fixtures" ? [] : walk(full);
    }
    return entry.endsWith(".astro") ? [full] : [];
  });
}

/** `src/pages/projects/index.astro` → `/projects`; `index.astro` → `/`. */
function toRoute(file: string): string | null {
  const rel = relative(PAGES_DIR, file).split(sep).join("/");
  // Dynamic segments cannot be enumerated without the content collection, and
  // one representative of each is named in REPRESENTATIVE below.
  if (rel.includes("[")) return null;
  const path = rel.replace(/\.astro$/, "").replace(/(^|\/)index$/, "");
  return `/${path}`.replace(/\/$/, "") || "/";
}

/**
 * One page per dynamic route, named explicitly.
 *
 * agent-release-gates rather than the first slug alphabetically: it is the only
 * write-up with fenced code (so it exercises the Shiki contrast the a11y gate
 * asserts by value) AND the only one whose headline is a correction (so the
 * finding band renders its struck pair). A representative that exercises the
 * fewest branches is not a representative.
 */
const REPRESENTATIVE = ["/projects/agent-release-gates"];

/** The 404, which has no file-based route but is a page a visitor can reach. */
const NOT_FOUND = "/no-such-page-exists";

export const ROUTES: string[] = [
  ...walk(PAGES_DIR)
    .map(toRoute)
    .filter((route): route is string => route !== null && route !== "/404"),
  ...REPRESENTATIVE,
  NOT_FOUND,
].sort();

/** A readable name per route, for test titles and failure messages. */
export function routeName(route: string): string {
  if (route === "/") return "home";
  if (route === NOT_FOUND) return "404";
  if (route.startsWith("/projects/")) return "project write-up";
  return route.slice(1).replace(/\//g, " ");
}
