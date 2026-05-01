# Reproduce Starter Kit — Personal Portfolio Build

> Drop this file into a fresh chat and the model can rebuild the same eight-phase
> portfolio for **any** person, on **any** domain, with **any** stack focus.
> The recipe is opinionated on infra (Next.js + Vercel + Resend + Turnstile +
> Upstash) but agnostic on identity.

---

## 0. How to use this kit

1. Open a new chat with a coding-capable model (Claude Sonnet/Opus, GPT-5,
   etc.) that has filesystem + shell tools.
2. Paste the **Kickoff prompt** in section 1.
3. Answer the **Intake questionnaire** in section 2. Everything downstream is
   filled from those answers.
4. Walk phases 0 → 8 in order. Do **not** skip ahead — each phase assumes the
   previous one is green.
5. Treat section 10 (Lessons learned) as a pre-flight checklist before every
   phase. Most of the pain we hit is caught there.

The total build, with a focused operator and the model in the loop, takes
**8–14 hours of wall time**. Most of that is waiting for installs, CI, and
DNS — actual decisions are quick.

---

## 1. Kickoff prompt (paste into the new chat)

```
I'm building a personal portfolio website. We will follow the Reproduce
Starter Kit attached as REPRODUCE-KIT.md — eight phases, in order.

Ground rules:
- TypeScript strict, Next.js (App Router, latest stable), Tailwind v4,
  React 19, Vercel hosting.
- Server-first: render on the server, hydrate only what needs interaction.
- Every change goes through a feature branch + PR. CI must be green before
  merge. No direct pushes to main.
- After each phase: typecheck, lint, build, run tests, then commit.
- Treat section 10 of the kit (Lessons learned) as a pre-flight checklist.
- File writes longer than ~80 lines: use `cat > file <<'EOF'` heredocs in
  bash, not the Write tool. Verify byte size after each write.

Start by asking me the Intake questionnaire (section 2). Once I've answered,
confirm the plan back to me, then begin Phase 0.
```

---

## 2. Intake questionnaire

Fill these in before starting. The model uses them everywhere — in
`siteConfig`, JSON-LD, OG images, copy, metadata, email templates, sitemap.

| Field          | Example                                         | Notes                                           |
| -------------- | ----------------------------------------------- | ----------------------------------------------- |
| `fullName`     | "Jordan Patel"                                  | Used in `<author>`, JSON-LD Person, CV filename |
| `shortName`    | "Jordan"                                        | Used in nav, hero, email signature              |
| `role`         | "Backend Engineer"                              | Subtitle under hero, OG title                   |
| `domain`       | `jordanpatel.dev`                               | Apex; `www` is auto-redirected by Vercel        |
| `contactEmail` | `hello@jordanpatel.dev`                         | Where the contact form delivers                 |
| `replyToEmail` | `personal@gmail.com`                            | Optional — visible only to you                  |
| `location`     | "Berlin, Germany"                               | Free-form, single line                          |
| `tagline`      | "I build resilient distributed systems."        | Hero subhead, ~60 chars                         |
| `bio`          | 2–3 paragraphs                                  | About-page lead                                 |
| `keywords`     | array of 6–10 strings                           | Metadata + JSON-LD                              |
| `socials`      | `{ github, linkedin, x?, mastodon?, bluesky? }` | At minimum GitHub + LinkedIn                    |
| `cvFile`       | `public/cv.pdf`                                 | Provide the PDF; will be linked from About      |
| `projects`     | 3–5 to feature on the home page                 | See sub-fields below                            |
| `experience`   | 3–6 roles for the About timeline                | title, company, dates, summary                  |
| `education`    | 1–3 entries                                     | degree, institution, dates                      |
| `skills`       | grouped, e.g. Languages / Frameworks / Tooling  | Used for filter chips                           |
| `themeAccent`  | optional hex/oklch                              | Defaults to neutral grayscale if unset          |

### Per-project fields (MDX frontmatter)

```yaml
title: "Project Name"
slug: project-name # kebab-case, must match filename
summary: "One-sentence pitch." # ≤ 140 chars, used in cards + OG
date: 2025-09-01 # ISO date, drives sort order
tech: [TypeScript, Next.js] # array, drives filter chips
repo: https://github.com/... # optional
demo: https://... # optional
featured: true # 3–5 of these surface on home page
cover: /projects/foo.png # optional, 1200×630 for OG
```

---

## 3. Prerequisites (accounts + tools)

Set these up **before** Phase 0. Most are free tier.

| Account               | Purpose                              | Notes                                     |
| --------------------- | ------------------------------------ | ----------------------------------------- |
| GitHub                | Code host + CI                       | Personal account fine                     |
| Vercel                | Hosting + preview deploys            | Connect to GitHub                         |
| Domain registrar      | DNS for the domain                   | Cloudflare, Porkbun, Namecheap — pick one |
| Resend                | Transactional email for contact form | Free tier = 3k emails/mo                  |
| Cloudflare            | Turnstile (bot protection)           | Free, no card required                    |
| Upstash               | Redis for rate limiting              | Free tier = 10k commands/day              |
| Google Search Console | Index submission                     | Connect after first deploy                |

Local tooling:

- Node ≥ 20.18 LTS (use `nvm` or `volta`; the repo will pin via `.nvmrc`).
- pnpm or npm (kit uses **npm** for compatibility with Vercel default).
- Git ≥ 2.40.
- VS Code (with Prettier + ESLint extensions) or Cursor.

---

## 4. Repo layout you should end up with

```
<repo>/
├─ .github/
│  ├─ workflows/
│  │  ├─ ci.yml             # Lint, typecheck, build · Vitest · Playwright
│  │  └─ codeql.yml         # Static analysis
│  └─ dependabot.yml        # Grouped weekly updates
├─ content/
│  ├─ about.mdx             # About page body
│  └─ projects/             # One MDX per project
│     ├─ project-a.mdx
│     └─ project-b.mdx
├─ public/
│  ├─ cv.pdf
│  ├─ favicon.ico
│  └─ .well-known/
│     └─ security.txt       # RFC 9116
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx         # Root layout, fonts, theme cookie, JSON-LD
│  │  ├─ page.tsx           # Home (hero + featured projects + CTA)
│  │  ├─ globals.css        # Tailwind v4 + design tokens
│  │  ├─ icon.tsx           # Generated favicon
│  │  ├─ apple-icon.tsx
│  │  ├─ opengraph-image.tsx# Default OG via ImageResponse
│  │  ├─ manifest.ts        # PWA manifest
│  │  ├─ sitemap.ts
│  │  ├─ robots.ts
│  │  ├─ about/page.tsx
│  │  ├─ contact/
│  │  │  ├─ page.tsx
│  │  │  └─ actions.ts      # Server Action: validate → Turnstile → Resend
│  │  └─ projects/
│  │     ├─ page.tsx        # Index + filter chips
│  │     └─ [slug]/page.tsx # MDX render via next-mdx-remote/rsc
│  ├─ components/
│  │  ├─ layout/            # Nav, Footer, ThemeProvider, ThemeToggle
│  │  ├─ ui/                # Button, Card, Input, Label, Section, etc.
│  │  ├─ home/              # Hero, FeaturedProjects
│  │  ├─ projects/          # ProjectCard, ProjectFilters
│  │  ├─ about/             # Timeline, SkillsGrid
│  │  ├─ contact/           # ContactForm (client) + Turnstile widget
│  │  └─ motion/            # Small framer-motion / motion wrappers
│  └─ lib/
│     ├─ site-config.ts     # Single source of truth for identity
│     ├─ env.ts             # zod-validated env loader
│     ├─ utils.ts           # cn(), formatDate(), etc.
│     ├─ projects.ts        # MDX loader + zod schema
│     ├─ about.ts           # About loader
│     ├─ skills.ts
│     ├─ experience.ts
│     ├─ contact-schema.ts
│     ├─ email-template.ts
│     ├─ rate-limit.ts
│     ├─ theme-cookie.ts        # client-safe helpers
│     ├─ theme-cookie.server.ts # server-only reader
│     └─ json-ld.ts             # Person + WebSite schemas
├─ tests/
│  ├─ unit/         # Vitest — pure functions
│  ├─ component/    # Vitest + Testing Library
│  └─ e2e/          # Playwright + axe-core
├─ .env.example
├─ .nvmrc
├─ .npmrc           # legacy-peer-deps=true
├─ .prettierrc.mjs
├─ .prettierignore
├─ next.config.ts
├─ tsconfig.json
├─ vitest.config.ts
├─ playwright.config.ts
├─ MAINTENANCE.md   # day-2 ops (this kit's sibling)
└─ REPRODUCE-KIT.md # this file
```

---

## 5. Phase 0 — Scaffolding (≈45 min)

**Goal:** an empty Next.js 16 + TS + Tailwind v4 app that builds, lints, type-checks, and is on GitHub with branch protection.

```bash
# 0.1 Create the app
npx create-next-app@latest <repo-name> \
  --typescript --tailwind --app --eslint --turbopack \
  --import-alias "@/*" --no-src-dir
cd <repo-name>

# 0.2 Pin Node and force consistent installs
echo "20.18.0"            > .nvmrc
echo "legacy-peer-deps=true" > .npmrc

# 0.3 Move source into src/ (cleaner) — adjust tsconfig paths
mkdir src && git mv app src/app

# 0.4 Add Geist fonts + cn helper
npm i geist clsx tailwind-merge class-variance-authority

# 0.5 Prettier + Tailwind plugin
npm i -D prettier prettier-plugin-tailwindcss
```

`.prettierrc.mjs`:

```js
export default {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 88,
  plugins: ["prettier-plugin-tailwindcss"],
};
```

`.prettierignore` (include the line `public/google*.html` — Search Console verification files must remain byte-identical, see lesson L13).

```bash
# 0.6 Husky + lint-staged
npm i -D husky lint-staged
npx husky init
echo 'npx lint-staged' > .husky/pre-commit
```

In `package.json` add:

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
  "*.{json,md,mdx,css,yml,yaml}": ["prettier --write"]
}
```

```bash
# 0.7 Verify everything is green
npm run lint && npm run build

# 0.8 Push to GitHub
git init && git add . && git commit -m "chore: scaffold"
gh repo create <repo-name> --public --source=. --remote=origin --push
```

**Branch protection (GitHub → Settings → Branches → main):**

- Require PR before merge
- Require status checks: leave blank for now — we'll add the exact display
  names in Phase 6 once CI exists.

**Phase 0 exit check:** `npm run build` succeeds, repo is public on GitHub,
`/` renders the default Next.js placeholder.

---

## 6. Phase 1 — Home page + design system (≈90 min)

**Goal:** identity-driven home page with hero, featured projects placeholder, light/dark theme via cookie, accessible nav.

```bash
# 1.1 shadcn-style primitives (we vendor — no CLI dependency)
npm i @radix-ui/react-slot @radix-ui/react-label lucide-react
```

**Design tokens** — in `src/app/globals.css`, define light + dark `oklch`
tokens (see this repo's globals.css for the exact set). Map them through
`@theme inline` so `bg-background`, `text-foreground`, etc., work as Tailwind
classes.

**Theme provider** — do **not** use `next-themes`. Reasons in lesson L4. Use
a small custom provider:

- `lib/theme-cookie.server.ts` reads the `theme` cookie in the root layout.
- `<html className={isDark ? "dark" : ""} style={{ colorScheme: ... }}>`
- A client `<ThemeProvider>` exposes `useTheme()` via
  `useSyncExternalStore` over a tiny event bus.
- A `<ThemeToggle>` button that sets the cookie + dispatches the event.

**Build:**

- `components/layout/Nav.tsx` (client): site name, links, theme toggle,
  mobile sheet.
- `components/layout/Footer.tsx` (server): copyright + social icons.
- `components/home/Hero.tsx`: headline, role, tagline, primary CTA → contact.
- `components/home/FeaturedProjects.tsx`: server component, will read MDX in
  Phase 2 (mock the data here).
- `components/ui/{Button,Card,Section}.tsx` with `class-variance-authority`.

**`Section` component must accept `headingAs?: "h1" | "h2"`** (default `h2`)
— the home and projects pages need an `h1` for axe to pass (lesson L11).

**Phase 1 exit check:** Lighthouse mobile ≥ 90 on `/`, no a11y violations,
theme toggle persists across reloads.

---

## 7. Phase 2 — MDX projects pipeline (≈90 min)

**Goal:** drop a `.mdx` file in `content/projects/`, get a typed entry on
`/projects` and a rendered page at `/projects/[slug]`.

```bash
npm i gray-matter zod next-mdx-remote rehype-pretty-code remark-gfm shiki reading-time
```

**`lib/projects.ts`:**

- `projectFrontmatterSchema` (zod) — validates every MDX file.
- `loadProjects()` — server-only, scans `content/projects/`, sorts by date
  desc, returns typed array.
- `loadProject(slug)` — single fetch + MDX compile.

**`app/projects/page.tsx`:**

- Server component, calls `loadProjects()`.
- `<ProjectFilters>` is a client child that reads search params for tech
  chips. Use `aria-current="true"` on the active chip — **not** `aria-pressed`
  (lesson L12).

**`app/projects/[slug]/page.tsx`:**

- Static at build time via `generateStaticParams`.
- Renders MDX with `next-mdx-remote/rsc`, plugins: `remark-gfm`,
  `rehype-pretty-code` (Shiki theme).
- Add `prose` (Tailwind typography) wrapper. Pin the plugin path explicitly
  in `globals.css` (`@plugin "../../node_modules/@tailwindcss/typography";`)
  — Turbopack does not resolve bare specifiers (lesson L7).
- Generate per-page OG images via `opengraph-image.tsx` in the slug folder.

**Phase 2 exit check:** add 2 sample MDX projects, both render with code
blocks highlighted; `/projects` filter works without JS errors.

---

## 8. Phase 3 — About + CV (≈60 min)

**Goal:** `/about` page driven by MDX + structured data; `/cv.pdf`
downloadable.

- `content/about.mdx` — bio, currently working on, contact.
- `lib/experience.ts`, `lib/education.ts`, `lib/skills.ts` — typed arrays.
- `components/about/Timeline.tsx` — vertical stack of role cards.
- `components/about/SkillsGrid.tsx` — chips grouped by category.
- Drop the CV PDF at `public/cv.pdf`. Link from About + Footer.

**Phase 3 exit check:** `/about` validates with structured-data testing tool
(JSON-LD person), CV downloads, print stylesheet renders the page cleanly
(see `globals.css` `@media print`).

---

## 9. Phase 4 — Contact form (≈120 min)

**Goal:** working form with validation, bot protection, rate limiting, real
email delivery — and graceful degradation in dev/preview when secrets are
missing.

```bash
npm i react-hook-form @hookform/resolvers zod sonner resend \
       @marsidev/react-turnstile @upstash/ratelimit @upstash/redis server-only
```

**Architecture:**

```
ContactForm (client)
  ├─ react-hook-form + zod
  ├─ Turnstile widget (NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  └─ submits → Server Action (actions.ts)

actions.ts (server, "use server")
  ├─ import "server-only"
  ├─ verify Turnstile token (TURNSTILE_SECRET_KEY)
  ├─ rate-limit by IP (Upstash sliding window, 5/min)
  ├─ send via Resend (RESEND_API_KEY)
  └─ return { ok | error }
```

**Graceful degradation:** if `RESEND_API_KEY` is missing, log the email to
the server console and return success. This lets preview deployments and
local dev work without secrets.

**Env vars (write to `.env.example` with placeholder values):**

| Var                              | Sensitive | Where                                      |
| -------------------------------- | --------- | ------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`           | no        | `https://<domain>`                         |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | no        | Cloudflare Turnstile                       |
| `TURNSTILE_SECRET_KEY`           | yes       | Cloudflare Turnstile                       |
| `RESEND_API_KEY`                 | yes       | Resend dashboard                           |
| `RESEND_FROM`                    | no        | e.g. `noreply@<domain>` (must be verified) |
| `RESEND_TO`                      | no        | your inbox                                 |
| `UPSTASH_REDIS_REST_URL`         | no        | Upstash REST URL                           |
| `UPSTASH_REDIS_REST_TOKEN`       | yes       | Upstash REST token                         |

**Critical:** `NEXT_PUBLIC_*` vars are baked at **build time**. After
adding/changing one, **redeploy** — restarting the dev server is not enough
in production (lesson L14).

**Phase 4 exit check:** submit a test message in dev (logs to console),
submit on a preview deploy with secrets (real email arrives), exceed 5
submissions in a minute (rate-limit error returned).

---

## 10. Phase 5 — Security hardening (≈60 min)

Add to `next.config.ts`:

- **CSP:** start strict (`default-src 'self'`); allow only the origins you
  actually use — Vercel Analytics, Vercel Speed Insights, Turnstile.
  `'unsafe-inline'` is acceptable for `script-src` because of Next.js's
  inline runtime, but document it. Drop `'unsafe-eval'` outside dev.
- **HSTS:** `max-age=63072000; includeSubDomains; preload`.
- **X-Frame-Options:** `DENY`.
- **Referrer-Policy:** `strict-origin-when-cross-origin`.
- **Permissions-Policy:** disable camera, mic, geolocation,
  interest-cohort, payment, usb.
- **Cross-Origin-Opener-Policy** + **Cross-Origin-Resource-Policy:**
  `same-origin`.

Add `public/.well-known/security.txt` (RFC 9116) — security contact email,
expires 12 months out, preferred languages.

**Phase 5 exit check:**

- [securityheaders.com](https://securityheaders.com) ≥ A
- [Mozilla Observatory](https://observatory.mozilla.org) ≥ A+
- DevTools console: zero CSP violations on every page

---

## 11. Phase 6 — Testing (≈120 min)

**Three layers:**

```bash
# Unit + component (Vitest)
npm i -D vitest @vitest/ui @vitest/coverage-v8 jsdom \
        @testing-library/react @testing-library/dom \
        @testing-library/jest-dom @testing-library/user-event \
        @vitejs/plugin-react

# E2E + a11y (Playwright)
npm i -D @playwright/test @axe-core/playwright
npx playwright install --with-deps chromium
```

**`vitest.config.ts` gotchas:**

- Do **not** use `vite-tsconfig-paths` — ESM-only and breaks Vitest.
  Wire `@/*` via explicit `resolve.alias` (lesson L8).
- Stub `server-only` via `tests/__mocks__/server-only.ts` aliased in the
  config (lesson L9).
- Coverage: keep `include` to a tight list of pure-function files; raise
  threshold to 80% only for those (lesson L15).

**Playwright:** smoke + axe scan per page. Run against the production
build (`next start`) in CI for realism.

**`.github/workflows/ci.yml` — three jobs, each with a stable display name:**

```yaml
jobs:
  quality:
    name: Lint, typecheck, build # ← exact name; used in branch protection
  unit:
    name: Vitest (unit + component)
  e2e:
    name: Playwright (E2E + a11y)
```

**Add CodeQL** (`.github/workflows/codeql.yml`) and **Dependabot**
(`.github/dependabot.yml` — group weekly minor + patch updates).

**Branch protection (GitHub → Settings → Branches):** require the **three
display names above** as status checks. Do _not_ use `CI` (workflow file
name) or `quality`/`unit`/`e2e` (job IDs) — those won't match (lesson L10).

**Phase 6 exit check:** open a PR; all three checks run and go green; merge
is blocked until they do.

---

## 12. Phase 7 — SEO + structured data (≈45 min)

- `app/sitemap.ts` — list `/`, `/about`, `/projects`, every project slug.
- `app/robots.ts` — allow all, point at sitemap.
- `app/manifest.ts` — PWA manifest.
- `lib/json-ld.ts` — `personSchema()` + `websiteSchema()`. Inject in root
  layout via `<script type="application/ld+json">`.
- `app/opengraph-image.tsx` (root) + per-page OG via `ImageResponse`. Use
  Geist via `loadGoogleFont`-style fetch.
- Verify with [Rich Results Test](https://search.google.com/test/rich-results).

**Phase 7 exit check:** sitemap is valid XML, JSON-LD validates, OG image
appears in [opengraph.dev](https://www.opengraph.dev/) preview.

---

## 13. Phase 8 — Analytics, deploy, post-launch (≈90 min)

```bash
npm i @vercel/analytics @vercel/speed-insights
```

Add `<Analytics />` and `<SpeedInsights />` to the root layout body.

**Domain:** in Vercel project → Domains → add apex + www. Point your
registrar's DNS to Vercel. SSL via Let's Encrypt is automatic.

**Resend domain:** Resend → Domains → add `<domain>` → publish the SPF +
DKIM TXT records at your registrar. Wait for verification before flipping
`RESEND_FROM`.

**Google Search Console:** add the property, verify via
`public/google<token>.html`. Submit `sitemap.xml`. Add to `.prettierignore`
(lesson L13).

**Final audits:**

- Lighthouse (mobile + desktop, all four categories ≥ 95)
- securityheaders.com ≥ A
- WebPageTest first-byte < 600 ms
- Manual: contact form delivers, rate-limit fires, theme toggle persists,
  CV downloads, every page renders in print preview.

**Phase 8 exit check:** site is live on `https://<domain>`, all CI is
green, branch protection is enforced, analytics dashboard shows real
traffic.

---

## 14. Lessons learned (read before each phase)

These are the mistakes we hit. Each one cost real time. Avoid them.

### L1 — Never run `npm audit fix --force` on a Next.js project

It happily downgrades `next` to a 9.x release, breaking the App Router and
hundreds of files. Pin major versions in `package.json` and manage advisories
manually.

### L2 — Always commit `package.json` and `package-lock.json` together

CI's `npm ci` requires the lock to match. Drift = broken build. Make it a
muscle-memory `git add package*.json`.

### L3 — `legacy-peer-deps=true` in `.npmrc`

Without it, `@vercel/analytics` and similar peerOptional deps with SvelteKit
metadata create vite@8 conflicts. Set this on day one.

### L4 — Skip `next-themes` on React 19

It injects a `<script>` that triggers React 19's hydration warning and
double-paints. Roll a 30-line cookie-based provider with `useSyncExternalStore`
instead — same UX, no warnings.

### L5 — Beware `react-hooks/set-state-in-effect`

ESLint's new rule (Next 16) flags any `useEffect` whose only job is
`setState`. The fix is usually:

- subscribe via `useSyncExternalStore` (theme, system preference)
- move the side effect into the event handler that caused it (closing a
  nav menu on route change → put `closeMenu()` in the link `onClick`)

### L6 — Server Components cannot have `onClick`

If a card needs a click handler, either make the whole component a client
component, or wrap the entire card in a `<Link>` and use `relative z-10`
on the inner stack to let nested anchors win. We chose option 2.

### L7 — Tailwind v4 + Turbopack: explicit plugin paths

```css
/* WRONG — Turbopack will not resolve this */
@plugin "@tailwindcss/typography";

/* RIGHT */
@plugin "../../node_modules/@tailwindcss/typography";
```

### L8 — Don't use `vite-tsconfig-paths` with Vitest

It's ESM-only and clashes with Vitest's CJS hybrid. Wire `@/*` via
`resolve.alias: { "@": path.resolve(__dirname, "./src") }`.

### L9 — `import "server-only"` throws in Vitest

Stub it. Create `tests/__mocks__/server-only.ts` (empty) and alias the
package to that path in `vitest.config.ts`.

### L10 — Branch-protection check names match the **display name**

In `ci.yml` you see:

```yaml
jobs:
  quality: # ← job ID — NOT what GitHub displays
    name: Lint, typecheck, build # ← this is what branch protection sees
```

When configuring required status checks, type the **`name:` field value**,
not the job ID and not the workflow file name (`CI`).

### L11 — Every page needs exactly one `<h1>`

axe-core fails the build if a page has zero. Add `headingAs?: "h1" | "h2"`
to your `Section` component and use `headingAs="h1"` on the top section of
each route (Home, About, Projects index, Contact, every `[slug]`).

### L12 — Filter chips: use `aria-current`, not `aria-pressed`

For navigation-style filters, `aria-pressed` triggers axe's
"button must have accessible name" rule against `<Link>`. `aria-current="true"`
is the correct semantics.

### L13 — Add `public/google*.html` to `.prettierignore`

Search Console rejects the verification file if a single byte changes.
Prettier reformats it on every commit otherwise.

### L14 — `NEXT_PUBLIC_*` env changes require a **redeploy**

These are baked into the client bundle at build time. Adding the var in
Vercel UI without triggering a new build = the production bundle still
references `undefined`. After every env change, "Redeploy" from the
Deployments tab.

### L15 — Coverage thresholds: be picky about `include`

A blanket `include: ["src/**"]` will count integration-heavy files (like
`actions.ts`) and the 60% gate will flap. Instead list the ~8 truly unit-
testable modules and raise the gate to 80% only for them.

### L16 — `prepare` script + Husky in CI

`"prepare": "husky"` runs on `npm install` everywhere — including CI.
Either guard it (`is-ci || husky`) or accept that CI pays the ~50ms.
The kit ships with the unguarded version because CI passes are short.

### L17 — Cursor / VS Code can lock files during writes

If a Write tool call truncates mid-content, close the file in the editor
and retry. Better: use `cat > file <<'EOF'` heredocs through the bash tool
for any write longer than ~80 lines. Verify size with `wc -c`.

### L18 — Strip stray NUL bytes from CSS

A bad terminal paste left a NUL at the end of `globals.css`, silently
breaking Tailwind v4's parser. If `npm run build` complains about CSS the
file looks fine, run `xxd globals.css | tail` and check for `00`.

### L19 — Contact `muted-foreground` contrast

`oklch(0.45)` over `oklch(1)` fails WCAG AA. We bumped to `oklch(0.40)`
in light mode. Verify with the [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/)
on every token change.

### L20 — Contact form 500 in production = missing public env var

If `/contact` works in dev but 500s in prod, the most likely culprit is
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` not being set at build time (see L14).
Check the Vercel build log for the var, then redeploy.

---

## 15. Reproducibility checklist (run this before declaring "done")

Tick every box on a fresh production deploy:

- [ ] `npm ci && npm run build` from a clean clone — succeeds
- [ ] `npm run lint` — zero errors
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run test` — green, coverage ≥ 80% on the configured include set
- [ ] `npm run test:e2e` — green, axe-core: 0 violations on every page
- [ ] Lighthouse mobile ≥ 95 / 95 / 95 / 100 (perf / a11y / best / SEO)
- [ ] [securityheaders.com](https://securityheaders.com) ≥ A
- [ ] [Mozilla Observatory](https://observatory.mozilla.org) ≥ A+
- [ ] CSP: zero violations across `/`, `/about`, `/projects`, `/projects/<slug>`, `/contact`
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) — Person + WebSite valid
- [ ] OG image renders in [opengraph.dev](https://www.opengraph.dev/)
- [ ] Contact form: real email delivered + rate-limit fires after 5/min
- [ ] Theme toggle: persists across reload, no FOUC
- [ ] Print preview of every page: usable, no nav/footer noise
- [ ] CV link returns 200 with `application/pdf`
- [ ] `/sitemap.xml` valid + submitted to Search Console
- [ ] Branch protection on `main` requires the three CI display names
- [ ] Dependabot has opened ≥ 1 PR (proves grouping config works)
- [ ] CodeQL workflow has run at least once with no high-severity findings
- [ ] `MAINTENANCE.md` is committed and current

---

## 16. Hand-off prompt for the new chat (after the build is done)

When the new owner hands the build off again later, paste this:

```
The site is live and matches REPRODUCE-KIT.md phases 0–8. MAINTENANCE.md
is the day-2 ops manual: directory tree, env vars, common recipes, and the
lessons-learned list.

Before any code change:
1. Read MAINTENANCE.md sections relevant to the change.
2. Cross-check section 14 of REPRODUCE-KIT.md (lessons learned) for
   anything that might bite.
3. Open a feature branch, make the change, run lint/typecheck/test/build
   locally before pushing.
4. PR → all three CI checks green → merge.
```

---

## 17. Things deliberately deferred

These were considered and skipped on purpose. Don't add them in the initial
build — revisit only if the site outgrows this template.

- **CSP nonces** — adds Edge middleware complexity for marginal CSP score.
- **Sentry / error tracking** — add only after first 100 unique visitors.
- **Blog / RSS** — same MDX pipeline as projects; add when there's content.
- **i18n** — App Router has good support but doubles maintenance surface.
- **Auto-merge bot** — wait until you trust your test suite for ≥ 3 months.
- **Photo on About** — a portrait is great signal but adds a photoshoot
  bottleneck; ship without and add later.

---

_End of kit. Total length: this file + MAINTENANCE.md is everything an LLM
with shell + filesystem access needs to rebuild the site from zero._
