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

  test("accepts a valid submission, clears the form, and toasts success", async ({
    page,
  }) => {
    await page.goto("/contact");
    await waitForFormHydration(page);

    await page.locator("#name").fill("Playwright Test");
    await page.locator("#email").fill("test@example.com");
    await page
      .locator("#message")
      .fill("Hello, this is an automated end-to-end test of the contact form.");

    await page.getByRole("button", { name: /Send message/ }).click();

    await expect(page.locator("#name")).toHaveValue("", { timeout: 10_000 });
    await expect(page.locator("#email")).toHaveValue("");
    await expect(page.locator("#message")).toHaveValue("");

    // The toast only appears if <Toaster> and toast() share a module instance.
    // With <Toaster> hoisted into the layout they land in separate islands,
    // sonner loads twice, and every toast silently disappears.
    await expect(
      page.getByText(/I.ll be in touch within a couple of days/i),
    ).toBeVisible();
  });
});

test.describe("contact action — server contract", () => {
  test("accepts a submission with no company field", async ({ request }) => {
    // Astro's `accept: 'form'` parser hands absent fields to the schema as
    // `null`, not `""` as Next's Object.fromEntries did. Before the schema
    // normalised that, EVERY real submission failed on company + honeypot.
    const res = await request.post(ACTION, { multipart: validSubmission, headers: browserHeaders });
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
