"use server";

import { headers } from "next/headers";
import { Resend } from "resend";

import { contactSubmissionSchema } from "@/lib/contact-schema";
import { renderContactEmail } from "@/lib/email-template";
import { env } from "@/lib/env";
import { getRateLimiter } from "@/lib/rate-limit";

export interface ContactActionResult {
  success: boolean;
  /** User-facing error message, safe to show in a toast. */
  error?: string;
}

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (resend) return resend;
  if (!env.RESEND_API_KEY) return null;
  resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

async function verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
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

export async function submitContactForm(
  formData: FormData,
): Promise<ContactActionResult> {
  // 1. Parse and validate
  const raw = Object.fromEntries(formData.entries());
  const parsed = contactSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      success: false,
      error: first?.message ?? "Please check the form and try again.",
    };
  }

  // 2. Honeypot — bots fill all fields, humans never see it
  if (parsed.data.honeypot && parsed.data.honeypot.length > 0) {
    // Pretend success so bots don't learn they're caught
    return { success: true };
  }

  // 3. Rate limit per IP (5 submissions / hour)
  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip")?.trim() ??
    null;

  const ratelimit = getRateLimiter();
  if (ratelimit) {
    const { success: notLimited } = await ratelimit.limit(
      `ip:${ipAddress ?? "anonymous"}`,
    );
    if (!notLimited) {
      return {
        success: false,
        error: "Too many submissions from your network. Please try again in an hour.",
      };
    }
  }

  // 4. Bot protection via Cloudflare Turnstile
  if (env.TURNSTILE_SECRET_KEY) {
    if (!parsed.data.turnstileToken) {
      return { success: false, error: "Please complete the bot check." };
    }
    const ok = await verifyTurnstile(parsed.data.turnstileToken, ipAddress);
    if (!ok) {
      return {
        success: false,
        error: "Bot check failed — please refresh and try again.",
      };
    }
  }

  // 5. Send email
  const client = getResend();
  if (!client || !env.RESEND_TO_EMAIL || !env.RESEND_FROM_EMAIL) {
    // Dev fallback — log to server console so you can develop without setting up Resend
    console.warn(
      "[contact] Resend not configured — logging submission instead:",
      parsed.data,
    );
    return { success: true };
  }

  const { subject, html, text } = renderContactEmail({
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company,
    message: parsed.data.message,
    receivedAt: new Date(),
    ipAddress: ipAddress ?? undefined,
  });

  try {
    const { error } = await client.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: env.RESEND_TO_EMAIL,
      replyTo: parsed.data.email,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("Resend error:", error);
      return {
        success: false,
        error: "Couldn't send right now. Please email me directly.",
      };
    }
  } catch (error) {
    console.error("Resend exception:", error);
    return {
      success: false,
      error: "Couldn't send right now. Please email me directly.",
    };
  }

  return { success: true };
}
