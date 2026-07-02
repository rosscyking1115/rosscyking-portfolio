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

export const nowBuilding: readonly NowBuildingEntry[] = [
  {
    name: "aerospace-prognostics",
    blurb:
      "Aerospace PHM pipeline — remaining-useful-life prediction and spacecraft anomaly detection",
  },
  {
    name: "cashflow-risk",
    blurb: "Cash-flow risk modelling — early days",
  },
] as const;
