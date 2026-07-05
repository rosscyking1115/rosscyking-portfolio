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
    blurb:
      "Late-payment cash-runway risk tool for UK SMEs — 13-week forecast, invoice/customer risk ranking, and a plain-English weekly action brief. Multi-tenant RBAC, STRIDE threat model, DPIA.",
  },
] as const;
