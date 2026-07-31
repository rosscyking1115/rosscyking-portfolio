# Part 2 — design pass brief

Paste the block below into a fresh session. Written 2026-07-31, after Part 1
(PR #80) closed the positioning work.

---

You are doing a design-quality pass on `C:\dev\personal\rosscyking-portfolio`,
a personal portfolio at rosscyking.com. Fresh context deliberately: the previous
session finished a Next→Astro migration and the positioning copy, and stopped
before this because a design proposal assembled on the tail of another job would
be assembled from my bullet points rather than from what you actually found.

LOAD FIRST: the `impeccable` skill (just updated to v4.0.4) and `frontend-design`.
This brief is deliberately not a substitute for them. There is no PRODUCT.md;
this is a scoped request against existing code, so proceed with the code as
context and do not divert into `init`.

## The brief

Frontier-quality UI — fully responsive, modern, smooth — WITHOUT changing the
design language. I like what the site is. I want the execution raised.

## What the design language is, so it survives

Monospace metadata in brackets (`[ Ross King ]`, `[ 01 ]`), generous type with a
muted blue accent on one highlighted phrase, restrained chips, filled-dark
primary against outlined secondary, tick-mark rules (`.ruler`). It reads as
technical-documentation-meets-editorial and it is coherent. Do not replace it.
Raise it.

## Audit before proposing

Report what is actually weak. Do not start from the list below — it is what one
person noticed from one screenshot plus a source read, not a survey. You can see
everything; I cannot.

Three things already known:

1. **The stats are the biggest miss.** "9 projects shipped · 1,256 tests across
   them · 7 live demos" renders as small grey monospace at the foot of the hero
   (`src/components/home/ProofStrip.astro`). "1,256 tests" is the single most
   credible number on the site and it is set like a footnote. That is a
   hierarchy failure, not a taste one, and fixing it needs no new content — only
   typography and space.

2. **Motion is inconsistent, and worse than it looks.** There are THREE separate
   `.reveal` implementations, each redeclaring the same keyframes in its own
   scoped `<style>` block at different values:
   - `src/components/home/Hero.astro` — 500ms, 10px
   - `src/components/home/FeaturedProjects.astro` — 400ms, 8px
   - `src/pages/projects/index.astro` — 400ms, 8px, 40ms stagger
   - `src/components/home/NowBuilding.astro` — a fourth copy, no delay
     That is one idea copy-pasted and drifting. Whatever the pass does, it
     consolidates. Note FeaturedProjects originally shipped with NO animation at
     all and it went unnoticed — see AGENTS.md on absence.

3. **Responsive is unverified** beyond Playwright's single viewport. Treat "fully
   responsive" as a finding to establish by looking, not an assumption.

## Constraints, all hard

- **CSS-first motion.** Astro ships zero framework JS by default and that is a
  feature of this site. Do not add an animation library. Prefer transitions,
  scroll-driven animations and view transitions over JS-driven motion.
- **`prefers-reduced-motion` must be honoured.** There is a global block in
  `src/styles/global.css`; check it actually covers what you add.
- **Both themes.** There is a light/dark/system toggle and axe runs across 8 page
  types. Every change holds in both or it does not ship.
- **Do not break the gates.** 130 Playwright tests, 30 Vitest, axe across 8 page
  types. A pass that lowers accessibility coverage is a regression regardless of
  how it looks. If a change makes a test fail, decide whether the test or the
  change is wrong and say which — do not delete the test.
- **Performance.** Static Astro is part of why this site is good. Do not trade
  measurable speed for motion. A Lighthouse baseline exists at
  `tests/fixtures/astro-lighthouse.json`.
- **Do not touch content or claims.** Positioning was settled in Part 1 and a
  design pass is not a licence to reword.

## Propose before implementing

Design lands badly when it arrives whole. Write the direction — what changes,
what stays, and why — and route it to me before building. I am the one who has
to recognise the site afterwards.

## Practical notes that will otherwise cost you an hour

- **Playwright workers are 1, everywhere.** Not a preference. The suite saturates
  its own dev server and the threshold has moved down three times as the suite
  grew; see MIGRATION-PLAN §6j. Do not raise it.
- **Never leave a dev server running when you run Playwright.** It reuses an
  existing one (`reuseExistingServer`), and a server you started yourself does
  not carry `ASTRO_DISABLE_TOOLBAR=1`, so Astro's dev toolbar injects its own
  headings and a "Menu" button and unrelated specs fail on ambiguous locators.
  Run `npx astro dev stop` first. This cost two false failure investigations.
- **Dev server:** `npm run dev` (port 4331 via `.claude/launch.json`), or
  `astro dev --background` / `astro dev status` / `astro dev logs` / `astro dev stop`.
- **There is a dev-only fixture route** at `src/pages/dev-fixtures/[name].astro`
  for rendering things that are otherwise unreachable — `/dev-fixtures/headlines`
  shows headline candidates at real display size. Reuse the pattern for design
  comparisons; `getStaticPaths` returns `[]` outside DEV and a test asserts the
  build emits nothing.
- **The DCG guard blocks destructive commands.** `rm -rf`, `git clean -f`,
  `git checkout -- <path>` are all refused; ask rather than working around them.
  It also trips on `>` inside a `node -e` regex, reading it as a shell redirect —
  write the script to a file instead.
- **`git checkout --` restoring "the last good state" will silently revert
  uncommitted work.** Commit before any mutation experiment.

## Still open, not part of this

- Issue #79 — `MAINTENANCE.md` and `REPRODUCE-KIT.md` still document the Next
  build; both carry staleness banners.
- `registry.json`'s lens `headline` fields are dead data — declared on the
  `LensNav` type, read nowhere. Delete or wire up; a decision, not a fix.
- `engines: node >=22.12.0` is an open range inherited from the Next app; worth
  pinning to `22.x`.
- The first role chip now repeats the `<h1>` verbatim ("AI Evaluation &
  Reliability"). Possibly alignment, possibly redundancy — my call to make, not
  a design defect to fix unasked.
