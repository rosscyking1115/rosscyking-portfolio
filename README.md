# rosscyking-portfolio

Personal portfolio for Cheng-Yuan (Ross) King — built with Next.js 16, React 19,
TypeScript, Tailwind CSS v4, and shadcn-style components on Radix primitives.

Static-first site with serverless functions for the contact form. Deployed on
Vercel free tier. Full test pyramid: Vitest, React Testing Library, Playwright,
axe-core. Hardened security headers and rate-limited API routes.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript strict
- **Styling**: Tailwind CSS v4 with CSS-variable design tokens
- **Theme**: `next-themes` (light / dark / system, persisted in localStorage)
- **Components**: shadcn-style on `@radix-ui/*` primitives, copied into `src/components/ui`
- **Animation**: `motion` (formerly Framer Motion)
- **Icons**: `lucide-react`
- **Forms**: `react-hook-form` + `zod` _(Phase 4)_
- **Email**: Resend _(Phase 4)_
- **Bot protection**: Cloudflare Turnstile _(Phase 4)_
- **Rate limiting**: Upstash Ratelimit + Redis _(Phase 4)_
- **Tests**: Vitest, Testing Library, Playwright, axe-core _(Phase 6)_
- **CI**: GitHub Actions

## Getting started

```bash
# 1. Install dependencies (run this first)
npm install

# 2. Copy env template and fill values when needed
cp .env.example .env.local

# 3. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Command                | What it does                         |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start the dev server with hot reload |
| `npm run build`        | Production build                     |
| `npm run start`        | Run the production build locally     |
| `npm run lint`         | ESLint                               |
| `npm run lint:fix`     | ESLint with autofix                  |
| `npm run format`       | Prettier write                       |
| `npm run format:check` | Prettier check (used in CI)          |
| `npm run typecheck`    | `tsc --noEmit`                       |

## Folder layout

```
src/
├─ app/                 # Next.js App Router pages, API routes, layout
│  ├─ globals.css       # Tailwind v4 directives + CSS-variable design tokens
│  ├─ layout.tsx        # Root layout: ThemeProvider, Nav, Footer
│  └─ page.tsx          # Home (placeholder until Phase 1)
├─ components/
│  ├─ layout/           # Container, Nav, Footer, ThemeProvider, ThemeToggle
│  └─ ui/               # shadcn-style primitives (Button, etc.)
├─ lib/
│  ├─ env.ts            # zod-validated environment variables
│  ├─ site-config.ts    # Site name, links, nav items
│  └─ utils.ts          # `cn` helper (clsx + tailwind-merge)
content/                # MDX content (Phase 2: projects, Phase 3: about)
public/                 # Static assets (CV, OG images, favicons)
.github/workflows/      # CI pipelines
```

## Design tokens

Tokens live in `src/app/globals.css` as CSS variables under `:root` (light) and
`.dark` (dark), then mapped into Tailwind's theme via `@theme inline`. Edit the
variable values to retheme the entire site without touching components.

## Build phases

This site is being built in eight short phases. The full plan is in
`Portfolio_Build_Plan.md` (one folder up).

- **Phase 0** ✅ Foundation — Next.js, Tailwind, theme, layout shell, CI
- **Phase 1** Home page + design system
- **Phase 2** Projects gallery + MDX pipeline
- **Phase 3** About page + CV download
- **Phase 4** Contact form + Resend backend
- **Phase 5** Security hardening (CSP, HSTS, Dependabot)
- **Phase 6** Testing — Vitest + Playwright + axe
- **Phase 7** SEO, performance, accessibility polish
- **Phase 8** Domain + analytics + monitoring

## Deployment

Push to `main` on GitHub. Vercel deploys automatically. Pull requests get
preview URLs.

## License

Private. Do not redistribute.
