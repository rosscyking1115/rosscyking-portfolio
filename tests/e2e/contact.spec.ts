import { expect, type Page, test } from "@playwright/test";

/**
 * Wait for the ContactForm island to hydrate before interacting with it.
 *
 * Astro ships the form as server-rendered HTML and attaches React afterwards.
 * Playwright is fast enough to click "Send message" inside ~400ms, before
 * `client:load` has run — at which point the button is still a plain submit
 * inside a <form> with no action, so the browser does a native submit and
 * reloads the page. That produced two misleading results: no validation
 * alerts, and an "empty" form that looked like a successful send.
 *
 * Astro marks a not-yet-hydrated island with an `ssr` attribute on its
 * <astro-island> host and removes it once hydration completes.
 */
async function waitForFormHydration(page: Page) {
  await page.waitForFunction(() => {
    const island = document.querySelector("astro-island");
    return Boolean(island) && !island!.hasAttribute("ssr");
  });
}

/**
 * Regression harness for the Astro contact pipeline (migration risk #1).
 *
 * The UI tests mirror tests/e2e/contact.spec.ts in the Next app, using the same
 * selectors (#name, #email, #message, "Send message", role=alert) so the two
 * suites stay comparable during the migration.
 *
 * The action tests below exist because three real bugs were found porting this
 * route, and none of them were visible from the UI. Each has a named test so it
 * cannot regress silently.
 */

const ACTION = "/_actions/contact/";

/**
 * Astro's `security.checkOrigin` (default true since astro@4.9.0) rejects
 * POST/PATCH/PUT/DELETE requests with a form content type whose `origin`
 * header does not match the request URL, answering 403 without rendering.
 * Browsers set that header automatically; Playwright's request context does
 * not, so the tests send it explicitly rather than weakening the setting.
 * https://docs.astro.build/en/reference/configuration-reference/
 */
const browserHeaders = { origin: "http://localhost:4331" };

const validSubmission = {
  name: "Playwright Test",
  email: "test@example.com",
  message: "Hello, this is an automated end-to-end test of the contact form.",
  honeypot: "",
};

test.describe("contact page — UI", () => {
  test("renders the form and shows validation errors when submitted empty", async ({
    page,
  }) => {
    await page.goto("/contact");

    await expect(
      page.getByRole("heading", { level: 1, name: /Let.s talk/i }),
    ).toBeVisible();

    await waitForFormHydration(page);
    await page.getByRole("button", { name: /Send message/ }).click();

    const alerts = await page.getByRole("alert").allTextContents();
    expect(alerts.length).toBeGreaterThan(0);
  });

  test("a valid submission returns a receipt in place, not a toast", async ({ page }) => {
    // REWRITTEN for §04's 7a: "success returns a receipt … in place". The old
    // assertions — the fields clear, and a toast says thank you — described the
    // mechanism that was there, and both are now false by design: the form is
    // replaced, so #name does not exist to be empty, and the message stays on
    // screen instead of expiring after four seconds.
    //
    // The finding underneath the toast assertion is NOT lost. It was written
    // because <Toaster> in the layout and toast() in the island loaded sonner
    // twice and every toast vanished silently. The equivalent failure here is a
    // success that leaves the visitor looking at a form they already sent, so
    // that is what is asserted: after a valid send, the form is gone and the
    // receipt is there.
    await page.goto("/contact");
    await waitForFormHydration(page);

    await page.locator("#name").fill("Playwright Test");
    await page.locator("#email").fill("test@example.com");
    await page
      .locator("#message")
      .fill("Hello, this is an automated end-to-end test of the contact form.");

    await page.getByRole("button", { name: /Send message/ }).click();

    const receipt = page.locator("[data-receipt]");
    await expect(receipt).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("form")).toHaveCount(0);

    // It does not navigate — the whole point of "in place" is that the reader
    // keeps what they were sent without a round trip.
    expect(new URL(page.url()).pathname).toBe("/contact");

    // A receipt with no time on it is a thank-you note, and one with no
    // reference is not what the spec asks for — "a receipt with a reference,
    // in place". The reference is derived from the send time rather than
    // returned by the action, which the page says out loud.
    await expect(receipt.locator("[data-receipt-time]")).not.toBeEmpty();
    await expect(receipt.locator("[data-receipt-reference]")).toHaveText(
      /^RK-\d{6}-\d{4}$/,
    );

    // WHAT WAS ACTUALLY SENT, which screen 16b names first and the first
    // version of this receipt did not have. It confirmed the transaction — a
    // time and a reference — and not the content, which is a receipt for an
    // unknown amount. `reset()` runs immediately after a successful send, so
    // this is the only place the sender can still check what left.
    const sent = receipt.locator("[data-receipt-sent]");
    await expect(sent).toContainText("Playwright Test");
    await expect(sent).toContainText("test@example.com");
    await expect(sent).toContainText("automated end-to-end test");

    // "By when" is a MARKED SLOT, not a guess — open item 06. It moved here
    // from the availability block that screen 16a deletes, because it is what
    // the person who has just written is asking. Asserted as marked so it
    // cannot be quietly filled with something plausible.
    await expect(receipt.locator("[data-open-slot]")).toHaveText(/not stated yet/);

    // AND IT DOES NOT CLAIM WHAT THE ACTION DOES NOT DO. src/actions/index.ts
    // sends one email, to Ross, with replyTo set to the sender — no copy goes
    // to the visitor. The spec's mock says "a copy has gone to your address";
    // writing that would make this the first false sentence on the site.
    await expect(receipt).not.toContainText(/copy has gone/i);

    // "Send another" restores the form rather than reloading the page.
    await page.getByRole("button", { name: /send another/i }).click();
    await expect(page.locator("#name")).toHaveValue("");
  });
});

test.describe("contact action — server contract", () => {
  test("accepts a submission with no company field", async ({ request }) => {
    // Astro's `accept: 'form'` parser hands absent fields to the schema as
    // `null`, not `""` as Next's Object.fromEntries did. Before the schema
    // normalised that, EVERY real submission failed on company + honeypot.
    const res = await request.post(ACTION, {
      multipart: validSubmission,
      headers: browserHeaders,
    });
    expect(res.status()).toBe(200);
  });

  test("accepts a submission with a company field", async ({ request }) => {
    const res = await request.post(ACTION, {
      multipart: { ...validSubmission, company: "Acme AI" },
      headers: browserHeaders,
    });
    expect(res.status()).toBe(200);
  });

  test("a filled honeypot returns success rather than revealing the trap", async ({
    request,
  }) => {
    // Must stay 200. If the honeypot is enforced in the zod input schema
    // instead of the handler, Astro answers 400 with the offending field name,
    // which tells a bot exactly what gave it away.
    const res = await request.post(ACTION, {
      multipart: { ...validSubmission, honeypot: "i am a bot" },
      headers: browserHeaders,
    });
    expect(res.status()).toBe(200);
  });

  test("normalises email case and surrounding whitespace", async ({ request }) => {
    // zod 4 deprecates .email() on ZodString. Swapping naively to z.email()
    // would validate BEFORE trim/lowercase and reject this input, which the
    // Next app accepted.
    const res = await request.post(ACTION, {
      multipart: { ...validSubmission, email: "  ROSS@Example.COM " },
      headers: browserHeaders,
    });
    expect(res.status()).toBe(200);
  });

  test.describe("preserves the original validation messages", () => {
    const cases = [
      { field: "name", value: "X", message: "Name must be at least 2 characters." },
      {
        field: "name",
        value: "x".repeat(81),
        message: "Name must be 80 characters or fewer.",
      },
      {
        field: "email",
        value: "nope",
        message: "Please enter a valid email address.",
      },
      {
        field: "message",
        value: "hi",
        message: "Message must be at least 10 characters.",
      },
    ];

    for (const { field, value, message } of cases) {
      test(`${field}: "${message}"`, async ({ request }) => {
        const res = await request.post(ACTION, {
          multipart: { ...validSubmission, [field]: value },
          headers: browserHeaders,
        });
        expect(res.status()).toBe(400);
        const body = (await res.json()) as { fields?: Record<string, string[]> };
        expect(body.fields?.[field]).toContain(message);
      });
    }
  });
});

/**
 * Page chrome and form styling.
 *
 * /contact was built first, during risk #1, before the design system existed —
 * so it shipped functional but with bare markup, and stayed that way through
 * the whole component port. Everything passed the whole time, because nothing
 * here was tested. These assertions exist so "works but looks unfinished"
 * cannot pass again.
 */
test.describe("contact page — chrome and styling", () => {
  test("renders the registration mark, availability pill and contact list", async ({
    page,
  }) => {
    await page.goto("/contact");
    const main = page.locator("main");

    await expect(main.getByText("[ Contact ]")).toBeVisible();

    // The dot is part of the availability signal, not decoration — so it is
    // still asserted, but by the thing that makes it a signal rather than by
    // how it used to move. This read `.animate-ping` until the design spec
    // banned continuous motion, which is a test pinned to a MECHANISM: the
    // signal is the LIVE state token, and the pulse was one rendering of it.
    // The class it now looks for is the same token /projects and the home page
    // use, so all three surfaces fail together if the token is renamed.
    await expect(main.locator(".bg-state-live")).toBeVisible();
    await expect(main.getByText(/Available for full-time roles/)).toBeVisible();

    // IT IS THE ROUTE'S BAND NOW (R9, screen 16a): "one ruled line, a 6px
    // #3f9a5f dot, the availability sentence, and the visa fact right-aligned
    // as a 12px mono label. The three-cell availability block is gone."
    const band = main.locator("[data-availability-band]");
    await expect(band).toHaveCount(1);
    const fullBleed = await band.evaluate(
      (el) => Math.round(el.getBoundingClientRect().width) >= window.innerWidth - 1,
    );
    expect(fullBleed, "the availability band is not full-bleed").toBe(true);
    await expect(band).toContainText("UK Graduate Visa");

    // The two dashed cells went WITH the block. Open item 06 is closed by
    // deletion on this surface — "seeking" is the standfirst's job and the
    // reply time moved to the receipt — so a dashed slot reappearing here means
    // the three-cell block came back.
    await expect(band.locator("[data-open-slot]")).toHaveCount(0);

    for (const label of ["Email", "GitHub", "LinkedIn", "Download CV"]) {
      const link = main.locator(".divide-y > a").filter({ hasText: label });
      await expect(link, `${label} link is missing`).toBeVisible();
      // Each row is icon-led; an empty icon box is the tell that a brand mark
      // or lucide import was dropped.
      await expect(link.locator("svg").first(), `${label} has no icon`).toBeVisible();
    }
  });

  test("the form takes the route's MAJOR, and says so exactly once", async ({ page }) => {
    // The form carried its own <h2>Send a message</h2> at 20px. R9 makes the
    // form this route's MAJOR, so the heading moved to the section head above
    // the island — and for one commit both existed, 60px apart, with identical
    // text. Two identical headings read as a heading and a subtitle, so nobody
    // sees it; the R9 gate counted it.
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Send a message" })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Send a message" })).toHaveCSS(
      "font-size",
      "32px",
    );
  });

  test("the form is the primary column, and the direct routes are the rail", async ({
    page,
  }) => {
    // 680 + 120 + 352 = 1152, the same grid as the write-up. The FORM is the
    // primary column, which is a swap: it used to sit in the right-hand column
    // behind the intro and the link list, so the page led with three ways not
    // to use the thing it is for.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/contact");

    const box = await page.evaluate(() => {
      const form = document.querySelector("form")!.closest("div")!.parentElement!;
      const rail = document
        .querySelector('aside[aria-label="Direct routes"]')!
        .getBoundingClientRect();
      const primary = form.getBoundingClientRect();
      return {
        primary: Math.round(primary.width),
        rail: Math.round(rail.width),
        formIsLeft: primary.left < rail.left,
      };
    });

    expect(box.primary).toBe(680);
    expect(box.rail).toBe(352);
    expect(box.formIsLeft, "the form is not the primary column").toBe(true);
  });

  test("the form controls use the design-system primitives", async ({ page }) => {
    await page.goto("/contact");

    // Bare <input>/<textarea> render with no border at all, which is exactly
    // what this page shipped with before the primitives were ported.
    for (const id of ["name", "email", "company"]) {
      const box = await page.locator(`#${id}`).evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          border: s.borderTopWidth,
          radius: s.borderTopLeftRadius,
          height: s.height,
        };
      });
      expect(box.border, `#${id} has no border`).not.toBe("0px");
      expect(box.radius, `#${id} is not rounded`).not.toBe("0px");
      expect(box.height, `#${id} is not 40px tall`).toBe("40px");
    }

    const textareaBorder = await page
      .locator("#message")
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(textareaBorder).not.toBe("0px");

    // Label carries the primitive's weight; a bare <label> would be 400.
    const labelWeight = await page
      .locator('label[for="name"]')
      .evaluate((el) => getComputedStyle(el).fontWeight);
    expect(labelWeight).toBe("500");
  });

  test("the submit button shares the site's button styling", async ({ page }) => {
    await page.goto("/contact");
    const submit = page.locator('form button[type="submit"]');

    // Primary variant — the same #3d5a73 every other primary button uses, so a
    // drifted class string shows up here rather than only to the eye.
    await expect(submit).toHaveCSS("background-color", "rgb(61, 90, 115)");
    await expect(submit.locator("svg")).toBeVisible();
  });

  test("an invalid field is flagged to assistive tech and restyled", async ({ page }) => {
    await page.goto("/contact");
    await waitForFormHydration(page);
    await page.getByRole("button", { name: /Send message/ }).click();

    const name = page.locator("#name");
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#company")).toHaveAttribute("aria-invalid", "false");

    /**
     * The `aria-[invalid=true]:border-destructive` rule fires — toggling the
     * attribute changes the computed border-color.
     *
     * It deliberately does NOT assert the border is red, because it is not.
     * Checked against the live Next site: an invalid field there computes to
     * exactly the same value, `oklab(0.916204 0.000517875 -0.00546789)`, which
     * is a light grey rather than --destructive. So this is inherited
     * behaviour, faithfully ported, not a migration regression — and asserting
     * "is red" would fail against the very thing being ported.
     *
     * Worth revisiting in the redesign phase: the invalid state is announced to
     * screen readers but is not visually distinct. Flagged to Ross.
     */
    const valid = await page
      .locator("#company")
      .evaluate((el) => getComputedStyle(el).borderTopColor);
    const invalid = await name.evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(invalid, "aria-invalid did not change the border").not.toBe(valid);
  });
});
