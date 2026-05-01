import { z } from "zod";

/**
 * Schema shared between the client-side React Hook Form and the
 * server-side Server Action. Keep these in sync — the client uses this
 * for instant feedback, the server re-validates because client checks
 * are advisory, never authoritative.
 */
export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(200),
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
export const contactSubmissionSchema = contactFormSchema.extend({
  // Honeypot must stay empty. Bots auto-fill all fields.
  honeypot: z.string().max(0).optional().or(z.literal("")),
  turnstileToken: z.string().min(1).optional(),
});

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
