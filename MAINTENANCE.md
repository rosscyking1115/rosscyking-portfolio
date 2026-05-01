# Maintenance & Reproducibility Guide

> Single-source handoff for `rosscyking.com` portfolio. Read top-to-bottom once;
> after that use the table of contents.

## Contents

1. [What this site is](#what-this-site-is)
2. [Live URLs and accounts](#live-urls-and-accounts)
3. [Stack at a glance](#stack-at-a-glance)
4. [How the project is wired together](#how-the-project-is-wired-together)
5. [Every-day maintenance recipes](#every-day-maintenance-recipes)
6. [Environment variables — what each one does](#environment-variables--what-each-one-does)
7. [Service setup playbooks](#service-setup-playbooks)
8. [The PR / deploy workflow](#the-pr--deploy-workflow)
9. [Lessons learned — mistakes to avoid](#lessons-learned--mistakes-to-avoid)
10. [Troubleshooting cookbook](#troubleshooting-cookbook)
11. [Reproducing from scratch](#reproducing-from-scratch)
12. [Things deferred for later](#things-deferred-for-later)

---

## What this site is

Personal portfolio at `https://rosscyking.com`. Static-first Next.js 16 site with serverless contact handling, Markdown-driven content, Vercel hosting, full security headers, automated tests, and analytics.

Built in eight phases:

| Phase | What it added                                                          |
| ----- | ---------------------------------------------------------------------- |
| 0     | Next.js + Tailwind + theme + CI scaffolding                            |
| 1     | Home page, hero, featured projects, skills cluster, Motion animations  |
| 2     | MDX projects pipeline (drop a file → it appears)                       |
| 3     | About page, education timeline, CV download, print stylesheet          |
| 4     | Contact form (Resend email + Turnstile bot check + Upstash rate limit) |
| 5     | CSP, HSTS, security.txt, Dependabot, CodeQL                            |
| 6     | Vitest, Testing Library, Playwright, axe-core, CI matrix               |
| 7     | sitemap, robots, JSON-LD, OG images, Geist fonts, manifest, icons      |
| 8     | Vercel Analytics + Speed Insights, custom domain                       |

---

## Live URLs and accounts

| Resource              | URL / Where                                            |
| --------------------- | ------------------------------------------------------ |
| Production site       | https://rosscyking.com                                 |
| GitHub repo           | https://github.com/rosscyking1115/rosscyking-portfolio |
| Vercel project        | https://vercel.com → `rosscyking-portfolio`            |
| Domain registrar      | (whichever you used)                                   |
| Resend dashboard      | https://resend.com                                     |
| Cloudflare Turnstile  | https://dash.cloudflare.com → Turnstile                |
| Upstash Redis         | https://console.upstash.com                            |
| Google Search Console | https://search.google.com/search-console               |
| Mozilla Observatory   | https://observatory.mozilla.org/?host=rosscyking.com   |

All accounts use the same GitHub / Google identity for SSO where possible.

---

## Stack at a glance

| Layer              | Choice                                           | Notes                                                              |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------ |
| Framework          | Next.js 16 (App Router)                          | `next.config.ts`, Turbopack                                        |
| Language           | TypeScript strict                                | `tsconfig.json`                                                    |
| Runtime            | React 19                                         | server components by default                                       |
| Styling            | Tailwind CSS v4                                  | CSS-variable design tokens, `@theme inline`                        |
| Component patterns | shadcn-style on Radix primitives                 | copied into `src/components/ui`                                    |
| Icons              | `lucide-react`                                   | tree-shaken via `experimental.optimizePackageImports`              |
| Animation          | `motion` (formerly Framer Motion)                | `<FadeIn>` wrapper                                                 |
| Theme              | custom cookie-based provider                     | `src/components/layout/theme-provider.tsx`, no `next-themes`       |
| Content            | MDX in `content/`                                | parsed via `gray-matter` + zod, rendered via `next-mdx-remote/rsc` |
| Forms              | `react-hook-form` + `zod`                        | client + server validation share schema                            |
| Email              | Resend                                           | server action in `src/app/contact/actions.ts`                      |
| Bot protection     | Cloudflare Turnstile                             | site key public, secret server-only                                |
| Rate limit         | Upstash Redis + `@upstash/ratelimit`             | sliding window 5/hour/IP                                           |
| Notifications      | `sonner`                                         | toast on success/error                                             |
| Tests              | Vitest + Testing Library + Playwright + axe-core | three CI jobs                                                      |
| CI                 | GitHub Actions                                   | `.github/workflows/ci.yml` + `codeql.yml`                          |
| Deploy             | Vercel                                           | auto on push to `main`                                             |
| Analytics          | Vercel Analytics + Speed Insights                | privacy-friendly                                                   |
| Static analysis    | CodeQL                                           | weekly + on PR                                                     |
| Dep updates        | Dependabot                                       | weekly grouped PRs                                                 |

---

## How the project is wired together

```
src/
├─ app/                          Routes (Server Components by default)
│  ├─ layout.tsx                 Root layout: theme cookie, JSON-LD, fonts, Toaster, Analytics
│  ├─ page.tsx                   Home: Hero + FeaturedProjects + SkillsCluster
│  ├─ globals.css                Tailwind v4 directives + CSS-variable design tokens
│  ├─ icon.tsx                   512×512 generated favicon
│  ├─ apple-icon.tsx             180×180 iOS touch icon
│  ├─ manifest.ts                Web manifest
│  ├─ opengraph-image.tsx        Default OG card (1200×630)
│  ├─ sitemap.ts                 Auto-generated from MDX projects + static routes
│  ├─ robots.ts                  Crawler rules
│  ├─ projects/
│  │  ├─ page.tsx                Gallery with filter chips (?stack=…)
│  │  └─ [slug]/
│  │     ├─ page.tsx             MDX project detail
│  │     ├─ opengraph-image.tsx  Per-project OG card
│  │     └─ not-found.tsx        Custom 404
│  ├─ about/page.tsx             Bio + education timeline + skills + CV download
│  └─ contact/
│     ├─ page.tsx                Form host
│     └─ actions.ts              Server Action: validate → honeypot → rate-limit → Turnstile → Resend
│
├─ components/
│  ├─ layout/                    Container, Section, Nav, Footer, ThemeProvider, ThemeToggle
│  ├─ ui/                        Button, Badge, Card, Input, Textarea, Label
│  ├─ home/                      Hero, FeaturedProjects, SkillsCluster
│  ├─ projects/                  ProjectCard, ProjectGrid, ProjectFilter
│  ├─ about/                     ExperienceTimeline, CvDownload
│  ├─ contact/                   ContactForm
│  └─ motion/                    FadeIn (entrance animations)
│
├─ lib/
│  ├─ site-config.ts             Site name, links, nav items — single source of truth
│  ├─ env.ts                     zod-validated env vars
│  ├─ utils.ts                   `cn()` Tailwind merge helper
│  ├─ projects.ts                MDX loader (server-only)
│  ├─ about.ts                   Bio MDX loader (server-only)
│  ├─ skills.ts                  Skill clusters (data)
│  ├─ experience.ts              Education + languages (data)
│  ├─ contact-schema.ts          zod schema (client + server share)
│  ├─ email-template.ts          Contact-form email HTML
│  ├─ rate-limit.ts              Upstash factory
│  ├─ theme-cookie.ts            Browser cookie helpers (client-safe)
│  ├─ theme-cookie.server.ts     Server-side cookie reader
│  └─ json-ld.ts                 Person + WebSite structured data
│
├─ types/                        Project, Experience interfaces
└─ ...

content/
├─ about.mdx                     Bio prose
└─ projects/                     One .mdx file per project
   ├─ scalable-machine-learning-pyspark.mdx
   ├─ event-extraction-llm-baseline.mdx
   ├─ com6513-qa-assistant.mdx
   └─ speech-speed-tempo-classification.mdx

public/
├─ cv.pdf                        CV download
├─ google*.html                  Search Console verification
└─ .well-known/security.txt      RFC 9116

tests/
├─ unit/                         Vitest unit tests
├─ component/                    Vitest + Testing Library
└─ e2e/                          Playwright + axe-core

.github/
├─ workflows/ci.yml              quality + unit + e2e matrix
├─ workflows/codeql.yml          weekly + on PR
└─ dependabot.yml                weekly grouped npm + monthly GHA
```

---

## Every-day maintenance recipes

### Add a new project

1. Create `content/projects/<slug>.mdx`. Copy the front matter from an existing one:

   ```mdx
   ---
   title: My New Project
   summary: One-line elevator pitch.
   stack: [Python, PyTorch, FastAPI]
   role: Solo project
   period: "2026"
   publishedAt: "2026-08-15" # ISO date — used for sorting
   featured: true # show on home page (max 3 cards looks best)
   links:
     github: https://github.com/...
     demo: https://demo-url
     paper: https://arxiv.org/...
   ---

   ## Body in MDX

   Markdown + JSX. Code blocks get syntax highlighting via Shiki.
   ```

2. Push (or PR + merge). The home page strip and `/projects` gallery pick it up automatically.
3. The OG image at `/projects/<slug>/opengraph-image` regenerates on demand.

### Update bio prose

Edit `content/about.mdx`. Push.

### Edit education / languages

Edit `src/lib/experience.ts`. Both `education` and `languages` arrays.

### Add or rename skills

Edit `src/lib/skills.ts`. Each `SkillGroup` becomes a chip cluster on the home and about pages.

### Swap the CV

Drop a new file at `public/cv.pdf`. Push. The Download CV button on `/about` serves it.

### Change colours / typography

Edit CSS variables at the top of `src/app/globals.css`. Both `:root` (light) and `.dark` blocks. Components don't need to change — they use `bg-background`, `text-foreground` etc.

### Change site metadata (name, role, links, nav)

Edit `src/lib/site-config.ts`. One file, every component reads from it.

### Add a new page

```bash
mkdir src/app/blog
```

Create `src/app/blog/page.tsx` with a default-exported component. Add `{ href: "/blog", label: "Blog" }` to `siteConfig.nav` and you're done.

### Add a new dependency

```powershell
npm install some-package
git add package.json package-lock.json
git commit -m "feat: add some-package for X"
git push
```

**Always commit `package.json` and `package-lock.json` together.** CI runs `npm ci` which fails if they're out of sync.

### Run the test suite locally

```powershell
npm test                 # unit + component (Vitest)
npm run test:coverage    # with coverage report
npm run test:e2e         # Playwright (requires npm run build first)
npm run test:e2e:ui      # Playwright UI mode (debugging)
```

### Run dev locally

```powershell
npm run dev              # http://localhost:3000
```

The contact form works in dev — Resend / Turnstile / Upstash all skip gracefully when env vars aren't set, and submissions log to the dev terminal instead.

---

## Environment variables — what each one does

All set in **Vercel → Project → Settings → Environment Variables**, **Production only** unless noted.

| Variable                         | Purpose                                                                | Where to get it                              | Sensitive?                          |
| -------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SITE_URL`           | Used by metadata, sitemap, OG images. Set to `https://rosscyking.com`. | hardcoded                                    | No (public)                         |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Renders the Turnstile widget on `/contact`. **Public by design.**      | Cloudflare Turnstile widget settings         | No                                  |
| `TURNSTILE_SECRET_KEY`           | Server-side bot-check verification.                                    | Same Turnstile widget, Secret key field      | **Yes**                             |
| `RESEND_API_KEY`                 | Authenticates Resend SDK calls.                                        | Resend → API Keys                            | **Yes**                             |
| `RESEND_TO_EMAIL`                | Inbox that receives contact form messages.                             | your email                                   | No (it's on the site footer anyway) |
| `RESEND_FROM_EMAIL`              | Sender address. Must be on a verified Resend domain.                   | `contact@rosscyking.com` after domain verify | No                                  |
| `UPSTASH_REDIS_REST_URL`         | Upstash Redis REST endpoint.                                           | Upstash database overview                    | No (URL alone is useless)           |
| `UPSTASH_REDIS_REST_TOKEN`       | Upstash REST API token.                                                | Upstash database overview                    | **Yes**                             |

### Critical rule about `NEXT_PUBLIC_*` env vars

They are **baked into the JavaScript bundle at build time**. Adding or changing one **does nothing** until you redeploy. Always trigger a redeploy after touching `NEXT_PUBLIC_*`:

> Vercel → Deployments → top entry → ⋯ → Redeploy

### Production-only, never Preview / Development

The contact-form chain (Resend, Turnstile, Upstash) is **Production only**. In Preview/Development the form falls back to console-logging the submission. This prevents:

- Burning Resend quota on PR test fills
- Shipping spam to your inbox from preview URLs
- Rate-limit budget drain during testing

### Sensitive flag

Cosmetic. Toggling it ON means **you** can't read the value back in the Vercel UI later. Functionality is identical. Recommend ON for true secrets (the three marked **Yes** above), OFF for the rest.

---

## Service setup playbooks

### Resend (email)

1. Sign up at https://resend.com (GitHub OAuth).
2. **API Keys → Create API Key** → name it `rosscyking-portfolio`. Copy the value.
3. **Domains → Add Domain** → `rosscyking.com` → add the DNS records Resend shows (TXT for SPF, two TXTs for DKIM, optional MX for return-path) at your domain registrar.
4. Wait until the domain shows **Verified** (5–30 min).
5. Add `RESEND_API_KEY`, `RESEND_TO_EMAIL`, `RESEND_FROM_EMAIL` to Vercel env vars.
6. Redeploy.

### Cloudflare Turnstile (bot check)

1. https://dash.cloudflare.com → Turnstile → **Add site**.
2. Name `rosscyking`, hostname `rosscyking.com`, mode **Managed**.
3. Copy **Site key** → set as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
4. Copy **Secret key** → set as `TURNSTILE_SECRET_KEY`.
5. Redeploy (mandatory — the site key is `NEXT_PUBLIC_*`).

### Upstash Redis (rate limit)

1. https://upstash.com → Sign up (GitHub OAuth) → Create Database → **Redis**.
2. Region **eu-west-1** (Ireland), Type **Regional**, TLS on.
3. From the database overview, copy **REST URL** and **REST Token**.
4. Add to Vercel as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
5. Redeploy.

Free tier limits: 10k commands/day. A contact submission is ~2 commands so headroom is enormous.

### Google Search Console

1. https://search.google.com/search-console → **Add Property** → URL prefix → `https://rosscyking.com`.
2. Verify via HTML file: download `googleXXXXX.html`, drop it into `public/`, push, wait for deploy.
3. **Sitemaps** in left sidebar → enter `sitemap.xml` → Submit.
4. **URL Inspection** → paste `https://rosscyking.com` → **Request Indexing** to nudge.

---

## The PR / deploy workflow

### Daily flow

```powershell
git checkout -b some-change-branch
# make edits
git add .
git commit -m "feat: thing"
git push -u origin some-change-branch
```

Open PR on GitHub. CI matrix runs:

| Check                             | What it runs                                   | Required to merge |
| --------------------------------- | ---------------------------------------------- | ----------------- |
| `Lint, typecheck, build`          | Prettier, ESLint, `tsc --noEmit`, `next build` | Yes               |
| `Vitest (unit + component)`       | Coverage ≥80% on tracked modules               | Yes               |
| `Playwright (E2E + a11y)`         | All page flows + axe scans                     | Yes               |
| `Analyze (javascript-typescript)` | CodeQL static analysis                         | Yes               |
| `CodeQL`                          | Code-scanning summary                          | Yes               |

Branch protection blocks merging to `main` unless all five pass. Once green, **Squash and merge** keeps history clean. Vercel auto-deploys main within 90 seconds.

### Configuring required checks (in GitHub Settings → Rules)

The check names must match the **job display names**, not job IDs:

- `Lint, typecheck, build`
- `Vitest (unit + component)`
- `Playwright (E2E + a11y)`
- `Analyze (javascript-typescript)`
- `CodeQL`

If you ever rename a job's `name:` field in `.github/workflows/ci.yml`, update the ruleset to match.

### Pre-commit hook

Husky runs lint-staged on every commit:

- ESLint --fix on staged `*.{ts,tsx,...}`
- Prettier --write on staged config/markdown

If a commit fails the hook, fix the reported issues and commit again. The pre-commit only checks staged files; CI re-runs on everything.

---

## Lessons learned — mistakes to avoid

These are the bugs and gotchas hit during initial build. Documenting them so future-you doesn't re-discover.

### **Never run `npm audit fix --force`** ❌

Once during build, `npm audit fix --force` downgraded Next.js from 16.2.4 to 9.3.3 — a 6-year version regression — to "fix" vulnerabilities in transitive deps that don't exist on Next 16. The `--force` flag overrides every protection.

> Almost all `npm audit` warnings on a Next.js project come from transitive deps in _old_ Next versions that aren't actually in your install path. Ignore them or use the targeted Dependabot updates.

### Always commit `package.json` and `package-lock.json` together

If you run `npm install` and only commit `package.json`, CI's `npm ci` rejects the install (lockfile out of sync). Build fails on every PR until the lockfile is committed.

```powershell
git add package.json package-lock.json
git commit -m "deps: add foo"
```

### `NEXT_PUBLIC_*` env vars require a redeploy

These are inlined into the browser bundle at build time. Adding them in Vercel UI **without redeploying does nothing**. Set the var, then **Deployments → ⋯ → Redeploy**.

### Branch-protection check names must match display names, not job IDs

Listing required checks as `quality, unit, e2e` (job IDs) leaves the merge button stuck on "Expected — waiting for status to be reported" forever. Use the display names: `Lint, typecheck, build`, `Vitest (unit + component)`, `Playwright (E2E + a11y)`.

### React 19 forbids `<script>` JSX inside Client Components

Including `<script type="application/ld+json">` directly in a Client Component triggers a dev warning, and `<script>` for FOUC-prevention via `next/script` doesn't work either. Solution: cookie-based theme detection, no script tag in the React tree at all (see `src/lib/theme-cookie.server.ts`).

### React 19's `react-hooks/set-state-in-effect` rule is strict

Patterns like `useEffect(() => setMounted(true), [])` or `useEffect(() => setOpen(false), [pathname])` are now ESLint errors. Fix:

- For external sources (system theme): `useSyncExternalStore`
- For "react to navigation": move the state change into the click handler that _causes_ the navigation

See `src/components/layout/theme-provider.tsx` and `src/components/layout/nav.tsx` for the patterns.

### Server Components can't have `onClick` handlers

`ProjectCard` is a Server Component. Passing `onClick` to any element inside throws "Event handlers cannot be passed to Client Component props." Solution: use `relative z-10` for click-area stacking instead of `e.stopPropagation()`.

### Tailwind v4 `@plugin` directive can fail through Turbopack's PostCSS bridge

`@plugin "@tailwindcss/typography";` sometimes doesn't resolve. Workaround: explicit relative path:

```css
@plugin "../../node_modules/@tailwindcss/typography";
```

### Vitest can't natively load CommonJS configs that import ESM-only deps

`vite-tsconfig-paths` is ESM-only. Loading it from `vitest.config.ts` fails. Solution: drop `vite-tsconfig-paths`, wire `@/*` aliases explicitly via `resolve.alias` in `vitest.config.ts` (it's six lines).

### `import "server-only"` throws when imported in Vitest

Tests can't run modules that have `import "server-only"` because the package throws at import time. Solution: alias `server-only` to a stub in `vitest.config.ts`:

```ts
"server-only": path.resolve(__dirname, "tests/__mocks__/server-only.ts"),
```

The stub file is a one-line `export {};`.

### `npm ci` and lockfile drift on `legacy-peer-deps`

`@vercel/analytics` lists SvelteKit as a peerOptional, which makes npm 9+'s strict resolver chase Vite 8 and conflict with our Vite 5. Fix in `.npmrc`:

```
legacy-peer-deps=true
```

This file is project-level, picked up by both `npm install` and `npm ci`.

### Coverage thresholds need to match what's actually tested

Initial 60% global threshold failed because Vitest counts pages, server actions, OG images, and integration-heavy components in the denominator. Solution: explicit `include` in vitest config listing only modules with real unit tests; raise threshold to 80% on those.

### Search Console verification file must not be reformatted

Prettier wants to "fix" `public/google*.html` but Google requires it byte-identical. Add to `.prettierignore`:

```
public/google*.html
```

### Don't put non-Sensitive env vars on Production AND Preview if they trigger paid services

The contact pipeline (Resend, Turnstile, Upstash) is **Production only**. If you accidentally enable them on Preview, every PR test submission burns real quota.

### React Component names matter for failure modes

The Playwright `getByLabel("Name")` selector matched the wrong input when label text included asterisks for required fields. Fallback to ID selectors (`page.locator("#name")`) for tests where label content is dynamic.

### Cursor / VS Code holds locks on `node_modules` native binaries

When trying to delete `node_modules` on Windows, the Tailwind oxide native binary is often locked by Cursor's TypeScript service. Solutions:

- Close Cursor first
- Use `cmd /c "rd /s /q node_modules"` (more aggressive than PowerShell `Remove-Item`)
- Or rename the folder out of the way: `Rename-Item node_modules node_modules_old` (Windows allows rename even on locked folders)

---

## Troubleshooting cookbook

### "/contact returns 500 in production"

1. **Vercel project → Logs tab → filter by "Errors"** — read the actual stack trace.
2. Likely culprits:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set but build hasn't been redone → redeploy.
   - An env var has a trailing space/newline (zod's `.email()` rejects).
   - Resend domain not yet verified → temporarily set `RESEND_FROM_EMAIL=onboarding@resend.dev`.

### "Form submits but no email arrives"

1. Check Vercel Function Logs for the `/contact` action.
2. Check Resend → **Logs** to see if the request reached them.
3. Check spam folder.
4. Verify `RESEND_FROM_EMAIL` is on a domain that's in **Verified** status at Resend.

### "Turnstile widget never appears"

1. Open browser DevTools → Console. Look for CSP or 4xx errors on `challenges.cloudflare.com`.
2. Confirm `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set in Vercel.
3. If just-added, **redeploy**.
4. Test the key against the Cloudflare Turnstile dashboard preview to make sure it's active.

### "Rate limit triggers immediately on every submit"

Upstash returning errors counts as a "blocked" request. Check:

1. Upstash **Logs** tab — are commands hitting?
2. `UPSTASH_REDIS_REST_URL` and `_TOKEN` correctly paired (don't swap them).
3. Free tier daily 10k limit — unlikely on a portfolio.

### "Lighthouse < 95"

Common drops:

- LCP from large project images → optimize via `next/image` and explicit dimensions.
- Layout shift from late-loading fonts → make sure `next/font` (Geist) is being used.
- CLS from animated entrance → check `prefers-reduced-motion` rules in globals.css.

### "OG image shows Next.js default instead of mine"

Cache. Wait 5 min and check via `https://opengraph.xyz/?url=https://rosscyking.com`. LinkedIn's cache is especially stubborn — use their **Post Inspector** to force a refresh.

### "GitHub PR check stuck on 'Expected — Waiting for status to be reported'"

Required check name in branch ruleset doesn't match what GitHub reports. See [Lessons learned](#lessons-learned--mistakes-to-avoid).

### "Format check fails on a file we shouldn't touch"

Add the file to `.prettierignore`. Re-commit.

### "ERR_BLOCKED_BY_CLIENT in browser console"

Your ad blocker is blocking Vercel Analytics or Speed Insights. Real visitors without blockers are tracked normally. Verify in incognito.

### "Vercel Live feedback widget triggers CSP error"

Only logged-in Vercel users see this on their own deployments. Real visitors don't. Either ignore it, or add `https://vercel.live` to `script-src` and `connect-src` in `next.config.ts`.

---

## Reproducing from scratch

If `node_modules` blows up or you want to re-set up a dev machine:

```powershell
# Prereqs
# - Node 22+ (.nvmrc pins 22)
# - npm 10+
# - Git
# - VS Code or Cursor

git clone https://github.com/rosscyking1115/rosscyking-portfolio.git
cd rosscyking-portfolio
npm install
cp .env.example .env.local      # optional, for full local feature testing
npm run dev                     # http://localhost:3000
```

Production build sanity check:

```powershell
npm run build
npm run start
```

Full test suite:

```powershell
npm test                                      # unit + component
npx playwright install --with-deps chromium  # one-time browser download
npm run build && npm run test:e2e             # E2E
```

If you need to redeploy a specific commit on Vercel:

- Vercel project → **Deployments** → find the commit → ⋯ → **Promote to Production**.

---

## Things deferred for later

Catalog of "we deliberately didn't do this" so future-you knows it's a choice, not an oversight:

- **CSP nonces via middleware.** Currently uses `'unsafe-inline'` for script-src. Switching to nonces earns a perfect Mozilla Observatory score but adds ~50 lines of middleware boilerplate. Worth it if scale increases or for a real production app. For a portfolio, A grade is plenty.
- **Sentry / error tracking.** Vercel logs cover ~95% of debugging needs. Add Sentry's free tier if 5xx rate climbs above noise floor.
- **Comments / blog.** MDX pipeline is already in place; adding `content/blog/` would mirror `content/projects/`.
- **i18n.** No internationalisation. Geist supports it. If switching to multi-language, consider `next-intl` and update `<html lang>`.
- **Auto-merge for Dependabot patches.** The `dependabot.yml` is set up for grouped PRs but doesn't auto-merge. Watch a few PRs first, then enable `auto-merge: true` for patch versions.
- **Tests for `ContactForm` / `ThemeToggle` / `Nav`.** These are integration-heavy and better-covered by Playwright than mocked component tests. Don't add unit tests "just for coverage."
- **CV photo on /about.** Decision-point for later. If wanted, use `next/image` with optimisation; remember to add the photo's path to `next.config.ts` `images.remotePatterns` if hosted externally.

---

## Quick reference — daily commands

```powershell
# Dev
npm run dev

# Add content
# (drop file in content/projects/, edit content/about.mdx, edit src/lib/site-config.ts)

# Quality gates locally
npm run lint
npm run format
npm run typecheck
npm test
npm run build

# Ship
git checkout -b feature/something
git add .
git commit -m "feat: ..."
git push -u origin feature/something
# Open PR on GitHub, wait for CI green, merge.

# Update deps
# Wait for Dependabot's weekly Monday PRs. Review, merge if green.
```

---

_Last updated: end of Phase 8. Edit this file whenever you change architecture, swap services, or learn something painful._
