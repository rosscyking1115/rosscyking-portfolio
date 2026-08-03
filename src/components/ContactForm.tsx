import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { actions, isInputError } from "astro:actions";
import { PUBLIC_TURNSTILE_SITE_KEY } from "astro:env/client";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Toaster, toast } from "sonner";

import { buttonVariants } from "../lib/button-variants";
import { contactFormSchema, type ContactFormValues } from "../lib/contact-schema";
import { Input, Label, SendIcon, Textarea } from "./ui/form-controls";

/**
 * Ported from src/components/contact/contact-form.tsx.
 *
 * The client half is nearly unchanged: same zod schema, same react-hook-form
 * wiring, same Turnstile widget, same toasts, same field ids (#name, #email,
 * #message) and the same `role="alert"` error nodes, so tests/e2e/contact.spec.ts
 * ports across without touching its selectors.
 *
 * What changed:
 *   - `submitContactForm(formData)` -> `actions.contact(formData)`, which
 *     returns `{ data, error }` instead of `{ success, error }`.
 *       https://docs.astro.build/en/guides/actions/
 *   - `process.env.NEXT_PUBLIC_*` -> `astro:env/client`.
 *
 * The form controls come from ./ui/form-controls, ported from the shadcn
 * primitives. The submit button shares `buttonVariants` with every other button
 * on the site rather than restyling itself.
 */
export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    /**
     * ON BLUR, never on keystroke. The spec is explicit — "form validation on
     * blur, never on keystroke" — and the mock gives the reason: "nothing
     * should tell you that you are wrong while you are still typing."
     *
     * react-hook-form's default is `onSubmit`, then `onChange` once a field has
     * errored. So the first message arrived on submit and every one after it
     * arrived per keypress — precisely the behaviour the rule forbids, reached
     * by doing nothing. `reValidateMode` matters as much as `mode`: set one and
     * not the other and the second keystroke starts talking again.
     */
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { name: "", email: "", company: "", message: "" },
  });

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * The receipt (design spec §04, 7a): "success returns a receipt with a
   * reference, in place".
   *
   * A toast said the same words and then took them away. This route is the only
   * place on the site where something can be in progress, be wrong, or succeed,
   * and the one outcome the visitor most needs to keep is the one that
   * disappeared after four seconds — so the receipt REPLACES the form card and
   * stays on screen. It does not navigate, which is what keeps it readable and
   * what keeps the browser Back button meaning what it meant before.
   *
   * TWO THINGS THE SPEC'S MOCK SHOWS THAT ARE NOT TRUE HERE, and are therefore
   * not written:
   *
   *   "A copy has gone to your address." It has not. src/actions/index.ts sends
   *   exactly one email, to RESEND_TO_EMAIL, with `replyTo` set to the sender.
   *   Saying otherwise would be the site's first false statement.
   *
   *   A reference code. The action returns no id, and Resend's internal message
   *   id is not a thing a visitor can quote at anyone. The mock labels its own
   *   as "illustrative"; an illustrative reference on a real receipt is worse
   *   than none.
   *
   * What is left is true: the time it was received, and Ross's own existing
   * sentence about when he replies — selected from the page above, not written.
   */
  const [receipt, setReceipt] = useState<{
    at: string;
    reference: string;
    /**
     * WHAT WAS ACTUALLY SENT (design pass, screen 16b). Captured from the
     * values the action was given, not re-read from the form — `reset()` runs
     * immediately after, so reading the inputs would echo an empty form back
     * at the person who just filled it in.
     */
    sent: { name: string; email: string; company?: string; message: string };
  } | null>(null);

  /**
   * Turnstile's widget size, chosen by how much room the form actually has.
   *
   * `flexible` fills its container but floors at a 300px min-width, and at a
   * 320px viewport the form's content box is 222px. The widget therefore forced
   * its grid column to 350px and /contact scrolled sideways on every phone up
   * to 360px, with the form still 8px wider than its column at 390px.
   *
   * This was found on the LIVE SITE, not locally, and the reason is the whole
   * point: PUBLIC_TURNSTILE_SITE_KEY is unset in development, so this branch
   * renders nothing here and every gate passed on its absence. AGENTS.md calls
   * this out one level down — "renders nothing" is unverified, not verified.
   *
   * `compact` measures 150x140 with no min-width at all (measured against the
   * real widget, not read off the docs), so it fits any phone. It is used only
   * where `flexible` will not: a 150px box in a 530px form is a downgrade.
   *
   * The breakpoint is a media query rather than a measurement of the container,
   * because the container is the thing the widget is distorting — reading its
   * width once `flexible` has floored it to 350px would report "there is room"
   * and keep the bug. In viewport terms the form's content box is the viewport
   * less 48px of page gutter, 48px of form padding and 2px of border, so 300px
   * of room arrives at 398px. 400 is the round number above it.
   *
   * Re-picked on resize, but never once a token has been earned: changing
   * `size` remounts the widget, which would silently discard a challenge the
   * visitor has already passed.
   */
  const [widgetSize, setWidgetSize] = useState<"flexible" | "compact" | null>(null);
  const solved = Boolean(turnstileToken);

  useEffect(() => {
    if (!PUBLIC_TURNSTILE_SITE_KEY || solved) return;
    const query = window.matchMedia("(min-width: 400px)");
    const pick = () => setWidgetSize(query.matches ? "flexible" : "compact");
    pick();
    query.addEventListener("change", pick);
    return () => query.removeEventListener("change", pick);
  }, [solved]);

  const onSubmit = (values: ContactFormValues) => {
    if (PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Please complete the bot check before sending.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", values.name);
      formData.set("email", values.email);
      if (values.company) formData.set("company", values.company);
      formData.set("message", values.message);
      formData.set("honeypot", "");
      if (turnstileToken) formData.set("turnstileToken", turnstileToken);

      const { error } = await actions.contact(formData);

      if (!error) {
        // Stamped when the send SUCCEEDED, not when the page loaded, so the
        // receipt records the event rather than the visit.
        // EXPLICIT COMPONENTS, not dateStyle/timeStyle. Intl rejects mixing
        // the two shorthand styles with an individual option such as
        // timeZoneName — it throws `TypeError: Invalid option : option`, which
        // surfaced as the whole island unmounting into React's error boundary
        // and the receipt never appearing. Caught by running the submission,
        // not by types: both spellings type-check.
        const sentAt = new Date();
        const pad = (value: number) => String(value).padStart(2, "0");
        setReceipt({
          at: new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          }).format(sentAt),
          /**
           * THE REFERENCE, which the spec asks for and which I argued against
           * before the spec README arrived: "success returns a receipt with a
           * reference, in place".
           *
           * Derived from the moment of sending — RK-YYMMDD-HHMM in the
           * visitor's own clock — and NOT from anything the server returns,
           * because the action returns no id. That is said on the page rather
           * than hidden: it is the time you sent it, which is enough to find
           * one message in one inbox, and it is not dressed up as a ticket
           * number issued by a system that does not exist.
           */
          reference: `RK-${pad(sentAt.getFullYear() % 100)}${pad(
            sentAt.getMonth() + 1,
          )}${pad(sentAt.getDate())}-${pad(sentAt.getHours())}${pad(sentAt.getMinutes())}`,
          sent: {
            name: values.name,
            email: values.email,
            company: values.company,
            message: values.message,
          },
        });
        reset();
        return;
      }

      // Input errors only reach here if the client-side schema was bypassed
      // (tampering, or a schema drift bug). Surface the first field message
      // so the failure is never silent.
      if (isInputError(error)) {
        const first = Object.values(error.fields).flat()[0];
        toast.error(first ?? "Please check the form and try again.");
        return;
      }

      toast.error(error.message || "Something went wrong. Please try again.");
    });
  };

  if (receipt) {
    /**
     * THE RECEIPT (design pass, screen 16b): "after submit the form is replaced
     * in place by what was actually sent, what happens next, and by when — no
     * toast, no redirect, no layout shift."
     *
     * All four clauses are load-bearing and the first version had only two of
     * them. It said WHEN it arrived and gave a reference; it did not say what
     * had been sent, which is the one thing a person cannot check for
     * themselves after a form clears itself. A confirmation that confirms the
     * transaction and not the content is a receipt for an unknown amount.
     *
     * BY WHEN IS A MARKED SLOT, not a guess. Open item 06 asks Ross for his
     * typical reply time and the spec is explicit — "state it only if true". It
     * used to be one of three cells on an availability block that screen 16a
     * deletes; this is where it belongs instead, because "by when" is what the
     * person who has just written to him is actually asking. Dashed, and saying
     * what is missing, exactly as /privacy marks its four retention periods.
     */
    return (
      <section
        aria-live="polite"
        data-receipt
        className="border-border bg-background rounded-lg border p-6 shadow-xs sm:p-8"
      >
        <p className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
          <span className="bg-state-live mr-2 inline-block size-1.5 rounded-full" />
          Received
        </p>

        <dl className="mt-4 flex flex-col gap-1.5">
          <div className="flex gap-3">
            <dt className="text-muted-foreground text-label w-24 shrink-0 font-mono tracking-wider uppercase">
              Reference
            </dt>
            <dd className="font-mono text-sm" data-receipt-reference>
              {receipt.reference}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-muted-foreground text-label w-24 shrink-0 font-mono tracking-wider uppercase">
              Received
            </dt>
            <dd className="font-mono text-sm" data-receipt-time>
              {receipt.at}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-muted-foreground text-label w-24 shrink-0 font-mono tracking-wider uppercase">
              Reply by
            </dt>
            <dd
              className="border-border text-muted-foreground w-fit border border-dashed px-2 py-0.5 font-mono text-xs"
              data-open-slot
            >
              not stated yet
            </dd>
          </div>
        </dl>

        <div className="border-border mt-5 border-t pt-5" data-receipt-sent>
          <p className="text-muted-foreground text-label font-mono tracking-[0.12em] uppercase">
            What you sent
          </p>
          <dl className="mt-3 flex flex-col gap-2.5">
            <div className="flex gap-3">
              <dt className="text-muted-foreground text-label w-24 shrink-0 font-mono tracking-wider uppercase">
                From
              </dt>
              <dd className="min-w-0 text-sm">
                {receipt.sent.name}
                {receipt.sent.company ? ` · ${receipt.sent.company}` : ""}
                <span className="text-muted-foreground block font-mono text-xs break-all">
                  {receipt.sent.email}
                </span>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-muted-foreground text-label w-24 shrink-0 font-mono tracking-wider uppercase">
                Message
              </dt>
              {/*
                `whitespace-pre-line`, so the paragraph breaks the sender typed
                are the paragraph breaks they are shown. Not truncated: the
                point of echoing it is that they can check it, and a receipt
                that elides the middle of what you wrote is not a check.
              */}
              <dd className="text-body min-w-0 text-sm leading-relaxed whitespace-pre-line">
                {receipt.sent.message}
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-body mt-5 text-sm leading-relaxed">
          Your message is with me, and it goes to one inbox — nothing is copied to a list.
          The reference is the time you sent it; quote it back if you need to.
        </p>
        <button
          type="button"
          onClick={() => setReceipt(null)}
          className="text-primary ease-instrument mt-5 cursor-pointer text-sm font-medium underline-offset-2 transition-colors duration-[var(--motion-state)] hover:underline"
        >
          Send another
        </button>
      </section>
    );
  }
  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="border-border bg-background rounded-lg border p-6 shadow-xs sm:p-8"
    >
      {/*
        The Toaster lives INSIDE this island, not in the layout.
        Astro islands do not share module state — verified here, not assumed:
        with `<Toaster>` in Base.astro the page loaded sonner twice, once as
        node_modules/sonner/dist/index.mjs (resolved for the .astro file) and
        once as Vite's prebundled .vite/deps/sonner.js (resolved for this
        .tsx island). Two module instances means two toast stores, so every
        toast() call here vanished silently.
        https://docs.astro.build/en/recipes/sharing-state-islands/
      */}
      <Toaster richColors closeButton />
      {/*
        NO HEADING HERE. The form used to carry its own <h2>Send a message</h2>
        at 20px; R9 makes the form this route's MAJOR, so the heading is now the
        section head above the island — and leaving both put two headings with
        identical text on the page, one of them off the ladder. Found by the R9
        gate rather than by looking, because two identical headings 60px apart
        read as one heading and a subtitle.

        The subtitle went with it. "Or just email me directly" pointed at the
        link list that used to sit beside the form and is now in the rail with
        its own label; the standfirst above already says email is the fastest
        route, in Ross's words.
      */}

      {/* Honeypot — invisible to humans, irresistible to dumb bots */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Name" error={errors.name?.message} required>
          <Input
            id="name"
            placeholder="Jane Recruiter"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>

        <Field id="email" label="Email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            inputMode="email"
            placeholder="jane@company.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>

        <Field
          id="company"
          label="Company"
          hint="Optional"
          error={errors.company?.message}
          wide
        >
          <Input
            id="company"
            placeholder="Acme AI"
            autoComplete="organization"
            aria-invalid={Boolean(errors.company)}
            {...register("company")}
          />
        </Field>

        <Field id="message" label="Message" error={errors.message?.message} required wide>
          <Textarea
            id="message"
            rows={4}
            placeholder="A line about the role and team…"
            aria-invalid={Boolean(errors.message)}
            {...register("message")}
          />
        </Field>
      </div>

      {/*
        `overflow-x-auto` is the guarantee, and `widgetSize` above is only the
        good manners. Choosing `compact` keeps the widget comfortable on a
        phone, but its dimensions belong to Cloudflare and can change without
        this repo hearing about it. The scroll container means that whatever
        size arrives, it is contained here instead of setting the width of the
        page — which is precisely what went wrong. It is inert at every size the
        widget actually renders today: 150px inside a 222px box needs no scroll.
      */}
      {PUBLIC_TURNSTILE_SITE_KEY && widgetSize && (
        <div className="mt-5 min-w-0 overflow-x-auto" data-turnstile-slot>
          <Turnstile
            siteKey={PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
            options={{ theme: "auto", size: widgetSize }}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className={buttonVariants()}>
          {isPending ? (
            /*
              Mono, because that is the site's signal for a machine reading
              (§7c). The spec also draws a 1px indeterminate rule running
              beneath at 2s linear — NOT built, because §01's own NEVER list
              bans continuous motion outright and the system sheet wins over a
              route sketch. A disabled button whose label has switched voice
              says the same thing and says it under reduced motion too.
            */
            <span className="font-mono text-xs tracking-wider uppercase">Sending…</span>
          ) : (
            <>
              Send message
              <SendIcon />
            </>
          )}
        </button>
        <p className="text-muted-foreground text-xs">No newsletter. No follow-up spam.</p>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Span both columns of the form grid. */
  wide?: boolean;
  children: React.ReactNode;
}

function Field({ id, label, error, hint, required, wide, children }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </div>
      {children}
      {error && (
        /*
          "The message always leads with the word INVALID, so the state never
          depends on hue alone" (§7c, and §05 ERRORS). Before this the only
          signal that a field was wrong was that its message was red — which
          fails for anyone who cannot separate it from the label beside it, and
          fails completely in a monochrome print.

          The colour is still --destructive. The spec proposes #8f4f48/#c9938c
          as a seventh token and calls it "the only colour I am adding"; that is
          open item 01 and Ross's approval, so the fallback stands until then.
        */
        <p role="alert" className="text-destructive text-xs">
          <span className="font-mono tracking-wider uppercase">Invalid&nbsp;&mdash;</span>{" "}
          {error}
        </p>
      )}
    </div>
  );
}
