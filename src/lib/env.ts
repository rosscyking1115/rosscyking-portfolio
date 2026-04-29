import { z } from "zod";

/**
 * Runtime environment validation.
 *
 * Server-only variables are validated when imported from a server context.
 * Public variables (prefixed `NEXT_PUBLIC_`) are also exposed to the browser.
 *
 * Adding a new variable: add it to the schema, document it in `.env.example`,
 * and update Vercel project settings.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Phase 4: contact form
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_TO_EMAIL: z.string().email().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // Phase 4: bot protection
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),

  // Phase 4: rate limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
});

const parsedServer = serverSchema.safeParse(process.env);
const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});

if (!parsedServer.success) {
  console.error(
    "Invalid server environment variables:",
    parsedServer.error.flatten().fieldErrors,
  );
  throw new Error("Invalid server environment variables");
}

if (!parsedClient.success) {
  console.error(
    "Invalid client environment variables:",
    parsedClient.error.flatten().fieldErrors,
  );
  throw new Error("Invalid client environment variables");
}

export const env = {
  ...parsedServer.data,
  ...parsedClient.data,
} as const;

export type Env = typeof env;
