import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { actions, isInputError } from "astro:actions";
import { PUBLIC_TURNSTILE_SITE_KEY } from "astro:env/client";
import { useState, useTransition } from "react";
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
    defaultValues: { name: "", email: "", company: "", message: "" },
  });

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        toast.success("Thanks — I'll be in touch within a couple of days.");
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
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Send a message
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Or just email me directly — whatever&rsquo;s easier.
      </p>

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

      {PUBLIC_TURNSTILE_SITE_KEY && (
        <div className="mt-5">
          <Turnstile
            siteKey={PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
            options={{ theme: "auto", size: "flexible" }}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className={buttonVariants()}>
          {isPending ? (
            "Sending…"
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
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
