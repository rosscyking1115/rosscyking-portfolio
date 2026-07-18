// Offline drift gate for the project portfolio.
// Usage: node scripts/validate-projects.mjs   (or: npm run validate:projects)
//
// FAILS (exit 1) when content/projects/*.mdx drifts from the canonical registry
// (content/projects/registry.json). This is what makes "silently missing or
// leaving a project stale" structurally impossible — a bulk "update each project"
// pass now has a checked-in list telling it how many projects exist and which one
// is wrong. Deterministic and network-free (link liveness is scripts/check-links.mjs).
//
// Checks, per registry.json:
//   1. slug set: every registry project has an .mdx and vice-versa (missing/extra).
//   2. links.github === registry.repo (exact — catches wrong-repo copy-paste).
//   3. links.demo  === registry.demo  (exact when demo set; catches broken/renamed).
//   4. pinned metrics: the MDX metric with a pinned label has the pinned value
//      (catches stale test counts / headline numbers).
//   5. banned strings (global + per-project) absent from title/summary/metrics/body
//      prose — links are exempt (accepted deploy hostnames live there).
//   6. featured invariants: the set of `featured: true` MDX == registry lenses.all.featured,
//      and every featured project has a unique featuredOrder.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

const ROOT = process.cwd();
const PROJECTS_DIR = path.join(ROOT, "content", "projects");
const REGISTRY = path.join(PROJECTS_DIR, "registry.json");

const errors = [];
const fail = (slug, msg) => errors.push(`  ✗ ${slug}: ${msg}`);

const registry = JSON.parse(await readFile(REGISTRY, "utf8"));
const expected = new Set(Object.keys(registry.projects));

// Load every MDX (frontmatter + body).
const files = (await readdir(PROJECTS_DIR)).filter((f) => f.endsWith(".mdx"));
const mdx = new Map();
for (const file of files) {
  const slug = file.replace(/\.mdx$/, "");
  const { data, content } = matter(await readFile(path.join(PROJECTS_DIR, file), "utf8"));
  mdx.set(slug, { data, content });
}

// 1. Slug set — the count/missing assertion.
for (const slug of expected) {
  if (!mdx.has(slug)) fail(slug, `in registry but has no content/projects/${slug}.mdx`);
}
for (const slug of mdx.keys()) {
  if (!expected.has(slug))
    fail(
      slug,
      `has an .mdx but is missing from registry.json (add it or delete the file)`,
    );
}

// 1b. Status vocabulary — a typo here would silently break lens / now-building logic.
const STATUS = new Set(["shipped", "building", "archived"]);
for (const [slug, spec] of Object.entries(registry.projects)) {
  if (!STATUS.has(spec.status)) {
    fail(slug, `status "${spec.status}" is not one of ${[...STATUS].join(" / ")}`);
  }
}

// Text a banned-string check may look at: everything a reader sees EXCEPT link URLs.
const proseOf = ({ data, content }) => {
  const metricText = (data.metrics ?? []).map((m) => `${m.value} ${m.label}`).join(" · ");
  return [
    data.title,
    data.summary,
    (data.stack ?? []).join(" "),
    metricText,
    content,
  ].join("\n");
};

for (const [slug, spec] of Object.entries(registry.projects)) {
  const entry = mdx.get(slug);
  if (!entry) continue; // already reported in step 1
  const { data } = entry;
  const links = data.links ?? {};

  // 2. repo exact match.
  if (spec.repo && links.github !== spec.repo) {
    fail(
      slug,
      `links.github is "${links.github ?? "(none)"}" — registry expects "${spec.repo}"`,
    );
  }
  // 3. demo exact match (only when the registry pins one).
  if (spec.demo && links.demo !== spec.demo) {
    fail(
      slug,
      `links.demo is "${links.demo ?? "(none)"}" — registry expects "${spec.demo}"`,
    );
  }

  // 4. pinned metrics.
  for (const [label, value] of Object.entries(spec.metrics ?? {})) {
    const metric = (data.metrics ?? []).find((m) => m.label === label);
    if (!metric) fail(slug, `missing pinned metric "${label}" (should read "${value}")`);
    else if (String(metric.value) !== String(value)) {
      fail(
        slug,
        `metric "${label}" is "${metric.value}" — registry pins "${value}" (stale?)`,
      );
    }
  }

  // 5. banned strings (URLs exempt — accepted deploy hostnames live in links).
  const prose = proseOf(entry);
  for (const banned of [...(registry.bannedGlobal ?? []), ...(spec.banned ?? [])]) {
    if (prose.toLowerCase().includes(banned.toLowerCase())) {
      fail(slug, `contains banned string "${banned}" in title/summary/metrics/body`);
    }
  }
}

// 6. featured invariants.
const featuredSlugs = [...mdx.entries()]
  .filter(([, e]) => e.data.featured)
  .map(([s]) => s);
const expectedFeatured = registry.lenses?.all?.featured ?? [];
const setEq = (a, b) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();
if (!setEq(featuredSlugs, expectedFeatured)) {
  errors.push(
    `  ✗ featured: MDX featured set {${featuredSlugs.sort().join(", ")}} ≠ registry lenses.all.featured {${[...expectedFeatured].sort().join(", ")}}`,
  );
}
const orders = featuredSlugs.map((s) => mdx.get(s).data.featuredOrder);
if (new Set(orders).size !== orders.length) {
  errors.push(
    `  ✗ featured: duplicate featuredOrder among featured projects (${orders.join(", ")})`,
  );
}

// Report.
console.log(
  `Validated ${mdx.size} project(s) against registry (${expected.size} expected).`,
);
if (errors.length) {
  console.error(`\n${errors.length} drift error(s):\n${errors.join("\n")}\n`);
  console.error(
    "Fix facts in content/projects/registry.json first, then the .mdx to match.",
  );
  process.exit(1);
}
console.log("No drift. Every project matches the registry.");
