/**
 * Work in progress shown in the "Now building" strip on the home page.
 * These are private repos with no public artifact yet — name and one-liner
 * only, no links. Remove an entry when its project page ships (it then
 * belongs in content/projects/ instead).
 */
export interface NowBuildingEntry {
  name: string;
  /** One honest line — what it is, not what it might become. */
  blurb: string;
}

// Empty for now — aerospace-prognostics and cashflow-risk both shipped and
// have full project pages. The strip hides itself while this is empty.
export const nowBuilding: readonly NowBuildingEntry[] = [] as const;
