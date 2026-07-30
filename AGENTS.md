<!-- BEGIN:astro-agent-rules -->

# This is NOT the Astro you know

This project runs **Astro 7**. It has breaking changes — APIs, conventions, and file structure may
all differ from your training data. **Check the docs before writing code; do not fill gaps from
memory.** If the docs do not cover something, say so rather than guessing.

The authority is the Astro docs MCP server (`astro-docs`), installed per
[docs.astro.build/en/guides/build-with-ai](https://docs.astro.build/en/guides/build-with-ai/):

```bash
claude mcp add --transport http astro-docs https://mcp.docs.astro.build/mcp
```

## Dev server

Astro 7 auto-detects an agentic environment and backgrounds `astro dev`. Manage it explicitly:

```bash
astro dev --background     # start
astro dev status           # is it up, and on which port
astro dev logs             # tail
astro dev stop             # stop
```

A stale background server is a real source of confusion — Playwright will **reuse** it
(`reuseExistingServer`), and one started outside the test config does not carry
`ASTRO_DISABLE_TOOLBAR=1`, so the dev toolbar injects its own headings and buttons and unrelated
specs fail on ambiguous locators. Run `astro dev status` before diagnosing an odd test failure.

## Guides worth reading before touching related code

- [Routing, dynamic routes, middleware](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Framework components / islands](https://docs.astro.build/en/guides/framework-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling and Tailwind](https://docs.astro.build/en/guides/styling/)
- [Actions](https://docs.astro.build/en/guides/actions/) — `/contact` is the only on-demand route
- [On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)

<!-- END:astro-agent-rules -->

## This repository specifically

- **`content/` is the source of truth for prose and is edited deliberately.** `registry.json` is
  canonical for project facts, and `npm run validate:projects` fails the build when an MDX file
  drifts from it. Edit facts there first, then the prose to match.
- **Everything is static except `/contact`**, which carries `export const prerender = false` because
  Astro Actions called from a form require on-demand rendering.
- **Security headers live in `vercel.json`**, not in Astro's CSP support — that was evaluated and
  disqualified. See `MIGRATION-PLAN-2026-07-26-astro.md` §3.3.
- **The e2e suite runs against `astro dev`**, because `@astrojs/vercel` has no preview command. It
  saturates the dev server as the suite grows; read §6j before raising the Playwright worker count.
- **`MIGRATION-PLAN-2026-07-26-astro.md` is the running record** of what was ported, what was
  deliberately changed, and what is still open. Read it before assuming something is a bug.
