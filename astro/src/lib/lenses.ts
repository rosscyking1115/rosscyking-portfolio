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
