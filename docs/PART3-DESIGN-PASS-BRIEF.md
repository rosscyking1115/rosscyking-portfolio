# Part 3 — design pass brief

Paste the block below into a fresh session, and attach the contents of
`docs/design-pass/` (regenerate with `npm run shots:site` — 32 files, gitignored).

Written 2026-08-02, after Part 2's spec was implemented end to end and then
corrected twice. This closes **open item 09** of `DESIGN-SPEC-README.md` —
"The screenshots. Not received."

---

You are doing a design pass on `C:\dev\personal\rosscyking-portfolio`, a personal
portfolio at rosscyking.com. You designed this site's current system yourself, in
a previous session, as `docs/DESIGN-SPEC-README.md`. **That spec is now
implemented in full** — every route, every token, to the hex and the pixel. What
you have not seen is the result.

LOAD FIRST: `impeccable`, `frontend-design`, `tailwind-design-system`,
`accessibility`, `web-design-guidelines`. The deterministic router resolves
exactly that set for this brief; do not substitute from memory.

Attached: 32 screenshots of the live site — eight routes at desktop 1440,
tablet 768 and mobile 390, plus desktop dark for all eight. Full-page, captured
after the arrival animations have settled.

## The brief

**Raise the execution. Do not redesign the system.**

The design language is yours and it is coherent. What Ross says, in his words, is
that the site "is not responsive and not polished". The responsive faults that
were measurable have been fixed and are listed below. What is left is the part a
measurement cannot find: whether this reads as a considered piece of work or as a
correct implementation of a spec.

Be specific about what is weak. You can see all eight routes at three widths; the
last brief was written from one screenshot.

## What the design language is, so it survives

Monospace metadata in brackets (`[ Ross King ]`, `[ 01 ]`, `[ + ]`), generous
type with a muted steel-blue accent on one highlighted phrase, restrained chips,
filled-dark primary against outlined secondary, tick-mark rules (`.ruler`), and
one instrument row anatomy reused on every list surface. Technical-documentation
meets editorial. Do not replace it. Raise it.

## Audit before proposing

Report what is actually weak. The list below is what one person noticed; you can
see everything.

Four things already suspected:

1. **The site is long.** Full-page heights, measured today:

   | Route                           | desktop 1440 | mobile 390 |
   | ------------------------------- | -----------: | ---------: |
   | `/`                             |        2,923 |      4,771 |
   | `/projects`                     |        1,759 |      3,292 |
   | `/projects/agent-release-gates` |        5,852 |      7,643 |
   | `/about`                        |        3,131 |      4,773 |
   | `/contact`                      |        1,149 |      2,028 |
   | `/privacy`                      |        2,487 |      3,385 |
   | `/colophon`                     |        3,193 |      4,631 |

   The write-up is the outlier and it is a long-form document, so length there
   may be correct. Home at 4,771px on a phone is the one to look at hardest.

2. **The bench is seven rows of the same shape**, on a page that already opened
   with a rack of three. It is now a disclosure — each row opens a short preview
   — which gives it a reason to exist, but not a rhythm.

3. **The proof band is the only scale break on the site.** 92px, full-bleed,
   once. Everything else lives inside the same 1152px container at the same
   tonal weight, which was audit finding 08 in your own Part 2 report. One band
   fixes one page.

4. **Two surfaces have had no design attention at all**: `/contact` and the
   project write-up body. Both were ported and then made spec-compliant; neither
   was ever designed.

## What changed since you last saw it, so you do not re-decide settled things

- **The spec was implemented to its own values.** The first export's mock was
  followed from scraped text before the README arrived; PR #95 rebuilt to the
  README's hex and px, including three colour tokens that did not exist (`--body`
  #3f434a, `--primary-hover` #324b60, `--caution` #8a5a2b), the radius-by-role
  scale, the chip's solid selected fill, the button at 7/13px, and the header
  progress hairline.

- **Two contradictions in the spec were resolved, and you may want to overrule
  the resolution.** Status tokens say 10px mono, chips say 11px, and the
  accessibility contract says "12px minimum for any mono label carrying meaning".
  Both carry meaning, so both are 12px and the contract wins. One line in
  `global.css` changes it back.

- **§01's motion contract was amended by Ross, not by drift.** Arrivals are
  allowed again, narrowly: the home masthead in three staggered chunks, the proof
  figures counting up once, and the featured rack arriving on scroll. Everything
  else in §01 stands, and four new bans joined it — nothing replays, nothing
  bounces (checked numerically, both easing control points inside [0,1]), nothing
  moves once it has arrived, and height is never an addressing state. The full
  reasoning is in the MOTION CONTRACT block in `src/styles/global.css`.

- **The rack was rebuilt as three open cards and reverted the same day.** §03 R7
  is back — one reading instrument with a frame, siblings as hairline rows. What
  survived is the interaction: the arrival, a pointer response on the reading
  instrument (border to accent, action underlines, reticle cursor), and the bench
  disclosure.

- **shadcn is initialised** (`components.json`, `@/*` alias, Radix installed) but
  no registry component is in use yet. Its `init` overwrote the entire palette
  with a neutral OKLCH ramp and was reverted; see the note at the top of
  `global.css`. The intent is that `/contact` — the site's only React island —
  is rebuilt on shadcn's `Field`/`FieldGroup` primitives. Everything else stays
  zero-hydration Astro.

## Constraints that must survive, each with the reason it exists

- **Static everywhere except `/contact`.** No route but that one may hydrate. A
  proposal that needs a React island on `/` or `/projects` is a proposal to
  change the architecture, and should say so out loud.
- **The page must render without JavaScript.** This was broken until today: every
  lens panel was `display:none` until an inline script wrote `data-lens`, so the
  whole featured section was absent for a no-JS visitor. Anything gated on a
  script must fail open.
- **The motion contract, as amended.** Two gates enforce it — a source scan and a
  rendered-page sweep across every route — plus a third for the arrival itself.
- **WCAG 2.2 AA, graded on the page as loaded**, axe-scanned on all eight routes
  in light and four in dark. One violation is known, asserted by value, and
  shipped: Shiki's comment token at 4.02:1.
- **`content/projects/registry.json` is canonical for every project fact**, and
  `npm run validate:projects` fails the build on drift. Copy is selected, never
  invented — §03 R8: numbers are counted, not typed.
- **259 Playwright tests and 52 Vitest tests.** A design change that needs a gate
  changed should say which gate and why; several of them encode findings that
  cost real time.

## Still open on Ross, and worth pressing him on

From `DESIGN-SPEC-README.md`'s own list:

| #   | Item                                                                 | Blocks |
| --- | -------------------------------------------------------------------- | ------ |
| 01  | Approve the error colour `#8f4f48` / `#c9938c`, or take the fallback | `7c`   |
| 02  | Four retention periods for the privacy table                         | `10a`  |
| 05  | Timeline entries — certifications, training, undergraduate degree    | `6a`   |
| 06  | "Seeking", and typical reply time                                    | `7a`   |

Items 03, 04, 07 and 08 were closed by reading the repository rather than by
asking. Item 09 — the screenshots — is closed by this brief.

Also unresolved, and not on that list: `/writing` is designed and unbuilt,
because there are no posts. Fourteen entries in the About toolbox carry no
evidence link and Ross has not said whether they stay.

## What is attached

`docs/design-pass/<route>-<viewport>-<theme>.png`, 32 files:

- eight routes — `/`, `/projects`, `/projects/agent-release-gates`, `/about`,
  `/contact`, `/privacy`, `/colophon`, `/404`
- desktop 1440 in light **and** dark, tablet 768 light, mobile 390 light
- full-page, 2× device pixel ratio, captured after every arrival has settled and
  every scroll-triggered element has fired

**If only some arrived**, these twelve are the core set and cover every route
type at the widths that matter — ask for the rest by name:

```
home-desktop-light      home-tablet-light       home-mobile-light
home-desktop-dark       projects-desktop-light  projects-mobile-light
projects-agent-release-gates-desktop-light      about-desktop-light
projects-agent-release-gates-mobile-light       about-mobile-light
contact-desktop-light   colophon-desktop-light
```

Regenerate any time with `npm run shots:site` against a running dev server.
