import registry from "../../../content/projects/registry.json";

/**
 * Role lenses (migration risk #6) — the ordered, headline-bearing featured sets
 * defined in the canonical registry, `content/projects/registry.json`.
 *
 * Ported from the Next app's src/lib/lenses.ts. The registry is imported from
 * the REPO ROOT, matching src/content.config.ts: one authored list, gated by
 * scripts/validate-projects.mjs. A copy under astro/ would drift.
 *
 * Unlike the Next version this is safe to read from anywhere — the whole thing
 * is prerendered, and the switcher works off `data-` attributes rather than
 * shipping the registry to the browser.
 */

interface LensSpec {
  label: string;
  headline: string;
  featured: string[];
}

const lenses = registry.lenses as Record<string, LensSpec>;

export type LensKey = keyof typeof registry.lenses;

export interface Lens extends LensSpec {
  key: LensKey;
}

export const DEFAULT_LENS: LensKey = "all";

export const LENS_KEYS = Object.keys(lenses) as LensKey[];

export function isLensKey(value: string): value is LensKey {
  return Object.prototype.hasOwnProperty.call(lenses, value);
}

/**
 * Retired lens names, mapped onto the surviving lens that answers the same
 * role.
 *
 * The lens set was collapsed from four to three in #56, but `/for/:lens` is a
 * wildcard redirect, so old shared links still resolve — they just used to fail
 * validation and dump the visitor on the default lens. A link that promised
 * "here is my analytics engineering work" landing on the generic set is a quiet
 * broken promise, not a 404, which is why it went unnoticed.
 *
 * Analytics engineering maps to `data` rather than to the default: data
 * engineering and analytics engineering are the same direction as far as this
 * portfolio is concerned, and that is the direction being led with.
 *
 * Add to this map, never remove from it — these are live URLs.
 */
const RETIRED_LENS_ALIASES: Record<string, LensKey> = {
  "data-engineering": "data" as LensKey,
  "analytics-engineering": "data" as LensKey,
  "applied-ai": "ai" as LensKey,
  "ai-safety": "ai" as LensKey,
};

/** Every alias plus its target, for the inline script and the tests. */
export const LENS_ALIASES = RETIRED_LENS_ALIASES;

/**
 * Resolve any lens string — current key, retired alias, or nonsense — to a lens
 * that exists. Nonsense still falls back to the default.
 */
export function resolveLensKey(value: string | null | undefined): LensKey {
  if (!value) return DEFAULT_LENS;
  if (isLensKey(value)) return value;
  return RETIRED_LENS_ALIASES[value] ?? DEFAULT_LENS;
}

export function getLens(key: LensKey): Lens {
  return { key, ...lenses[key]! };
}

/** All lenses in registry order — `all` first. */
export const allLenses: Lens[] = LENS_KEYS.map(getLens);

/** Slim nav items (key + label only). */
export const lensNav = allLenses.map(({ key, label }) => ({ key, label }));

/**
 * The home URL for a lens. The switcher changes the featured display in place;
 * this only sets a shareable/bookmarkable query param — the default lens is the
 * bare home URL.
 */
export function lensHref(key: LensKey): string {
  return key === DEFAULT_LENS ? "/" : `/?lens=${key}`;
}
