// @vitest-environment node
//
// Not jsdom, unlike the rest of tests/unit. Astro's Container API renders
// through the real Vite/esbuild pipeline, and esbuild asserts that
// `new TextEncoder().encode("") instanceof Uint8Array`. Under jsdom that
// TextEncoder comes from a different realm, the check fails, and esbuild
// aborts with "your JavaScript environment is broken". Nothing here needs a
// DOM — the component output is compared as a string.
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import Badge from "../../src/components/ui/Badge.astro";
import Button from "../../src/components/ui/Button.astro";

/**
 * Replaces tests/component/{badge,button}.test.tsx from the Next app.
 *
 * Those rendered React components with @testing-library. Badge and Button are
 * now `.astro`, which testing-library cannot render at all — so the tests are
 * carried across on Astro's Container API instead, which renders the real
 * component through the real pipeline and hands back HTML.
 *   https://docs.astro.build/en/reference/container-reference/
 *
 * WHAT DID NOT SURVIVE, AND WHY. The Next Button tests covered `onClick`,
 * disabled-click suppression, and `asChild`. None of those exist here: an
 * .astro Button ships no JavaScript, and `asChild` was a Radix Slot feature
 * that the port replaced with "renders <a> when given href, <button>
 * otherwise". That last behaviour IS tested below, so the element-swap
 * coverage is kept even though the API that produced it is gone.
 *
 * Interaction coverage for real buttons lives in the e2e suite, which drives an
 * actual browser — the theme toggle, the lens switcher and the contact submit
 * are all exercised there.
 */

const render = async (component: unknown, options: Record<string, unknown> = {}) => {
  const container = await AstroContainer.create();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return container.renderToString(component as any, options as any);
};

describe("<Badge />", () => {
  it("renders children", async () => {
    const html = await render(Badge, { slots: { default: "PySpark" } });
    expect(html).toContain("PySpark");
  });

  it("applies the default variant class by default", async () => {
    const html = await render(Badge, { slots: { default: "Default" } });
    expect(html).toMatch(/bg-secondary/);
  });

  it("applies the outline variant class", async () => {
    const html = await render(Badge, {
      props: { variant: "outline" },
      slots: { default: "Outline" },
    });
    expect(html).toMatch(/border-border/);
  });
});

describe("<Button />", () => {
  it("renders children", async () => {
    const html = await render(Button, { slots: { default: "Click me" } });
    expect(html).toContain("Click me");
  });

  it("renders a <button> with no href", async () => {
    const html = await render(Button, { slots: { default: "Submit" } });
    expect(html).toMatch(/<button/);
    expect(html).not.toMatch(/<a\s/);
  });

  it("renders an <a> when given an href", async () => {
    const html = await render(Button, {
      props: { href: "/somewhere" },
      slots: { default: "Link button" },
    });
    expect(html).toMatch(/<a\s/);
    expect(html).toContain('href="/somewhere"');
  });

  it("applies the outline variant class", async () => {
    const html = await render(Button, {
      props: { variant: "outline" },
      slots: { default: "Outline" },
    });
    expect(html).toMatch(/border/);
  });

  it("passes through the disabled attribute", async () => {
    const html = await render(Button, {
      props: { disabled: true },
      slots: { default: "Disabled" },
    });
    expect(html).toMatch(/disabled/);
  });
});
