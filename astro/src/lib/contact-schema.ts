import { z } from "zod";

/**
 * Schema shared between the client-side React Hook Form and the
 * server-side Astro Action. Keep these in sync — the client uses this
 * for instant feedback, the server re-validates because client checks
 * are advisory, never authoritative.
 *
 * Ported from the Next app's src/lib/contact-schema.ts. zod 3 -> zod 4
 * (the version astro@7 depends on and `astro/zod` re-exports). Every
 * validator used here survived the major bump unchanged; only the error
 * *reading* API moved (`error.errors` -> `error.issues`), which is in
 * the action, not here.
 */
export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  // zod 4 deprecates `.email()` on ZodString in favour of the top-level
  // `z.email()`. A naive swap would reorder the checks — `z.email()` would
  // reject "  Ross@Example.com " before trim/lowercase ever ran, silently
  // breaking input the Next app accepted. Piping keeps the original order:
  // trim -> lowercase -> length -> format.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .pipe(z.email("Please enter a valid email address.")),
  company: z
    .string()
    .trim()
    .max(120, "Company must be 120 characters or fewer.")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(2000, "Message must be 2000 characters or fewer."),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

/**
 * Server-only schema — adds the honeypot and Turnstile token fields
 * that the form submits but the user never types.
 */
/**
 * Astro's `accept: 'form'` parser hands the schema `null` for a field that is
 * absent from the FormData or present but empty. The Next Server Action used
 * `Object.fromEntries(formData.entries())`, which produced `""` instead. That
 * one-word difference rejected every real submission with "expected string,
 * received null" on `company` and `honeypot`.
 *
 * Normalising null -> "" restores the Next semantics exactly, so all the
 * original zod messages survive rather than being replaced by type errors.
 */
const formText = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === null ? "" : value), schema);

export const contactSubmissionSchema = z.object({
  name: formText(contactFormSchema.shape.name),
  email: formText(contactFormSchema.shape.email),
  message: formText(contactFormSchema.shape.message),
  company: formText(contactFormSchema.shape.company),
  // Honeypot must stay empty. Bots auto-fill all fields.
  //
  // Deliberately NOT `.max(0)` here, unlike the Next schema. Astro validates
  // `input` before the handler runs and answers a failure with 400 + the field
  // error — which would tell a bot precisely which field gave it away. The
  // emptiness check lives in the handler instead, so a filled honeypot still
  // gets the original "pretend success" response.
  honeypot: formText(z.string().optional()),
  turnstileToken: formText(z.string().min(1).optional().or(z.literal(""))),
});

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
