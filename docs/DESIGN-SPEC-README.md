# Handoff: rosscyking.com — behaviour, states and composition

## Overview

A redesign of an existing personal portfolio site (rosscyking.com). The visual identity is **unchanged** — same cool greys, same steel-blue accent, same three typefaces, same three signature devices. What changes is **interaction, motion, composition and information structure**.

The site's argument is that its owner tests AI honestly. The redesign makes the site behave that way: corrections are shown rather than hidden, numbers are counted rather than typed, and nothing moves unless something is being read, opened, or has changed meaning.

**One sentence:** the site behaves like a bench of instruments — one thing is being read at a time, receding is chrome and never legibility, and motion happens only when something is addressed, opened, or changes meaning.

## About the design files

`Behaviour Redesign.dc.html` in this bundle is a **design reference created in HTML** — a prototype showing intended look and behaviour, not production code to copy. It is a single scrollable canvas of thirteen numbered turns, each holding one or more labelled options (`3a`, `9c`, `12b`…). Open it in a browser and scroll; anchor links like `#13a` jump to a specific mock.

Your task is to **recreate these designs in the target codebase's existing environment**, using its established patterns, components and libraries. The site is currently a static-site build; implement in whatever framework it already uses. If there is no environment yet, choose the most appropriate one and implement there.

Where a mock and this README disagree, **this README is right** — the mocks are illustrations of the spec, drawn at different moments.

## Fidelity

**High-fidelity.** Colours, type, spacing and states are final and specified to the hex/px. Recreate pixel-accurately using the codebase's existing primitives. Content copy in the mocks is the owner's real published words, reordered and resized — except where a slot is explicitly marked as an open item (see the end of this file).

---

## Design tokens

### Colour — light

| Role                         | Hex       | Notes                                        |
| ---------------------------- | --------- | -------------------------------------------- |
| Page background              | `#fafafb` |                                              |
| Foreground text              | `#1c1e22` |                                              |
| Body / secondary text        | `#3f434a` |                                              |
| Muted text                   | `#5c6068` | 5.4:1 on `#fafafb` — the receded-title token |
| Hairline / receded border    | `#e2e3e7` |                                              |
| Ruler / reading border       | `#cdd0d6` |                                              |
| Chrome bar / table header    | `#f0f1f3` |                                              |
| Accent (steel blue)          | `#3d5a73` |                                              |
| Accent hover                 | `#324b60` |                                              |
| Positive / LIVE              | `#3f9a5f` |                                              |
| Caution / CLS-risk marker    | `#8a5a2b` |                                              |
| Error (**pending approval**) | `#8f4f48` | see open item 01                             |

### Colour — dark

| Role                               | Hex                           | Notes                        |
| ---------------------------------- | ----------------------------- | ---------------------------- |
| Page background                    | `#151619`                     |                              |
| Foreground text                    | `#e7e8ea`                     |                              |
| Muted text                         | `#9ca0a8`                     |                              |
| Receded border                     | `#2e3035`                     |                              |
| Reading border                     | `#3a3d43`                     | new — derived                |
| Reading surface                    | `#212327`                     | new carrier of elevation     |
| Frame chrome / expanded row header | `#1a1c20`                     | new — steps **down**, not up |
| Accent (filled button)             | `#8fa9c2` with `#151619` text |                              |
| LIVE dot                           | `#66b587`                     |                              |
| Error (**pending approval**)       | `#c9938c`                     | see open item 01             |

**The dark rule.** Elevation is expressed as **light** in light mode and as **surface** in dark mode. A reading instrument in light keeps the page background and gains a shadow; in dark it takes no shadow and gains `#212327`. Nothing else about the state changes. Once an instrument lifts to `#212327`, its own chrome bar must step **down** to `#1a1c20`, or the instrument loses its internal hierarchy.

Layout, measure, type scale, spacing, motion durations, focus treatment and the addressing rule are **identical in both themes**. Dark is a token swap plus one substitution — shadow for surface. If a dark screen needs a different arrangement, the light one was wrong.

### Typography

Three families, all already loaded:

- **Space Grotesk** — 600, 700. Display and headings. _Weight 600 is used throughout and is easy to miss when subsetting._
- **Geist** — 400, 500, 600. Body and UI.
- **Geist Mono** — 400, 500. Labels, marks, metrics, run logs.

Scale in use (px): 92 (home proof band), 22 (build-step numerals), 20 (about bio), 16 / 15 / 14.5 (body), 13.5 / 13 / 12.5 (secondary body), 12 / 11.5 / 11 / 10.5 (mono labels).

Mono labels carrying meaning: **12px minimum**. Below that it is decoration and should not exist. Run logs are the sole exception — a terminal that reflows is not a terminal.

Mono label convention: `letter-spacing: .1em–.14em`, uppercase, `#5c6068`.

### Radius, border, shadow

- Radius: `5px` (controls, chips-as-rects), `6px` (tables, panels), `7–8px` (cards), `99px` (pills).
- Border: `1px solid` everywhere; **dashed** only for the `ARCHIVED` status token and for unfilled data slots.
- Shadow (light, reading state only): `0 6px 20px -8px rgb(0 0 0 / .12)`. No shadow in dark, ever.

---

## Motion

Three durations. No others.

| Token      | Duration | Used for, and only for                                                          |
| ---------- | -------- | ------------------------------------------------------------------------------- |
| `state`    | 120ms    | Pointer on a control — button, chip, link, row                                  |
| `address`  | 160ms    | An instrument becomes, or stops being, the one read. **Colour and border only** |
| `disclose` | 220ms    | The reader opened something — limits, correction detail, mobile nav             |

**Easing:** `cubic-bezier(.2, 0, 0, 1)` for all three. One curve. Nothing bounces or overshoots.

**Nothing translates.** No element slides, rises or drifts, in any state, ever.

**No opacity on text.** At any state, in either theme.

**Motion is used in exactly three cases:** something is being addressed; something was opened; a value changed meaning.

**Never:** on arrival; on scroll as reveal; between pages; continuously.

The one continuous element is the 1px progress hairline under the header. It is a position readout, not an animation — it has no transition and it stays on under reduced motion.

---

## The addressing rule

One rule, three inputs, in priority order: **pointer > focus > proximity to the reading line.**

Keyboard focus forces the reading state, so a keyboard user addresses instruments exactly as a pointer does.

The reading line sits at **34% of viewport height on mobile, centre on desktop**. Scrolling moves content past it; whatever is nearest the line is the instrument being read.

A receded row is **two levels, not one**: muted title, foreground metric. This holds on every route, including the ten-row projects index, where a plain metric is foreground exactly like a corrected one. Corrections are distinguished by the struck pair and the accent pill — never by being the only legible number.

### State table

| State            | Light                              | Dark                                             |
| ---------------- | ---------------------------------- | ------------------------------------------------ |
| Receded · title  | `#5c6068` on bg · border `#e2e3e7` | `#9ca0a8` on bg · border `#2e3035`               |
| Receded · metric | `#1c1e22` — always foreground      | `#e7e8ea` — always foreground                    |
| Reading          | bg · border `#cdd0d6` · shadow     | surface `#212327` · border `#3a3d43` · no shadow |
| Chrome bar       | `#f0f1f3`                          | `#1a1c20` — steps down                           |

### ⚠ Hard requirement

Receded and reading differ in **colour, border and surface only — never in height.** Both states reserve identical layout. Implement receding as a height change and the page shifts on scroll; CLS then eats the Lighthouse score this system exists to protect.

---

## Structural rules

These are what make it a system rather than a set of pages. Each exists because something in the audit was failing without it.

**R1 — One canonical mark per project, set once.** A lens or a sort changes order, never the number. Where position within a subset matters, it is a second token: `[ 05 ] · 2 of 4 in this lens`. Posts use dated marks — `[ 2026-06 ]` — so the two namespaces cannot collide. _(The current site gives the same project different numbers on different pages. This is the credibility bug.)_

**R2 — No summary paragraph on two index surfaces.** Home shows work running; the home table is the ledger; the projects index compares; the write-up holds the prose. Index → detail may share one short standfirst; two indexes may not.

**R3 — One narrowing control, used four times.** Home lens, index stack filter, index sort, post reading track are the same component: chips, client-side, URL-synced, back-button honest. No full navigation for a filter. _(Currently the lens switcher is three hidden copies of the content rather than one stateful component — replace it.)_

**R4 — One row anatomy.** Mono label, value, one action at the end — toolbox, record, contact, index rows, cross-references. A fifth list pattern is a bug.

**R5 — Three metric modes, chosen by what is true.** `CORRECTED` (withdrawn → reported), `CONTROLLED` (result vs control), `LIMITS` (result + documented limits). Never fabricate a correction to fill the slot.

**R6 — Three content states, three tokens.** `LIVE` (dot), `RUN LOG` (solid border), `ARCHIVED` (dashed border). Every project resolves to exactly one.

**R7 — Only the reading instrument loads an image.** First eager, the rest lazy as they approach the line. Receded rows carry a number, never a thumbnail.

**R8 — Numbers are counted, not typed.** Toolbox counts, index totals and lens counts derive from the same stack and metric fields the content registry already gates. A hand-written total is a number that can drift.

---

## Components

### Instrument (the core primitive — used by four routes)

A row/frame with two states (receded, reading) and no height difference between them. Contains: canonical mark (mono), title (Space Grotesk 600), status token, headline metric, and — when reading — a framed screenshot.

- Receded: title `#5c6068`, metric `#1c1e22`, border `#e2e3e7`, no frame, no image.
- Reading: title `#1c1e22`, border `#cdd0d6`, shadow, image eager/lazy per R7.
- Transition: `address` 160ms, colour and border only.

### Metric modes

| Mode         | Renders as                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `CORRECTED`  | `withdrawn value` struck (`#5c6068` light / `#9ca0a8` dark) → reported value, plus an accent pill |
| `CONTROLLED` | result vs control, side by side                                                                   |
| `LIMITS`     | result + documented limits inline                                                                 |

### Status tokens (pills, `99px` radius, `10px` mono)

- `LIVE` — 1px `#e2e3e7` border, 5px dot `#3f9a5f` (`#66b587` dark)
- `RUN LOG` — 1px solid `#e2e3e7` border, text `#5c6068`
- `ARCHIVED` — 1px **dashed** `#cdd0d6` border, text `#5c6068`

### Button

Radius 5px, padding `7px 13px`, Geist 500 12px.

- rest `#3d5a73` bg / `#fafafb` text
- hover `#324b60`
- focus — 2px `#3d5a73` outline, 2px offset
- active — `opacity: .72` on the whole button (permitted; it is not text-only opacity)
- dark filled — `#8fa9c2` bg / `#151619` text

### Chip (the one narrowing control, R3)

Radius 99px, padding `6px 12px`, Geist Mono 400 11px.

- rest — 1px `#cdd0d6` border, transparent bg
- hover — bg `#f0f1f3`
- selected — bg `#3d5a73`, text `#fafafb`, no border

Behaviour: client-side, URL-synced (query param), back button restores prior selection. Never triggers a page navigation.

---

## Routes

Nav: **Home · Projects · Writing · About · Contact**. Colophon, Privacy and the CV PDF are footer-only. There is **no `/cv` page** (it repeats About). There is **no latest-writing strip** on the home page.

Writing sits after Projects because the artefacts are the claim; the writing comments on them.

| Route              | Composition                                                     | The change that matters                                                                                    | Mock               |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ |
| `/`                | Masthead → full-bleed numeric band → lens → rack → ledger table | Proof numbers leave the hero and go edge-to-edge at 92px; the measure change is what fixes the flat scroll | `3a` / `3b`        |
| `/projects`        | Header readout → filter + sort → 10-row log, one expanded       | Cards become a table; evidence note is a sortable column                                                   | `4a` / `4b`        |
| `/projects/[slug]` | Finding band → evidence → reading track → rail + prose          | Limits move up beside the number; self-audit becomes a table                                               | `5a` / `5b`        |
| `/writing`         | 748px column, dated marks in a gutter, rulers between entries   | Sparse where the projects log is dense; no figures at all                                                  | `9a` / `9b`        |
| `/writing/[slug]`  | Claim / problem / correction / cost → track → rail + prose      | The essay's metrics band is four lines of prose, not figures                                               | `9c` / `9d`        |
| `/about`           | Bio at 20px → record rack → provenance toolbox                  | Every tool carries a count that links to the filtered index                                                | `6a` / `6b`        |
| `/contact`         | Availability band → direct ledger → form                        | Success returns a receipt with a reference, in place                                                       | `7a` / `7b` / `7c` |
| `/privacy`         | Flows grouped by trigger → not collected → rights               | Grouping by trigger shows three of four never apply                                                        | `10a` / `10b`      |
| `/colophon`        | Numbers band → failing run log → stack table → limits           | A project write-up pointed at the site; ships last                                                         | `11a` / `11b`      |

Mock ids are anchors in `Behaviour Redesign.dc.html` — open the file and append `#3a` to the URL.

---

## Interactions & behaviour

**Addressing on scroll** — CSS scroll-driven animation against the reading line. No JavaScript, no observer.

**Disclosure** — native `details` / `summary`, `disclose` 220ms. Used for limits, correction detail, mobile nav.

**Filter / sort / reading track** — the only JavaScript on the site, and only as URL-state handlers. Query-param synced, back-button honest, no navigation.

**Form validation** — on **blur**, never on keystroke. Errors never signalled by hue alone: every message leads with the literal token `INVALID`.

**Form success** — returns a **receipt in place** (reference number, timestamp, what happens next). No redirect, no toast.

**Hover** — `state` 120ms, colour only.

---

## State management

Minimal. Everything else is CSS or static.

| State                      | Scope                                 | Persisted as                       |
| -------------------------- | ------------------------------------- | ---------------------------------- |
| Home lens selection        | `/`                                   | URL query param                    |
| Index stack filter         | `/projects`                           | URL query param                    |
| Index sort key + direction | `/projects`                           | URL query param                    |
| Post reading track         | `/writing/[slug]`, `/projects/[slug]` | URL query param                    |
| Theme                      | site-wide                             | existing mechanism, unchanged      |
| Form field validity        | `/contact`                            | component-local, evaluated on blur |
| Form submission → receipt  | `/contact`                            | component-local                    |

Data fetching: none at runtime. Counts (toolbox, index totals, lens counts) are **derived at build time** from the same stack and metric fields the content registry already gates (R8).

---

## Accessibility contract

- **FOCUS** — 2px accent outline, 2px offset, matching radius, site-wide, never removed. Focus forces the reading state.
- **CONTRAST** — graded on the page _as loaded_. A state that only becomes legible under reduced motion still fails.
- **REDUCED MOTION** — all durations 0. No reading line, no state change on scroll: every instrument renders framed and complete, in document order. Disclosures render open. Nothing is available only through a transition — readers lose emphasis, never content.
- **ERRORS** — never hue alone; every message leads with `INVALID`. Validation on blur.
- **TYPE** — 12px minimum for any mono label carrying meaning. Run logs excepted.
- **TOUCH** — 44px minimum; the whole row is the target, never just the arrow.

---

## Performance budget

- **+0 KB** — no animation library. Addressing is CSS scroll-driven animation; disclosure is `details`/`summary`; states are CSS. Filter, sort and track are the only JavaScript and they are URL-state handlers.
- **LCP** — should improve. The hero's largest element becomes text rather than a card grid, and one instrument image is eager instead of a grid of them.
- **CLS** — the one live risk. See the hard requirement above: reserve identical height in both instrument states.
- **FALLBACK** — no scroll-driven-animation support = the reduced-motion state. That is a complete design, not a degraded one, so there is no third path to maintain.
- **FONTS** — three families, already loaded. Space Grotesk needs weights 600 **and** 700.

---

## Build order

Build in this order; each step depends on the one before.

1. **Tokens, motion, states.** Nothing visible ships. Everything below depends on it.
2. **Canonical marks (R1).** Smallest change, biggest credibility. Fix the numbering before anything is rebuilt on top of it.
3. **The instrument.** Row, frame, three metric modes, three status tokens. Used by four routes.
4. **Home, projects index, write-up** — in that order; each reuses the last. The narrowing control (R3) lands here.
5. **Writing, contact, privacy, colophon.** Colophon genuinely last: it reports numbers about the finished site.

---

## Assets

No new assets. Existing project screenshots are reused, subject to R7 (only the reading instrument loads an image). Fonts are the three already served. No icon set is introduced — status is carried by tokens and borders, not glyphs.

**Note for the site owner:** two rounds of screenshots were requested and never arrived. Everything in this spec was audited from the live markup rather than from images, so optical spacing and the real dark frames have not been checked against a render.

---

## Open items — the site owner must close these

Nine items. **None are design decisions**, and none block an engineer starting at step 01. Where a fact was missing, the slot is marked in the mock rather than filled with something plausible.

| #   | Item                                                                                                                           | Blocks |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 01  | **The error colour.** Approve `#8f4f48` / `#c9938c`, or take the fallback and keep six tokens                                  | `7c`   |
| 02  | **Four retention periods** for the privacy table. The dashed cells are the only thing that page cannot state for itself        | `10a`  |
| 03  | **Verify the "not collected" list** against the code. A "none" that turns out to be a "some" is the worst sentence on the site | `10a`  |
| 04  | **Real honest limits for the colophon.** The ones in the mock are inferred and marked. Without true ones that page is a brag   | `11a`  |
| 05  | **Timeline entries** — certifications, training, undergraduate degree                                                          | `6a`   |
| 06  | **Seeking, and typical reply time.** Two cells on the contact band. State the second only if true                              | `7a`   |
| 07  | **The test runner** behind the 175 end-to-end tests, plus one line of why                                                      | `11a`  |
| 08  | **One word of copy.** The projects standfirst says "every card links to a full write-up". They are rows now                    | `4a`   |
| 09  | **The screenshots.** Not received                                                                                              | all    |

### What was changed without asking

Card summaries are cut to their first sentence on index surfaces — a selection, not a rewrite. Everything else is the owner's published words, in a different order or at a different size. Item 08 is the only word altered anywhere in the redesign.

---

# Second pass — execution audit and the R9 hierarchy

Everything above is the original behaviour spec. What follows was produced afterwards, from an audit of **32 captures** of the implemented site (eight routes × three viewports × light and dark). It does not replace the spec; it corrects execution and adds one system-level rule.

Reference file: `Execution Audit.dc.html` — thirteen findings, each with the evidence and the fix.

## The two shipped defects — fix these first

Both are bugs, not preferences. Neither is drawn in the mocks yet.

1. **Prev/next rows at the foot of the write-up.** Text overprints itself and the row stacks to twelve lines. The row is a two-column grid whose columns are not constrained; give each side `min-width:0` and a `max-width` of half the measure, truncate the title to one line, and keep the direction label on its own line above it.
2. **The 404 is 32% void.** The page reserves a full viewport for two lines of copy. Under R9 the 404 takes **no band and one MAJOR** — "Where to go instead" — and the apology line is body copy, not a heading. Content sits at 680, top-aligned under the header with 96px of air, not vertically centred in the viewport.

## Findings that are composition, not bugs

- **The write-up does not use its width at 1440.** The desktop layout is the mobile layout with margins. Fix: a two-column grid, `680px` prose + `352px` sticky rail, `gap:120px`, both columns fixed at those widths inside the `1152` measure. The rail holds, in order: the track (section list with current marked), the metrics, the honest limits, and the cross-references. The rail is `position:sticky; top:96px` and never scrolls independently.
- **Three quarters of the phone home page is one shape.** The three proof figures stack vertically and spend roughly 430px on eleven characters. Fix: one row, three columns, figures at **40px** with 10px mono captions. They are short and read fine small. The band keeps its full-bleed rules.
- **Tonal flatness.** Every section on every route opens identically — bracketed mark, tick rule, mono label, heading around 28px. Fix: R9, below.

## R9 — one band and one major section per route

Four rungs. A route may use BAND **at most once** and MAJOR **at most once**. Everything else is MINOR or QUIET. This is the one change that raises the whole site rather than one page.

| Rung      | Specification                                                                                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BAND**  | Full-bleed, `#f0f1f3`, 1px `#cdd0d6` rules top and bottom, 40px vertical padding, figures at **92px** Space Grotesk 600 / `-.03em` desktop and **40px** mobile, 13px mono captions at `.06em`. Once per route, or not at all. |
| **MAJOR** | 900 or 1152 wide, 32px Space Grotesk 600 heading at `-.02em`, 48px of air above, tick rule (`repeating-linear-gradient(to right,#d6d8dd 0 1px,transparent 1px 14px)`, 8px tall) above the bracketed mark. Once per route.     |
| **MINOR** | 680 wide, 22px heading at `-.01em`, 32px above, **no** tick rule, no bracketed mark. Unlimited.                                                                                                                               |
| **QUIET** | 680 wide, **no heading at all** — a 12px mono label at `.12em` in `#5c6068`, then the content at 14px in `#5c6068`. Unlimited.                                                                                                |

**28px headings are abolished.** Anything that was 28px is now either 32px (the one MAJOR) or 22px (MINOR).

### Allocation — one row per route

| Route         | BAND ×1                     | MAJOR ×1                      | Demoted to reach it                                           |
| ------------- | --------------------------- | ----------------------------- | ------------------------------------------------------------- |
| `/`           | The three proof figures     | Selected work — the index     | Currently → QUIET. Toolbox → MINOR.                           |
| `/projects`   | none                        | The index table itself        | Filter row loses its heading entirely.                        |
| `/projects/…` | The finding, above the demo | Method                        | Result, Limits, Stack → MINOR. Provenance → QUIET.            |
| `/about`      | none                        | The bench — what I do         | Two of the three current MAJORs step down; languages → QUIET. |
| `/contact`    | The availability line       | The form                      | Direct routes sit in the rail, no heading rung at all.        |
| `/colophon`   | The build numbers           | How it is built               | Two of three MAJORs step down; rights → QUIET.                |
| `/privacy`    | none                        | What is collected — the table | Five of six MAJORs → MINOR. Contact-the-ICO → QUIET.          |
| `/404`        | none                        | Where to go instead           | The apology line is body copy, not a heading.                 |

Three routes take no band deliberately. A band on every route is the flatness the audit found, restated one rung louder. If `/writing` ships it takes MAJOR on the post list and no band.

**Check before merge.** On each route count: exactly one `#f0f1f3` full-bleed block or zero; exactly one 32px heading; no 28px headings anywhere. Any route failing that count has not been converted.

## Screens drawn in the second pass

Reference file: `Design Pass.dc.html`. Anchor ids jump to each option: `#18a` `#18b` `#18c` (home), `#17a` (R9 reference sheet), `#16a` `#16b` (contact), `#15a` `#15b` (write-up).

> **Palette caveat.** The site owner believes these later mocks drifted from the live site's real colours. Treat the token tables at the top of this README as authoritative and the second-pass mocks as authoritative for **layout, hierarchy and behaviour only**.

### Write-up body — `15a`, `15b`

`680 + 352` grid at 1440 inside a 1152 measure, `gap:120px`, sticky rail at `top:96px`. The finding takes the route's BAND once, above the demo: the corrected pair at 68px with the withdrawn value struck through in `#5c6068`, plus one sentence of what changed. "Key finding" is a mono label, not a heading.

### Contact — `16a`, `16b`

Same grid. The form is the primary column and takes MAJOR; direct routes sit in the rail with no heading rung. The availability line is the BAND: one ruled line, a 6px `#3f9a5f` dot, "Available for full-time roles from October 2026", and the visa fact right-aligned as a 12px mono label. The three-cell availability block is gone.

`16b` is the **receipt state**: after submit the form is replaced in place by what was actually sent, what happens next, and by when — no toast, no redirect, no layout shift. Error styling in `16b` uses the pending error tokens (open item 01).

### Home — `18a`, `18b`, `18c` — **a decision is required**

Three structural options, all conforming to R9 (`BAND` = the three proof figures, `MAJOR` = selected work, Currently → QUIET, Toolbox → MINOR). **The site owner has not yet chosen one.** Do not build home until they do.

- **`18a` index first** — compact hero, then the index at MAJOR, then the proof band below it as evidence. Bet: a hiring reader wants the list. Cost: figures below the fold at 1440.
- **`18b` proof first** — hero, band, then the index. Closest to the current order. Cost: hero and band are two loud things in a row.
- **`18c` the hero is the band** — no separate hero; the claim and the three figures are one full-bleed block, availability in the eyebrow. Cost: least conventional; only works if the figures are the strongest thing on the site.

Each has a 390 companion showing the mobile fix — three figures in one row at 40px.

### Home interactions (identical across all three options)

| Interaction                                     | Behaviour                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lens filter** (R3, the one narrowing control) | Three chips — All work / Evaluation / Data engineering. Filters the index live and updates a mono counter reading `/?lens=<k> · N of 4 shown`. URL state, back-button safe. Active chip is filled `#3d5a73` with `#fafafb` text; idle is a 1px `#cdd0d6` outline that goes `#3d5a73` on hover. |
| **Row disclosure**                              | Each index row is a full-width `button`. Click expands one line of what the project showed, at 15px `#3f434a`, indented to the title column. No translate; the row below simply moves down.                                                                                                    |
| **Figure provenance**                           | Hovering or focusing a band figure writes its source into a fixed 20px slot beneath the band. The slot is always present and always occupied — default text "Hover or focus a figure for the source it is counted from." — so nothing shifts.                                                  |
| **Row hover / focus**                           | Background to `#f0f1f3` and a 2px `#3d5a73` left border appear; `140ms cubic-bezier(.2,0,0,1)`. Focus is the standard 2px accent outline at `-2px` offset. Nothing translates.                                                                                                                 |

### Index data as drawn

| #   | Project                              | Stack                  | Figure                | Unit           | State   | Lens |
| --- | ------------------------------------ | ---------------------- | --------------------- | -------------- | ------- | ---- |
| 01  | London Cycle-Hire Analytics Platform | PySpark · dbt · DuckDB | 41.4M                 | journeys       | shipped | data |
| 03  | Community Energy Flex                | FastAPI · Pydantic     | Jul 2026              | stopped        | stopped | data |
| 05  | Agent Release Safety Gates           | uv · Inspect AI        | 79.92% (99.31 struck) | hit@3          | shipped | eval |
| 06  | redteam-foundry                      | Claude · pytest        | 0–4%                  | jailbreak rate | shipped | eval |

The three home band figures as drawn: **41.4M** rows processed · **61** facts checked at build · **4** projects with stated limits. All three are R8 numbers — counted at build, not typed.

---

## Open items added by the second pass

| #   | Item                                                                                                                 | Blocks             |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 10  | **Choose the home direction** — `18a`, `18b` or `18c`                                                                | all of `/`         |
| 11  | **`/writing` — ship it with two posts, or cut it from the spec.** It is designed and unbuilt; the footer links to it | `/writing`, footer |
| 12  | **Confirm the live palette** against the token tables above before building the second-pass screens                  | second-pass mocks  |

Open items 01 and 02 from the first pass are still open and now also block `16b` and the privacy conversion respectively.

---

## Files in this bundle

- `README.md` — this document. Self-sufficient; implement from it. Where a mock and this README disagree, this README is right.
- `Behaviour Redesign.dc.html` — first-pass design reference. Thirteen turns of mocks, newest first. Anchor ids (`#3a`, `#9c`, `#12b`, `#13a`) jump to individual screens.
- `Execution Audit.dc.html` — the audit of the implemented site. Thirteen findings with evidence; section 05 sets out R9.
- `Design Pass.dc.html` — second-pass mocks: home (`#18a` `#18b` `#18c`), the R9 reference sheet (`#17a`), contact (`#16a` `#16b`), write-up (`#15a` `#15b`). Interactive — the lens filter, row disclosure and figure provenance all work in the browser.
- `support.js` — runtime required by the HTML files. Not part of the design; do not port it.

## Suggested build order, revised

1. The two shipped defects — prev/next rows, then the 404.
2. R9 as a token/layout decision: define the four rungs, delete 28px.
3. Convert routes to R9 in the allocation-table order, cheapest first: `/404`, `/privacy`, `/colophon`, `/about`, `/projects`.
4. Write-up: the `680 + 352` grid and the sticky rail.
5. Contact: the same grid, the form, the receipt state.
6. Home — **only after open item 10 is closed**.
