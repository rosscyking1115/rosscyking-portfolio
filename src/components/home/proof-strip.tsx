import { proofStats } from "@/lib/registry-stats";

/**
 * A row of headline proof, read from the registry at build time so it can't go
 * stale. Rendered as an instrument readout in the site's mono voice.
 */
export function ProofStrip() {
  const items = [
    { value: String(proofStats.shipped), label: "projects shipped" },
    { value: proofStats.tests.toLocaleString("en-GB"), label: "tests across them" },
    { value: String(proofStats.demos), label: "live demos" },
  ];

  return (
    <dl className="text-muted-foreground flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono text-xs">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-baseline gap-2">
          {i > 0 && (
            <span className="text-border mr-4" aria-hidden="true">
              ·
            </span>
          )}
          <dt className="sr-only">{item.label}</dt>
          <dd>
            <span className="text-foreground text-sm font-semibold">{item.value}</span>{" "}
            <span className="tracking-wide">{item.label}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
