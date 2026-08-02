import type { RecordEntry } from "../components/about/RecordRack.astro";
import { certifications, virtualTraining, type Certification } from "./certifications";
import { education } from "./experience";

/**
 * One record, assembled from three authored lists.
 *
 * Education, certifications and virtual training were three sections separated
 * by ruler dividers. They are one thing — a dated record of what was studied
 * and when — and splitting them meant a reader had to reassemble the
 * chronology, with a one-item "Certifications" heading standing beside a
 * two-item "Virtual training" heading as though either were the peer of a
 * degree.
 *
 * ── EVERY STATUS IS DERIVED ──────────────────────────────────────────────────
 * The spec's four tokens map onto facts the data already carries, so none of
 * them is a judgement anyone has to make twice:
 *
 *   IN PROGRESS  education with `current: true`
 *   AWARDED      education without it — the course finished
 *   VERIFIED     a credential with a public verification URL
 *   SELF-PACED   virtual training, which is what a job simulation is
 *   RECORDED     a credential with no way to verify it
 *
 * The last one matters most, and it is the reason this is derived rather than
 * typed: a certification whose issuer publishes no verification link is a
 * weaker claim than one that does, and on this site that difference has to be
 * visible. Right now nothing resolves to RECORDED — every listed credential
 * either has a URL or is a Forage simulation — and the moment one does, it will
 * say so without anyone remembering to.
 */

/** "2026-06" → "Jun 2026". Certifications carry a month; degrees a range. */
function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  const name = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
  });
  return `${name} ${year}`;
}

function fromCredential(item: Certification, status: RecordEntry["status"]): RecordEntry {
  return {
    title: item.title,
    organisation: item.issuer,
    period: formatMonth(item.date),
    sortKey: item.date,
    status,
    // The topics it covered, as the one line the spec asks for. Selected from
    // the authored `skills` array rather than written again.
    ...(item.skills?.length ? { detail: item.skills.join(" · ") } : {}),
    ...(item.url ? { url: item.url } : {}),
  };
}

export const record: RecordEntry[] = [
  ...education.map((item) => ({
    title: item.title,
    organisation: item.organisation,
    period: item.period,
    sortKey: item.startDate,
    status: (item.current ? "IN PROGRESS" : "AWARDED") as RecordEntry["status"],
    // The first highlight only. The full list belongs on a CV, and a rack row
    // that runs to four lines stops being a row.
    ...(item.highlights?.[0] ? { detail: item.highlights[0] } : {}),
  })),
  ...certifications.map((item) =>
    fromCredential(item, item.url ? "VERIFIED" : "RECORDED"),
  ),
  ...virtualTraining.map((item) => fromCredential(item, "SELF-PACED")),
].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
