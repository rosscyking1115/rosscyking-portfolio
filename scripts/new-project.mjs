// Scaffold a new project write-up: `npm run new:project -- <slug>`
// Writes content/projects/<slug>.mdx as a draft (visible in dev, hidden in prod).
import { writeFile } from "node:fs/promises";
import path from "node:path";

const input = process.argv[2];

if (!input) {
  console.error("Usage: npm run new:project -- <slug>   (slug is kebab-case)");
  process.exit(1);
}

// path.basename strips any directory components (a barrier against path
// traversal); the regex then enforces a plain kebab-case slug.
const slug = path.basename(input);

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error(`Invalid slug "${input}". Use kebab-case: lowercase, digits, hyphens.`);
  process.exit(1);
}

const filePath = path.join(process.cwd(), "content", "projects", `${slug}.mdx`);

const today = new Date().toISOString().slice(0, 10);
const year = new Date().getFullYear();

const template = `---
title: "New project — rename me"
summary: "One or two sentences on what this is and why it matters. Replace me — this also becomes the SEO meta description (auto-trimmed to ~155 chars)."
stack: [Python]
role: Solo project
period: "${year}"
publishedAt: "${today}"
# Draft: shown in \`npm run dev\`, hidden in production until you remove this line.
draft: true
# Feature on the home page (lower featuredOrder = higher up):
# featured: true
# featuredOrder: 1
# Optional 3-up metric strip on the detail page:
# metrics:
#   - { value: "00", label: "first metric" }
#   - { value: "00", label: "second metric" }
#   - { value: "00", label: "third metric" }
links:
  github: https://github.com/your-username/your-repo
  # demo: https://your-app.example.com
  # report: https://your-username.github.io/your-repo/
---

## What I built

Describe the project — the problem, what you built, and the approach.

## Why it matters

What it demonstrates, and who should care.
`;

try {
  // "wx" creates and writes atomically, failing if the file already exists —
  // no separate existence check, so no time-of-check/time-of-use race.
  await writeFile(filePath, template, { encoding: "utf8", flag: "wx" });
} catch (err) {
  if (err.code === "EEXIST") {
    console.error(`Already exists: content/projects/${slug}.mdx`);
    process.exit(1);
  }
  throw err;
}

console.log(`✓ Created content/projects/${slug}.mdx (draft)`);
console.log(`  Edit it, then delete \`draft: true\` to publish.`);
console.log(`  Preview now:  npm run dev  →  http://localhost:3000/projects/${slug}`);
