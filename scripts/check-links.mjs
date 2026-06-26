// Check external links in project front matter for rot.
// Usage: node scripts/check-links.mjs   (or: npm run check:links)
//
// FAIL (exit 1): dead links — 4xx/5xx, DNS/timeout, or a redirect to a known
//                "not found" landing page (e.g. a deleted Streamlit app).
// WARN (exit 0): a github.com link that now redirects — the repo was likely
//                renamed; update links.github to the canonical name.
//
// Uses node:https with manual redirect handling rather than fetch(): many hosts
// (Streamlit health-gates especially) answer with a 303 that fetch can't follow
// cleanly, which would otherwise look like a dead link.
import http from "node:http";
import https from "node:https";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

const PROJECTS_DIR = path.join(process.cwd(), "content", "projects");
const TIMEOUT_MS = 15_000;
// Redirect targets that mean "gone" even though the hop itself is a 3xx.
const SOFT_404 = /\/errors\/not_found|\/404(?:\.html)?(?:$|\?)|page-not-found/i;

/** One request, no auto-follow — resolves to { status, location, error }. */
function request(url, method) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.request(
      url,
      { method, headers: { "user-agent": "portfolio-link-check" } },
      (res) => {
        res.resume(); // drain so the socket frees
        resolve({ status: res.statusCode ?? 0, location: res.headers.location ?? "" });
      },
    );
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    req.on("error", (err) => resolve({ status: 0, error: err.code ?? err.message }));
    req.end();
  });
}

async function probe(url) {
  let res = await request(url, "HEAD");
  // HEAD unsupported or refused → retry GET.
  if (res.status === 0 || res.status === 405 || res.status === 501) {
    res = await request(url, "GET");
  }
  if (res.status === 0) return { state: "FAIL", detail: res.error ?? "unreachable" };
  if (res.status >= 400) return { state: "FAIL", detail: `HTTP ${res.status}` };
  if (res.status >= 300) {
    if (SOFT_404.test(res.location)) {
      return { state: "FAIL", detail: `redirects to ${res.location} (gone)` };
    }
    if (new URL(url).host === "github.com" && res.location) {
      return { state: "WARN", detail: `redirects → ${res.location} (repo renamed?)` };
    }
    return { state: "OK", detail: `HTTP ${res.status} (reachable)` };
  }
  return { state: "OK", detail: `HTTP ${res.status}` };
}

const files = (await readdir(PROJECTS_DIR)).filter((f) => f.endsWith(".mdx"));
const targets = [];
for (const file of files) {
  const { data } = matter(await readFile(path.join(PROJECTS_DIR, file), "utf8"));
  for (const [kind, url] of Object.entries(data.links ?? {})) {
    if (typeof url === "string" && url.startsWith("http")) {
      targets.push({ file, kind, url });
    }
  }
}

console.log(`Checking ${targets.length} links across ${files.length} projects…\n`);

const results = await Promise.all(
  targets.map(async (t) => ({ ...t, ...(await probe(t.url)) })),
);

let fails = 0;
let warns = 0;
for (const r of results.sort((a, b) => a.file.localeCompare(b.file))) {
  if (r.state === "FAIL") fails++;
  else if (r.state === "WARN") warns++;
  if (r.state !== "OK") {
    console.log(`[${r.state}] ${r.file} · ${r.kind}\n    ${r.url}\n    ${r.detail}`);
  }
}

const ok = results.length - fails - warns;
console.log(`\n${ok} ok · ${warns} warning(s) · ${fails} failure(s)`);
if (fails === 0 && warns === 0) console.log("All project links healthy.");
process.exit(fails > 0 ? 1 : 0);
