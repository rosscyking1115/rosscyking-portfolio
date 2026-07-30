import { describe, expect, it } from "vitest";

import { contactFormSchema, contactSubmissionSchema } from "../../src/lib/contact-schema";

const validBase = {
  name: "Ross King",
  email: "ross@example.com",
  message: "Hello, I'd like to chat about an ML role you might be hiring for.",
};

describe("contactFormSchema", () => {
  it("accepts a valid submission", () => {
    expect(contactFormSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects short names", () => {
    const result = contactFormSchema.safeParse({ ...validBase, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const result = contactFormSchema.safeParse({
      ...validBase,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects messages that are too short", () => {
    const result = contactFormSchema.safeParse({
      ...validBase,
      message: "hi",
    });
    expect(result.success).toBe(false);
  });

  it("rejects messages that are too long", () => {
    const result = contactFormSchema.safeParse({
      ...validBase,
      message: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("normalises emails to lowercase and trims whitespace", () => {
    const result = contactFormSchema.parse({
      ...validBase,
      email: "  Ross@Example.COM  ",
    });
    expect(result.email).toBe("ross@example.com");
  });

  it("treats company as optional", () => {
    expect(contactFormSchema.safeParse({ ...validBase, company: "" }).success).toBe(true);
    expect(
      contactFormSchema.safeParse({ ...validBase, company: undefined }).success,
    ).toBe(true);
    expect(contactFormSchema.safeParse({ ...validBase, company: "Acme" }).success).toBe(
      true,
    );
  });
});

describe("contactSubmissionSchema", () => {
  /**
   * INVERTED AT THE ASTRO PORT, deliberately — this used to assert the schema
   * REJECTED a filled honeypot.
   *
   * Astro validates the action's `input` schema before the handler runs, and
   * answers a schema failure with 400 plus the offending field name. That tells
   * a bot exactly which field gave it away, which is the one thing a honeypot
   * must never do. So `.max(0)` was moved out of the schema and into the
   * handler, which answers the same "pretend success" the Next version did.
   *
   * The test is kept and inverted rather than deleted, because "the schema does
   * not reject this" is now a load-bearing property: put `.max(0)` back and the
   * trap starts announcing itself. The behaviour that replaced it — a filled
   * honeypot still returning 200 — is covered end to end in
   * tests/e2e/contact.spec.ts.
   */
  it("accepts a non-empty honeypot, so a 400 never reveals the trap", () => {
    const result = contactSubmissionSchema.safeParse({
      ...validBase,
      honeypot: "bot-was-here",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty honeypot", () => {
    const result = contactSubmissionSchema.safeParse({
      ...validBase,
      honeypot: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional turnstile token", () => {
    const result = contactSubmissionSchema.safeParse({
      ...validBase,
      turnstileToken: "abc123",
    });
    expect(result.success).toBe(true);
  });
});
