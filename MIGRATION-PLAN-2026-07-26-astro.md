# Astro migration — planning day (2026-07-26)

Planning only. No code written. Nothing committed. Ross decides before Phase 1 starts.

Every architectural claim below cites a specific Astro docs page. Where the docs do not cover
something, that is stated explicitly rather than filled in from memory.

---

## 0. Astro docs MCP server — installed, connected, one caveat

Installed with the exact snippet from
[docs.astro.build/en/guides/build-with-ai](https://docs.astro.build/en/guides/build-with-ai/):

```bash
claude mcp add --transport http astro-docs https://mcp.docs.astro.build/mcp
```

Health check:

```
astro-docs: https://mcp.docs.astro.build/mcp (HTTP) - ✔ Connected
```

**Caveat, stated plainly:** the server is connected, but Claude Code loads MCP tool schemas at
session start, so its tools are not callable inside _this_ session. Everything below was researched
by fetching `docs.astro.build` pages directly — the same source of truth the MCP wraps, and every
claim is cited to a URL you can open. From the next session the MCP tools will be live and should be
the default lookup path.

**Skills check (`/find-skills`, standing instruction):** run. `skills_registry.yaml` contains zero
Astro entries; `~/.claude/skills/` has no Astro skill; the long-tail library has none. The router
resolved only `github-actions-docs` (useful later, for the CI rewrite) and `nextjs` (the framework
we are leaving — not loading it). It did **not** pull `shadcn` or `vercel-react-best-practices` for
this task description. No external candidate found worth putting through the acquisition gate. The
Astro docs MCP is the authority for the port.

---

## 1. Where the brief was wrong

Six corrections. Two of them change the plan.

### 1.1 `npm run check:links` is not a migration gate — **remove it from the Phase 1 criteria**

`scripts/check-links.mjs` reads `content/projects/*.mdx` front matter and probes the **external**
GitHub and demo URLs for rot. It never loads a page of the site. It will pass identically before and
after the port because the port does not touch `content/`. It also is not blocking in CI —
`.github/workflows/link-check.yml` is a weekly cron with `continue-on-error: true` that opens a
tracking issue.

It proves nothing about the migration. Keeping it in the pass gate creates false confidence. The
replacement gate that _does_ prove URL parity is in §5.

### 1.2 The `motion` risk is one file, not ten

The brief says "the 10 `use client` components using `motion`". Actual count:

- **9** files carry `"use client"`, not 10.
- Exactly **one** imports `motion`: [`src/components/motion/fade-in.tsx`](src/components/motion/fade-in.tsx).
  `<FadeIn>` is consumed by 4 call sites (`projects/page.tsx`, `hero.tsx`, `featured-projects.tsx`,
  `skills-cluster.tsx`).
- The other 8 are client for unrelated reasons: `nav.tsx` and `theme-provider.tsx` (real state),
  `contact-form.tsx`, `lens-switcher.tsx`, `featured-projects.tsx`, `theme-toggle.tsx`,
  `project-filter.tsx`, and `ui/label.tsx` (client only because Radix requires it).

This matters: dropping `motion` for CSS is a **one-file change**, not a ten-component rewrite. That
moves it from "definitely defer to Phase 2" to "cheap enough to consider during the port". Still
recommend deferring — but it is no longer a big lever.

### 1.3 ~~"Lighthouse ≥ current" has no baseline~~ — **CAPTURED 2026-07-27**

Nothing in the repo captured a Lighthouse score, so the criterion was unfalsifiable. Now recorded at
`astro/tests/fixtures/production-lighthouse-next.json`, taken against production with Lighthouse
13.4.1 **before** the component port changes any rendering:

| Route                            | Perf | A11y | Best practices | SEO |
| -------------------------------- | ---- | ---- | -------------- | --- |
| `/`                              | 93   | 100  | 96             | 100 |
| `/projects`                      | 95   | 100  | 100            | 100 |
| `/about`                         | 96   | 98   | 100            | 100 |
| `/contact`                       | 96   | 100  | 96             | 100 |
| `/projects/tfl-data-engineering` | 97   | 100  | 100            | 100 |

Gate 10 is now checkable: the Astro build must meet or beat every cell. Note the bar is high —
"same-or-better" here means holding 93+ performance and 100 SEO, not merely "looks fine".

### 1.4 Role lenses: three, and two historical lens URLs already degrade silently

`registry.json` has three lenses: `all`, `data`, `ai`. The brief's body says this correctly; risk #6
and `HANDOFF-2026-07-17-redesign.md` still describe the old four (`data-engineering`,
`analytics-engineering`, `applied-ai`, `ai-safety`).

The live redirect is a wildcard — `/for/:lens` → `/?lens=:lens`. So an old shared link like
`/for/analytics-engineering` still 301s, lands on `/?lens=analytics-engineering`, fails `isLensKey()`,
and silently falls back to the default lens. Not a 404, but not what the link promised either.
**Phase 0 decision needed:** map the retired names onto surviving lenses, or accept the fallback.

### 1.5 Two components are dead code — do not port them

- [`src/components/about/cv-download.tsx`](src/components/about/cv-download.tsx) — imported nowhere.
  The CV is still reachable (hero, contact page, footer all link `/cv.pdf`), but this component is
  orphaned. `MAINTENANCE.md` still describes a "Download CV button on /about" that no longer exists.
- [`src/components/home/evidence-frame.tsx`](src/components/home/evidence-frame.tsx) exports
  `ScreenshotFrame` and `TerminalFrame`. Only `TerminalFrame` is imported. `ScreenshotFrame` is dead.

That is 24 components on paper, ~22 worth porting.

### 1.6 Astro's built-in CSP does **not** solve the static-headers problem (but the Vercel adapter does)

Detail in §3.3. This is the finding that changes the deploy architecture.

**Everything else in the brief checked out**: 5 routes, 24 components, 11 MDX content files +
`registry.json`, Next 16.2.4, React 19.2.4, Tailwind 4, 9 redirect rules, the full CSP/HSTS/COOP/CORP
header set, two `opengraph-image.tsx` files, `theme-cookie.server.ts` reading the cookie server-side.

---

## 2. Phase 0 — Information architecture

Every route and major section, with a recommendation. **Ross decides each row.**

### Routes

| Route              | Recommend | Note                                    |
| ------------------ | --------- | --------------------------------------- |
| `/`                | **KEEP**  | Hero + FeaturedProjects + SkillsCluster |
| `/projects`        | **KEEP**  | Gallery + stack filter chips            |
| `/projects/[slug]` | **KEEP**  | 10 entries                              |
| `/about`           | **KEEP**  |                                         |
| `/contact`         | **KEEP**  | The only route needing a server         |

No route cuts recommended. Five routes is already lean; cutting one saves days of work, not weeks,
and each earns its place.

### Sections within routes

| Where              | Section                          | Recommend            | Reasoning                                                                                                                                                                |
| ------------------ | -------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                | Hero (+ ProofStrip inside it)    | KEEP                 |                                                                                                                                                                          |
| `/`                | LensSwitcher                     | KEEP                 | Recent deliberate work (#55, #56)                                                                                                                                        |
| `/`                | FeaturedProjects + TerminalFrame | KEEP                 |                                                                                                                                                                          |
| `/`                | SkillsCluster                    | **CUT** (2026-07-27) | Rendered the _same_ `skillGroups` as `/about`'s Toolbox aside. Ross: show it once. `/about` keeps it; home shows the stack through the project cards' own chips instead. |
| `/projects`        | ProjectFilter (stack chips)      | KEEP                 |                                                                                                                                                                          |
| `/projects/[slug]` | MDX body + not-found             | KEEP                 |                                                                                                                                                                          |
| `/about`           | Bio (`about.mdx`)                | KEEP                 |                                                                                                                                                                          |
| `/about`           | 01 Education                     | KEEP                 |                                                                                                                                                                          |
| `/about`           | 02 Certifications                | KEEP                 |                                                                                                                                                                          |
| `/about`           | 03 Virtual training              | KEEP                 | Added 4 days ago (#57) — deliberate                                                                                                                                      |
| `/about`           | 04 Toolbox (aside)               | see MERGE above      |                                                                                                                                                                          |
| `/about`           | 05 Languages (aside)             | KEEP                 |                                                                                                                                                                          |
| `/contact`         | Form + direct-contact links      | KEEP                 |                                                                                                                                                                          |
| —                  | `cv-download.tsx`                | **CUT**              | Dead code (§1.5)                                                                                                                                                         |
| —                  | `ScreenshotFrame` export         | **CUT**              | Dead code (§1.5)                                                                                                                                                         |
| —                  | `now-building.ts`                | **CUT or resolve**   | Empty; `HANDOFF` P1 flagged it. No project has `status: "building"`.                                                                                                     |

### Non-page routes — all KEEP, all need an Astro answer

`sitemap.ts`, `robots.ts`, `manifest.ts`, `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx` ×2,
`/.well-known/security.txt`, `public/google0acbb4712509578f.html` (Search Console — must stay
byte-identical; it is already in `.prettierignore`).

### Content — port verbatim, per the brief

`content/` is copied across unchanged. Phase 1 gate includes `git diff --stat content/` being empty
(§5). The four repos with READMEs being corrected, the missing `lakehouse-capstone` entry, and the
six never-audited entries are all a **separate later workstream** — deliberately not touched here.

---

## 3. Contact form architecture — the recommendation

**Recommendation: Astro Actions, `output: 'static'` (the default), `@astrojs/vercel` adapter
installed, `export const prerender = false` on `/contact` only. Four routes stay statically
generated; one route gets a serverless function.**

### 3.1 Why Actions, and what they require

[Actions guide](https://docs.astro.build/en/guides/actions/) — Actions give type-safe server
functions with Zod input validation and a standard `{ data, error }` result shape, which is close to
a one-for-one match for the existing `submitContactForm`. The page also supports zero-JS form
submission via standard `<form>` attributes, with `Astro.getActionResult()` reading the result
server-side.

The constraint, quoted from that page: **"Pages must be on-demand rendered when calling actions using
a form action"** and **"Ensure prerendering is disabled on the page before using this API."**

The [Actions API reference](https://docs.astro.build/en/reference/modules/astro-actions/) documents
`defineAction()` (with `handler` and `input`), `accept: 'form'` for `FormData`, `ActionError`,
`isInputError()`, and the `actions` object importable from a client island. It does **not** state the
adapter requirement — that chain is documented across the other two pages below.

### 3.2 Why that forces an adapter, and only for one route

[On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/) — `output` is
`'static'` by default; a single route opts out with `export const prerender = false`. The page
advises: _"Start with the default `'static'` mode until you are sure that most or all of your pages
will be rendered on demand."_ Four of our five routes are static forever, so `'static'` is right.

[Configuration reference](https://docs.astro.build/en/reference/configuration-reference/) — the
`adapter` option exists "to enable on-demand rendering in your Astro project". Four official
adapters: `@astrojs/vercel`, `@astrojs/netlify`, `@astrojs/cloudflare`, `@astrojs/node`.

The [Build forms with API routes recipe](https://docs.astro.build/en/recipes/build-forms-api/) states
the prerequisite outright: "A project with an adapter for on-demand rendering", and shows
`export const prerender = false; // Not needed in 'server' mode`.

So: **Actions → on-demand rendering → adapter.** Not optional.

### 3.3 Hosting implication — the adapter also rescues the security headers

This is the part that changes the deploy architecture, and it is the answer to the brief's risk #2.

Astro _does_ have built-in CSP (`security.csp`, documented as stable since v6 at
[reference/experimental-flags/csp](https://docs.astro.build/en/reference/experimental-flags/csp/) —
that URL path looks legacy, re-verify via the MCP next session). But read the limitation: it emits a
`<meta http-equiv="content-security-policy">` tag, **not** an HTTP header, and it works **only for
on-demand rendered pages**. On its own it does not give our four static routes a CSP header.

The [Vercel adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/) closes that gap.
`staticHeaders` (type `boolean`, default `false`, added in `@astrojs/vercel@10.0.0`): _"Enables
specifying custom headers for prerendered pages in Vercel's configuration. If enabled, the adapter
will save static headers in the Vercel `vercel.json` file when provided by Astro features, such as
Content Security Policy."_

So the adapter earns its place **twice** — once for `/contact`, once for turning Astro's CSP config
into real response headers on the prerendered routes, written into `vercel.json` at build time rather
than hand-maintained.

**Caveat, and it is a real one:** `staticHeaders` covers headers Astro itself produces (CSP). HSTS,
`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, CORP, `X-Content-Type-Options`,
`X-DNS-Prefetch-Control` are not Astro features and have no documented Astro source. Those go in
`vercel.json` by hand. Whether `staticHeaders: true` merges with a hand-written `vercel.json` or
overwrites it is **not documented on that page** — must be tested in Phase 1 before trusting it.

### 3.4 What the rest of the stack becomes

| Today                            | In Astro                                                                                                                                                                         | Confidence         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `"use server"` action            | `defineAction({ accept: 'form', input: z…, handler })`                                                                                                                           | Documented         |
| zod schema, shared client/server | Same file, reused as the Action's `input`                                                                                                                                        | Documented         |
| `zodResolver` + react-hook-form  | React island calling `actions.contact(…)`, or zero-JS form                                                                                                                       | Documented         |
| Honeypot                         | Unchanged — a schema field                                                                                                                                                       | Trivial            |
| Upstash Ratelimit                | Unchanged — plain SDK call inside the handler                                                                                                                                    | Not Astro-specific |
| Turnstile server verify          | `fetch` to Cloudflare inside the handler. Astro also ships a [Verify a Captcha recipe](https://docs.astro.build/en/recipes/captcha/) (listed on the recipes index; not read yet) | Fine               |
| `@marsidev/react-turnstile`      | Stays, as a React island via `@astrojs/react`                                                                                                                                    | Documented         |
| Resend                           | Unchanged                                                                                                                                                                        | Not Astro-specific |
| `headers()` for client IP        | `Astro.request.headers` / the Action context. **Exact shape not verified — check the MCP**                                                                                       | **Unverified**     |
| `sonner` toasts                  | Stays in the React island                                                                                                                                                        | Fine               |

**Solve this route first**, per the brief. It determines whether `@astrojs/vercel` is in the project
at all, and the same shape gets reused for `sunjungko-portfolio`.

---

## 4. Starting template — build fresh, harvest astroplate

**Recommendation: `npm create astro@latest`
([getting-started](https://docs.astro.build/en/getting-started/), which confirms current major is
**Astro v7**). Keep astroplate checked out beside it as a reference. Do not fork it.**

### astroplate, verified against the repo (not the README)

| Claim         | Verified 2026-07-26                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Licence       | MIT ✓                                                                                            |
| Astro version | `astro: 7.0.0` ✓                                                                                 |
| Tailwind      | `@tailwindcss/vite: ^4.3.1` ✓ (Vite plugin, not PostCSS — note the difference from our setup)    |
| Stars         | 1,175 ✓                                                                                          |
| Maintained    | `pushed_at` 2026-07-25 — yesterday. Not archived, 7 open issues ✓                                |
| Also          | React 19.2.7 + `@astrojs/react` 6.0.0, `@astrojs/mdx` 7.0.0, sitemap 3.7.3, `llmsGenerator.js` ✓ |

Ross's numbers hold up.

### Why not use it as the base

- It ships a blog/marketing IA — Authors, Blog, Tags, Categories, Search, Disqus, multilingual,
  Privacy Policy. We have five routes. Most of it gets deleted, and the residue (`disqus-react`,
  `astro-swiper`, `tailwind-bootstrap-grid`, `astro-auto-import`, generator scripts) stays in the
  lockfile and the mental model.
- **It has no adapter.** No `@astrojs/vercel`, no Actions, no `output` config. It is a pure static
  template, so it solves precisely zero of §3 — the hardest part of this migration.
- It solves none of the other five risks either: no OG-image generation, no CSP, no redirects, no
  project registry.
- `pnpm`-first with its own `themeGenerator.js` / `jsonGenerator.js` build pipeline we would have to
  either adopt or unpick.

### What to harvest from it

Its `astro.config.mjs` shape, the Tailwind-4-via-Vite-plugin wiring, `src/content.config.ts` schema
patterns, `<head>`/SEO component structure, and `llmsGenerator.js` if we want `llms.txt`. Read it,
copy patterns, do not inherit the tree.

### Content pipeline — this genuinely shrinks

[Content collections](https://docs.astro.build/en/guides/content-collections/) replaces
`next-mdx-remote` + `gray-matter` + manual zod + `shiki` + `rehype-pretty-code` + `remark-gfm` with:
`defineCollection` + the `glob()` loader over `content/projects/**/*.mdx`, a zod schema (from
`astro/zod`), `getCollection()`/`getEntry()`, and `render(entry)` returning `<Content />`.

`registry.json` has a documented home too — the `file()` loader "will automatically detect and parse
a single array of objects from JSON and YAML files", and object-keyed formats use "each key as the
`id`", which is exactly `registry.projects`'s shape. Whether to load the registry as a collection or
just `import` the JSON is a Phase 1 call; both work.

---

## 5. Phase 1 pass gate — the exact commands and thresholds

Objective, falsifiable, and runnable. **The two starred items must be captured on Next.js, before any
Astro code exists**, or they cannot be compared.

### Baselines to capture first (blocking prerequisite)

```bash
# ★ 1. URL inventory — the canonical parity artefact
curl -s https://rosscyking.com/sitemap.xml > baseline/sitemap-next.xml

# ★ 2. Live response headers — read the wire, never the config file
curl -sI https://rosscyking.com/ > baseline/headers-next.txt

# ★ 3. Live redirect behaviour, all 9 rules
for u in internal-ai-agent-eval-lab llm-redteam-harness uk-property-analytics movein \
         com6513-qa-assistant event-extraction-llm-baseline fromatob-file-converter \
         scalable-machine-learning-pyspark speech-speed-tempo-classification; do
  curl -sI "https://rosscyking.com/projects/$u" | head -2
done
curl -sI https://rosscyking.com/for/data | head -2

# ★ 4. Lighthouse baseline (does not exist today — §1.3)
npx lighthouse https://rosscyking.com --output json --output-path baseline/lh-home.json
# repeat for /projects, /about, /contact and one /projects/[slug]
```

### The gate itself

| #   | Gate                    | Command                                                          | Threshold                                                                                      |
| --- | ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Content untouched       | `git diff --stat content/`                                       | Empty. Zero bytes changed.                                                                     |
| 2   | Registry drift          | `npm run validate:projects`                                      | Exit 0. **Framework-agnostic `.mjs` — survives the port unchanged. The one free gate.**        |
| 3   | Typecheck               | `astro check`                                                    | 0 errors                                                                                       |
| 4   | Build                   | `astro build`                                                    | Exit 0                                                                                         |
| 5   | **URL parity**          | diff new `dist/sitemap*.xml` against `baseline/sitemap-next.xml` | **Identical URL set.** Replaces the brief's `check:links`.                                     |
| 6   | Redirects               | new Playwright spec, one assertion per rule                      | 9/9 land on the right target **with a 301** — not a `<meta refresh>` (see §6)                  |
| 7   | E2E + a11y              | `npm run test:e2e` (existing 7 specs, ported selectors)          | All pass, axe 0 violations                                                                     |
| 8   | Unit/component          | `vitest run`                                                     | Passes for surviving React islands; `.astro` components are out of scope (see §6)              |
| 9   | **Headers on the wire** | `curl -sI <preview-deploy-url>` vs `baseline/headers-next.txt`   | Every header present, values equal or stricter. **Must run against a real Vercel deployment.** |
| 10  | Lighthouse              | rerun ×5 pages against the preview deploy                        | ≥ baseline on every page, every category                                                       |

### Gate 9 is the one that will silently lie to you

`headers.spec.ts` currently runs against `localhost:3100` via Playwright's `webServer`, and it passes
today because Next's `headers()` applies in `next start`. After the migration those headers come from
`vercel.json`, applied by **Vercel's edge, not by `astro preview`**. Pointed at localhost it will go
green while production ships bare. Gate 9 must target a deployed preview URL. This is the single
easiest thing in the whole migration to lose without noticing — exactly as the brief warned.

### CI changes implied

`.github/workflows/ci.yml` keeps the same three jobs. `quality` swaps `next build` → `astro build`
and `tsc --noEmit` → `astro check`. `e2e` gains the redirect spec. A new job (or a manual step) is
needed for gate 9 against a preview deployment, since it cannot run locally. `link-check.yml` and
`codeql.yml` are unaffected.

---

## 6. Open questions and undocumented gaps

Stated rather than guessed, per the standing rule.

1. **Redirects will regress unless the adapter handles them.** The
   [config reference](https://docs.astro.build/en/reference/configuration-reference/) says for a
   static site without an adapter, `redirects` _"will produce a client redirect using a
   `meta http-equiv="refresh"` tag and does not support status codes."_ For 9 live SEO URLs, swapping
   301s for meta-refresh is a real downgrade. With an adapter, status codes work. Since §3 already
   installs `@astrojs/vercel`, this resolves — but it must be **verified on the wire**, not assumed.
   The good news: `'/blog/[...slug]': '/articles/[...slug]'` is documented, so our 4 slug moves and
   the `/for/:lens` wildcard have a documented shape.

2. **OG images — the docs do not cover this.** The recipes index lists 21 official recipes; none is
   about Open Graph or social images, and `/en/recipes/og-images/` 404s. The only OG mentions in the
   docs are third-party media integrations (ImageKit's `<OgImage />`, Cloudinary's
   `getCldOgImageUrl()`), both of which mean a hosted image service, not generation. There is a
   well-known community route here, but it is **not documented by Astro**, so it needs a real
   research pass at the start of Phase 1 rather than a guess today. Fallback if it gets expensive:
   ship a static `/og.png` per route (which `siteConfig.ogImage` already references) and treat
   per-project dynamic cards as a Phase 2 nice-to-have.

3. **Theme no-flash — the docs do not cover this either.** No dark-mode or theme recipe exists on the
   recipes index. `theme-cookie.server.ts` reads the cookie server-side, which a prerendered page
   cannot do. The likely answer is a small inline script in `<head>`, which then interacts with the
   CSP work in §3.3 (`'unsafe-inline'` is already in the current `script-src`, so this is survivable,
   but the two decisions are coupled). Needs an MCP lookup next session.

4. **Testing `.astro` components has no plan yet.** The 4 unit and 2 component Vitest specs cover
   `contact-schema`, `email-template`, `theme-cookie`, `utils`, `badge`, `button`. The first four are
   plain TS and port unchanged. `badge`/`button` survive only if those stay React. Anything converted
   to `.astro` loses its component test. The coverage threshold is 80% on an explicit `include` list
   — that list will need rewriting, and shrinking it to keep the number green would be cheating.
   Decide deliberately.

5. ~~**`staticHeaders` + a hand-written `vercel.json`** — merge or overwrite?~~ — **RESOLVED 2026-07-27.**
   They coexist. Verified locally: a hand-written `vercel.json` survives `astro build` untouched, and
   `staticHeaders` writes into `.vercel/output/config.json` (Build Output API v3) as per-route
   `headers` entries — _not_ into `vercel.json`, despite the adapter docs' wording.

6. ~~**Client IP inside an Action handler**~~ — **RESOLVED 2026-07-27.** `clientAddress` _is_ present
   on the Actions handler context (verified against a running server: resolved to `::1` locally, not
   inferred from docs). The implementation prefers `x-forwarded-for` / `x-real-ip` because that is
   what Vercel sets in front of the function, with `clientAddress` as fallback.

7. **`.npmrc` `legacy-peer-deps=true`** exists solely because `@vercel/analytics` declares SvelteKit
   as a peerOptional under the Next adapter. Probably deletable post-migration. Try removing it; if
   `npm ci` stays clean, drop it and the comment.

---

## 6b. Risk #1 (contact form) — landed 2026-07-27

Built in `astro/` on `feat/astro-contact`. Astro 7.1.3, `output: 'static'`, `@astrojs/vercel` with
`staticHeaders: true`, `export const prerender = false` on `/contact` only. Build confirms the shape:
`/index.html` prerendered, `/contact` bundled as a serverless function.

**Verified working end to end** (not asserted — exercised): all five pipeline stages, email
normalisation, every original validation message, honeypot, and the success toast.
`astro/tests/e2e/contact.spec.ts` — 10/10 passing — locks each finding below in place.

Six things the docs did not tell us, all found by running the thing:

1. **Astro's `accept: 'form'` parser gives the schema `null`, not `""`.** Next's
   `Object.fromEntries(formData.entries())` produced empty strings. This rejected **every** real
   submission on `company` and `honeypot` with "expected string, received null". The schema now
   normalises `null → ""` so all the original zod messages survive.

2. **The honeypot must be enforced in the handler, not the input schema.** Astro validates `input`
   before the handler runs and answers failures with `400` + the offending field name — which tells a
   bot exactly what caught it. Next silently returned success. `.max(0)` moved out of the schema.

3. **zod 4 deprecates `.email()` on `ZodString`.** The obvious swap to top-level `z.email()` silently
   reorders the checks — it would validate format _before_ `.trim().toLowerCase()`, rejecting
   `"  Ross@Example.com "`, which the Next app accepted. Fixed with `.pipe()` to preserve order.

4. **Astro islands do not share module state, and `sonner` is stateful.** With `<Toaster>` in the
   layout and `toast()` in the form, the page loaded sonner _twice_ — once as
   `node_modules/sonner/dist/index.mjs` (resolved for the `.astro` file), once as Vite's prebundled
   `.vite/deps/sonner.js` (for the `.tsx` island). Two toast stores; every toast vanished silently.
   Both must live in one island.

5. **`@astrojs/vercel` does not implement `astro preview`.** There is no way to serve the built
   on-demand route locally without `vercel dev` and a linked project. This _reinforces_ gate 9: the
   local suite runs against `astro dev`, so headers and serverless behaviour are only ever proven on a
   real deployment.

6. **`security.checkOrigin` is on by default** (astro@4.9.0+) and 403s form POSTs whose `Origin` does
   not match. Free CSRF protection for the contact endpoint — good news, but it means any non-browser
   client must send the header.

Tooling notes, each a half-hour if rediscovered cold:

- **TypeScript 7 breaks `astro check`** — the native compiler does not expose the programmatic API the
  language server needs. Pinned to `^6`.
- **Astro 7 force-backgrounds `astro dev` inside coding agents** (via `am-i-vibing`, keyed on
  `CLAUDECODE`), so Playwright's `webServer` sees the wrapper exit and reports the misleading
  "Process from config.webServer exited early". The config blanks the variable; no-op in CI.
- **Root tooling had to be scoped away from `astro/`** — root `tsconfig.json` includes `**/*.ts` with
  only `node_modules` excluded, so `npm run typecheck` tried to compile `astro:actions` and failed.
  `astro/` is now excluded from root tsconfig, ESLint and Prettier. **Reverse all three when `astro/`
  is promoted to the root.**

Two things needing Ross's action outside the repo:

- **`NEXT_PUBLIC_*` → `PUBLIC_*`.** Astro only exposes browser vars under `PUBLIC_`. Both
  `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` need renaming in the Vercel dashboard at
  cutover. Documented in `astro/.env.example`.
- **`MAINTENANCE.md` is stale here:** it says `cp .env.example .env.local`, but no `.env.example` is
  tracked — the root `.gitignore`'s bare `.env*` swallows it at every depth. `astro/.env.example`
  works around this with an explicit negation.

Not ported on this branch, deliberately: the shadcn/Radix ui primitives and Tailwind tokens. This
branch proves the contact _architecture_; class names are kept so styling drops straight back in.

---

## 6c. Risk #2 (security headers / CSP) — landed 2026-07-27

All nine headers live in `astro/vercel.json`, hand-written, byte-identical to what
`rosscyking.com` serves today. Plus the `/.well-known/security.txt` content-type and cache rule, and
the file itself.

**Astro's own CSP feature is deliberately not used.** It is real and it works — enabling
`security.csp` writes per-route CSP headers with generated hashes into `.vercel/output/config.json` —
but it is wrong for this site on three counts the docs state outright:

- **"Shiki isn't currently supported."** Every `/projects/[slug]` page renders MDX code blocks through
  Shiki, which emits inline styles. This alone disqualifies it.
- **"External scripts and external styles are not supported out of the box."** Turnstile and Vercel
  Analytics are both already in the production CSP.
- **It "isn't supported while working in dev mode"**, so it cannot be checked locally without a build.

Astro's generated policy also only covers `script-src` and `style-src`; the other seven headers have
no Astro source at all. Hand-writing `vercel.json` gives exact parity in one reviewable file.

`staticHeaders: true` is kept but is **currently inert** — it only forwards headers Astro itself
produces, and with CSP off there are none. Left on so that if the Shiki limitation lifts, enabling
`security.csp` emits real headers rather than a `<meta>` tag.

### The gate, and what it does not prove

`astro/tests/e2e/headers.spec.ts` diffs `vercel.json` against
`astro/tests/fixtures/production-headers-next.txt` — a real `curl -sI https://rosscyking.com/`
response — and fails if any of the nine is missing, altered, or weakened. Proven by sabotage:
weakening `frame-ancestors 'none'` to `*` and deleting `X-Frame-Options` produced exactly three
failures; restoring made them green.

**This is a drift alarm, not gate 9.** It reads a config file, which is precisely the failure mode
the brief warned about. `vercel.json` is applied by Vercel's edge, and nothing has yet proved these
headers reach the wire from an Astro build.

### ✅ Gate 9 — CLOSED 2026-07-29

Verified against a real Astro deployment on Vercel
(`rosscyking-portfolio-astro.vercel.app`, project Root Directory `astro`):

- **All nine security headers byte-identical** to the captured production response — including the
  508-character CSP, character for character.
- **All thirteen redirects answer 308** to the right target, including `/for/:lens` → `/?lens=:lens`,
  the rule that was config-parity only because `astro dev` cannot emulate Vercel's edge.
- **Eleven OG cards** served as `image/png`, all over 10 KB.
- **`/.well-known/security.txt`** served as `text/plain; charset=utf-8`.
- **The contact Action works as a real serverless function** — `POST /_actions/contact/` returned
  200 with `[{"success":1},true]`, so the whole pipeline runs on Vercel, not just in `astro dev`.

Two things had to be fixed to get here, both worth remembering:

1. **The first "passing" run was a false positive.** The deployment under test was still the Next app
   (its Root Directory had not taken effect), so the header diff compared Next against a Next
   baseline and passed vacuously. Caught only because `/opengraph-image` returned 200 while
   `/opengraph-image.png` 404'd — Next's convention, not ours. **Any future gate-9 run must first
   confirm which app it is talking to**; `/about` returning 404 and an `<h1>` of "Cheng-Yuan King"
   are the cheap tells.
2. **`vercel.json` rejected the deployment outright** over a `_comment` key: _"Invalid request:
   should NOT have additional property `_comment`"_. Vercel validates against a published schema and
   fails the deploy for any unknown top-level property. JSON has no comment syntax and Vercel allows
   no substitute. Now guarded by a test.

### Superseded: the blocker that got us here

The existing Vercel project's Root Directory is the repo root, so a preview deployment of this branch
builds the **Next** app. `astro/vercel.json` is never exercised. To close gate 9 one of these is
needed:

1. **A second Vercel project** with Root Directory `astro/` (preview-only, no custom domain). Cleanest
   — gives every migration PR a real Astro preview URL to `curl -sI` against, for the rest of the
   migration. Recommended.
2. `vercel deploy` from `astro/` against a linked project, using Ross's CLI auth. One-off.
3. Defer to cutover — accept the headers are unproven on the wire until the promotion commit. Worst
   option: it puts the single most silently-losable thing in the migration on the critical path.

### Env var decision, recorded

`NEXT_PUBLIC_*` → `PUBLIC_*` is an **add, not a rename**. Renaming
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` while the Next app is live breaks the contact form outright:
`TURNSTILE_SECRET_KEY` is set, so the server demands a token, but with no site key the widget never
renders and no token is ever sent. Both names coexist harmlessly; delete the `NEXT_PUBLIC_*` pair
only after `astro/` is promoted to root.

Added by Ross 2026-07-27: `PUBLIC_TURNSTILE_SITE_KEY` (Production), `PUBLIC_SITE_URL` (Production +
Preview). The six server-side secrets keep their names byte-identically and were not touched.

---

## 6d. Risk #3 (dynamic OG images) — landed 2026-07-27

Eleven cards — one site-wide, ten project — generated at **build time** and verified by looking at
them, not just counting bytes.

**The docs gap in §6.2 is confirmed and now closed by choice, not by a documented pattern.** Astro
still has no OG recipe. The implementation uses `satori` + `@resvg/resvg-js` directly, which is
exactly what `next/og` wraps — so the two JSX layouts are near-verbatim ports and render the same
design.

**Improvement over Next:** these are prerendered (`prerender = true` + `getStaticPaths`), so there
are zero serverless invocations and no cold start on the first social scrape. Next generated them per
request. It also means a project whose frontmatter cannot produce a card **fails the build** rather
than 500ing when a crawler happens by.

**The one intentional visual change:** satori cannot resolve `system-ui` — it needs real font
buffers. `next/og` silently falls back to its bundled Noto Sans, so the live cards are Noto today.
These use Geist, the site's actual typeface, so the cards now match the site.

### Also landed here, because OG needed it

- **`src/content.config.ts`** — the projects collection, schema ported from the Next app's
  `frontMatterSchema` rather than re-derived from reading the files. It loads from
  **`../content/projects` at the repo root**, so there is exactly one authored list and
  `validate-projects.mjs` still gates it. A copy under `astro/` would drift, which is the whole
  reason the registry exists.
- **`src/lib/site-config.ts`** — ported verbatim.
- **Open Graph + Twitter meta tags** in `Base.astro`. The cards would otherwise exist and be
  referenced by nothing.

### Four things that cost real time

1. **`geist` cannot be used as a font source.** Its `exports` map only exposes Next-specific font
   modules — even `geist/package.json` is not exported. The two `.ttf`s are vendored into
   `src/assets/fonts` with their SIL OFL licence.
2. **`import.meta.url` paths break after bundling.** The built chunk lands in
   `dist/server/.prerender/chunks`, and the fonts are not copied there — `ENOENT`. Fixed with Vite's
   `?inline`, so the bytes travel with the chunk.
3. **Importing `og.tsx` into the layout took down the dev server for every page.** Pulling in
   `@resvg/resvg-js` — a native `.node` binary — made Vite's optimizer fail with
   `[UNLOADABLE_DEPENDENCY] ... stream did not contain valid UTF-8`. Two fixes, both needed: a
   dependency-free `og-config.ts` for the constants layouts need, and
   `optimizeDeps.exclude` + `ssr.external` for resvg.
4. **URL shape changed deliberately:** `/opengraph-image?<hash>` → `/opengraph-image.png`. A
   prerendered endpoint writes a file, and without an extension the host cannot reliably infer
   `image/png`. Crawlers only ever reach these URLs by reading `og:image` off the page, so this is
   invisible to them — but **add `/opengraph-image` → `/opengraph-image.png` to the redirect set in
   risk #4** as cheap insurance for anything holding the old URL.

### Gate

`astro/tests/e2e/og-images.spec.ts` enumerates from `content/projects/registry.json` — the same
canonical source `validate-projects.mjs` gates — and asserts each card returns 200, is a real PNG by
its IHDR magic bytes, measures 1200×630, and exceeds 10 KB (a card that renders no text still
produces a valid but tiny PNG). Adding a project without a working card fails here.

---

## 6e. Risk #4 (redirects) — landed 2026-07-27

Ten rules: the nine from `next.config.ts`, plus `/opengraph-image` → `/opengraph-image.png` as
insurance for the URL change in risk #3.

**Production answers all nine with 308**, captured with `curl -sI` rather than inferred from the
config. Astro's default for a permanent redirect is **301** — SEO-equivalent, but not parity — so
each rule pins `{ status: 308, destination }` explicitly.

### Split mechanism, and why

Nine live in `astro.config.mjs`; one lives in `vercel.json`. That is forced, not a preference:

- **`/for/:lens` → `/?lens=:lens` cannot be expressed in Astro.** It fails the build with
  `InvalidRedirectDestination` — "the destination of a dynamic redirect must include all dynamic
  parameters from the source route", and a query string is not a route. Verified by trying it.
- Everything else stays in `astro.config.mjs` because Astro compiles those into the build output
  **and** serves them in `astro dev` — so they get real end-to-end tests instead of a config diff.
  Putting all ten in `vercel.json` for tidiness would have cost that.

### `astro dev` does not honour the pinned status

Observed: **301** for the `/projects/*` rules, whose destinations do not exist yet, and **308** for
`/opengraph-image`, whose destination does. The build output is right in every case — all ten land in
`.vercel/output/config.json` as 308.

So each rule is checked **twice**: a live request proves it redirects and where to; an assertion on
`.vercel/output/config.json` proves the status that actually ships. `npm run test:e2e` now runs
`astro build && playwright test` so the build output is never stale.

Proven by sabotage: deleting `/projects/movein` and downgrading one rule to 302 produced three
failures; restoring made them green.

### Still outstanding

`/for/:lens` is config-parity only, for the same reason as the security headers — `astro dev` does
not emulate Vercel's edge. It closes with gate 9, alongside the headers, on one deployment.

---

## 6f. Risk #5 (theme no-flash) — landed 2026-07-27

The Next app read the `theme` cookie server-side and rendered the right class into the HTML. A
prerendered Astro page cannot — there is no request at build time, so the same HTML goes to everyone.
Replaced with an inline `<head>` script that applies the class before first paint.

**The docs gap in §6.3 is confirmed.** Astro's recipes index has no dark-mode, theme-toggle or
theme-flash entry, so this is a deliberate implementation rather than a documented pattern.

Three things are load-bearing, and each would fail silently:

1. **`is:inline`.** Without it Astro bundles the script, which makes it deferred — it runs _after_
   first paint, which is the exact flash this exists to prevent.
2. **Position before any stylesheet** in `<head>`, so the class is on `<html>` before the browser has
   anything to paint with.
3. **try/catch.** Theme is cosmetic; it must never take the page down.

**The cookie name and values are unchanged**, so a returning visitor keeps the theme they already
chose rather than being silently reset by the migration. Asserted in the tests.

**The toggle is not a React island.** The Next version was a client component only because everything
around it was; here a button that flips a class is what Astro's zero-JS default is for. It ships a
handful of bytes instead of hydrating a framework — a small structural improvement, taken because it
was free, not as a redesign.

### CSP coupling — worth remembering

The inline script needs `script-src 'unsafe-inline'`, which the production policy already allows
(risk #2). **If that policy is ever tightened to hashes, this script must be hashed with it** or the
site breaks in the dark. This is exactly the interaction §6.3 predicted.

### Gate

`astro/tests/e2e/theme.spec.ts` covers: the script's position relative to stylesheets, a stored dark
preference applying immediately, a stored preference beating a conflicting OS setting, `system`
following the OS in both directions, the toggle cycling light → dark → system and surviving a reload,
and the cookie matching the Next app's name, values and path.

Proven by sabotage: removing `is:inline` fails the ordering test, which is the one that stands
between the site and a visible flash.

---

## 6g. Risk #6 (role-lens switcher) — landed 2026-07-27

The Next app read `?lens=` from `searchParams` in a server component and rendered the matching
featured set. A prerendered Astro page cannot — the same HTML goes to everyone.

**Solved with CSS rather than JavaScript state.** Every lens panel is prerendered; an inline head
script sets `data-lens` on `<html>` from the query parameter before first paint, and a CSS attribute
selector reveals the matching panel. A shared `/?lens=ai` link therefore lands on the right set with
no flash, no hydration and no framework — the Next version needed React state plus every lens's cards
passed down as props.

Switching is `history.replaceState`, not `pushState`: a lens is a filter, not a navigation, so Back
leaves the page exactly as it did before. The default lens keeps the bare `/` URL, matching
`lensHref()`.

### The retired lens names — still a decision for Ross

Ported faithfully, which means **unchanged**: `/?lens=analytics-engineering` and `/?lens=ai-safety`
resolve, fail validation, and fall back to the default lens. There is now a test that _documents_
this as pre-existing behaviour rather than asserting it is correct. Mapping them onto `data` / `ai`
is the open Phase 0 decision from §1.4.

### Scope

Structural, not designed. Hero, ProofStrip, evidence frames, project cards and SkillsCluster arrive
with the component port. What this branch proves is the mechanism the Next version got for free from
server-side `searchParams`.

### Gate

`astro/tests/e2e/lenses.spec.ts` enumerates from `registry.json` — so adding or reordering a lens
cannot leave it asserting a stale set — and covers: each lens's shared URL showing its own featured
slugs and headline, only one panel visible at a time, missing and nonsense lenses falling back,
retired names falling back, in-place re-ranking using the registry's own before/after pair, the URL
becoming shareable, `aria-pressed` tracking the active lens, and the script's position before any
stylesheet.

Proven by sabotage: making the script ignore the query parameter failed four tests.

---

## 7. Recommended shape — unchanged from the brief, with one addition

Phase 0 (IA, today) → Phase 1 (port at parity) → Phase 2 (redesign in Astro). The brief's reasoning
holds and the repo evidence supports it: `validate:projects` and the Playwright suite are a free
regression harness _only while markup and URLs stay stable_.

**One addition:** Phase 1 should be split so `/contact` lands first, alone, on a branch, deployed to
a Vercel preview and verified end-to-end (form sends, rate limit fires, Turnstile rejects, headers on
the wire) **before** any other route is ported. It is the only route with an irreversible
architecture decision in it. If Actions-plus-adapter turns out wrong, that is a two-day discovery on
a one-route branch, not a two-week discovery on a finished site.

---

## Decisions — settled 2026-07-27

1. ✅ **`SkillsCluster` on `/` vs Toolbox on `/about` — show it once.** Cut from the home page; the
   `/about` Toolbox aside owns it. Home already shows the stack _through the work_ — every project
   card carries its own stack chips — so a separate list there is the narrative version of something
   the evidence already says. It also shortens the path from hero to the featured set. Recorded for
   the component port; **no change made to the live Next site**, since production stays untouched
   until cutover.
2. ✅ **Retired lens names map to their nearest surviving lens.** `analytics-engineering` and
   `data-engineering` → `data`; `applied-ai` and `ai-safety` → `ai`. Analytics engineering maps to
   `data` rather than the default because data and analytics engineering are the same direction for
   this portfolio, and that is the direction being led with. Implemented in `LENS_ALIASES`; genuine
   nonsense still falls back to the default. Broader positioning is still open — Ross is thinking
   about it, and nothing here forecloses it.
3. ✅ `cv-download.tsx`, `ScreenshotFrame`, `now-building.ts` — cut, not ported.
4. ✅ Fresh `npm create astro@latest`; astroplate reference only.
5. ✅ `@astrojs/vercel`, `output: 'static'`, `prerender = false` on `/contact` only.
6. ✅ Phase 1 gate as written — `check:links` dropped, sitemap-diff and deployed-headers added.
7. ✅ Baselines captured: sitemap, live headers, redirect status codes, and Lighthouse (§1.3).
8. ✅ `/contact`-first sequencing — done; all six risks landed in order.

### Still open

- ~~Gate 9~~ — **CLOSED 2026-07-29.** Verified on a real Astro deployment: nine headers
  byte-identical, thirteen redirects at 308, eleven OG cards, and the contact Action running as a
  live serverless function. See §6c.
- **Broader positioning.** Data engineering and analytics engineering lead for now; Ross is still
  weighing the wider framing. The lens aliases above are compatible with either outcome.
