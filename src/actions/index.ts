import { ActionError, defineAction } from "astro:actions";
import {
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  RESEND_TO_EMAIL,
  TURNSTILE_SECRET_KEY,
} from "astro:env/server";
import { Resend } from "resend";

import { contactSubmissionSchema } from "../lib/contact-schema";
import { renderContactEmail } from "../lib/email-template";
import { getRateLimiter } from "../lib/rate-limit";

/**
 * Contact pipeline, ported from the Next Server Action in
 * src/app/contact/actions.ts. Same five stages, same order, same
 * user-facing copy:
 *   validate -> honeypot -> rate-limit -> Turnstile -> Resend
 *
 * Structural differences forced by Astro, all documented:
 *   - `defineAction({ accept: 'form' })` does the FormData parse and zod
 *     validation that stage 1 used to do by hand. Input failures never
 *     reach the handler; Astro returns them as an input error the client
 *     reads via `isInputError`.
 *       https://docs.astro.build/en/guides/actions/
 *   - Failures are thrown as `ActionError` rather than returned as
 *     `{ success: false, error }`. The client maps `error.message` onto
 *     the same toast, so the UX is unchanged.
 *       https://docs.astro.build/en/reference/modules/astro-actions/
 *   - This only works because /contact sets `export const prerender =
 *     false`. Actions called from a form require on-demand rendering.
 */

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (resend) return resend;
  if (!RESEND_API_KEY) return null;
  resend = new Resend(RESEND_API_KEY);
  return resend;
}

async function verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) return true;
  try {
    const body = new URLSearchParams({
      secret: TURNSTILE_SECRET_KEY,
      response: token,
    });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean };
    return data.success;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}

/**
 * The Next version read `x-forwarded-for` via next/headers.
 *
 * The Actions reference does not document which APIContext members reach the
 * action context, so this was verified against a running server rather than
 * assumed: `clientAddress` IS present and resolved correctly (`::1` locally).
 * The proxy headers stay the primary source because that is what Vercel sets
 * in front of the function, with clientAddress as the fallback.
 *
 * Getting this wrong is a silent failure, not a loud one — every visitor would
 * key to "anonymous" and the rate limiter would degrade to a global 5/hour.
 *   https://docs.astro.build/en/reference/api-reference/
 */
function getClientIp(context: {
  request: Request;
  clientAddress?: string;
}): string | null {
  const forwarded = context.request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  const realIp = context.request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  try {
    return context.clientAddress ?? null;
  } catch {
    // clientAddress throws on prerendered routes. /contact is on-demand, so
    // this should never fire — but a throw here would take down the whole
    // submission, which is a worse failure than losing the IP.
    return null;
  }
}

export const server = {
  contact: defineAction({
    accept: "form",
    input: contactSubmissionSchema,
    handler: async (input, context) => {
      // 1. Validation already happened — `input` is parsed and typed.

      // 2. Honeypot — bots fill all fields, humans never see it.
      if (input.honeypot && input.honeypot.length > 0) {
        // Pretend success so bots don't learn they're caught.
        return { success: true as const };
      }

      // 3. Rate limit per IP (5 submissions / hour).
      const ipAddress = getClientIp(context);
      const ratelimit = getRateLimiter();
      if (ratelimit) {
        const { success: notLimited } = await ratelimit.limit(
          `ip:${ipAddress ?? "anonymous"}`,
        );
        if (!notLimited) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Too many submissions from your network. Please try again in an hour.",
          });
        }
      }

      // 4. Bot protection via Cloudflare Turnstile.
      if (TURNSTILE_SECRET_KEY) {
        if (!input.turnstileToken) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Please complete the bot check.",
          });
        }
        const ok = await verifyTurnstile(input.turnstileToken, ipAddress);
        if (!ok) {
          throw new ActionError({
            code: "FORBIDDEN",
            message: "Bot check failed — please refresh and try again.",
          });
        }
      }

      // 5. Send email.
      const client = getResend();
      if (!client || !RESEND_TO_EMAIL || !RESEND_FROM_EMAIL) {
        // Dev fallback — log to the server console so the form can be
        // developed against without setting up Resend.
        console.warn(
          "[contact] Resend not configured — logging submission instead:",
          input,
        );
        return { success: true as const };
      }

      const { subject, html, text } = renderContactEmail({
        name: input.name,
        email: input.email,
        company: input.company,
        message: input.message,
        receivedAt: new Date(),
        ipAddress: ipAddress ?? undefined,
      });

      try {
        const { error } = await client.emails.send({
          from: RESEND_FROM_EMAIL,
          to: RESEND_TO_EMAIL,
          replyTo: input.email,
          subject,
          html,
          text,
        });
        if (error) {
          console.error("Resend error:", error);
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Couldn't send right now. Please email me directly.",
          });
        }
      } catch (error) {
        if (error instanceof ActionError) throw error;
        console.error("Resend exception:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't send right now. Please email me directly.",
        });
      }

      return { success: true as const };
    },
  }),
};
