import registry from "../../content/projects/registry.json";

/**
 * Headline proof numbers, computed from the canonical registry at build time so
 * they can never drift from the project set. Only shipped projects count; test
 * totals sum every metric whose label mentions "test" (leading integer parsed,
 * so "150+" counts as 150).
 */

interface ProjectSpec {
  status: string;
  demo: string | null;
  metrics?: Record<string, string>;
}

const projects = Object.values(registry.projects) as ProjectSpec[];
const shipped = projects.filter((p) => p.status === "shipped");

const tests = shipped.reduce((sum, project) => {
  for (const [label, value] of Object.entries(project.metrics ?? {})) {
    if (!/test/i.test(label)) continue;
    const n = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}, 0);

export const proofStats = {
  shipped: shipped.length,
  tests,
  demos: shipped.filter((p) => p.demo).length,
} as const;
