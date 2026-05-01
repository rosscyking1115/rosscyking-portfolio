import { describe, expect, it } from "vitest";

import { contactFormSchema, contactSubmissionSchema } from "@/lib/contact-schema";

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
  it("rejects a non-empty honeypot", () => {
    const result = contactSubmissionSchema.safeParse({
      ...validBase,
      honeypot: "bot-was-here",
    });
    expect(result.success).toBe(false);
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
