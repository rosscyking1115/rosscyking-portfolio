import registry from "../../content/projects/registry.json";

/**
 * Role lenses — the ordered, headline-bearing featured sets defined in the
 * canonical registry (`content/projects/registry.json`). A visitor (or a
 * shareable `/for/<lens>` URL) picks a lens and the home page re-ranks its
 * featured work to answer that role. `all` is the default.
 *
 * Import this only from server components (or pass its output down as props);
 * it pulls in the registry JSON, which should not ship to the browser.
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
  return { key, ...lenses[key] };
}

/** All lenses in registry order — `all` first. */
export const allLenses: Lens[] = LENS_KEYS.map(getLens);

/** The href for a lens: the default lens lives at `/`, the rest at `/for/<key>`. */
export function lensHref(key: LensKey): string {
  return key === DEFAULT_LENS ? "/" : `/for/${key}`;
}

/** Slim nav items (no featured lists) — safe to hand a client component as props. */
export const lensNav = allLenses.map(({ key, label }) => ({
  key,
  label,
  href: lensHref(key),
}));
