import { describe, expect, it } from "vitest";

import { renderContactEmail } from "@/lib/email-template";

const baseInput = {
  name: "Jane Doe",
  email: "jane@example.com",
  company: "Acme",
  message: "Hi there, this is a test.",
  receivedAt: new Date("2026-04-30T10:00:00Z"),
  ipAddress: "1.2.3.4",
};

describe("renderContactEmail", () => {
  it("returns subject, html, text", () => {
    const result = renderContactEmail(baseInput);
    expect(result.subject).toMatch(/Jane Doe/);
    expect(result.html).toContain("Jane Doe");
    expect(result.text).toContain("Jane Doe");
  });

  it("includes the message body in both formats", () => {
    const result = renderContactEmail(baseInput);
    expect(result.html).toContain("Hi there, this is a test.");
    expect(result.text).toContain("Hi there, this is a test.");
  });

  it("escapes HTML in user input to prevent injection", () => {
    const result = renderContactEmail({
      ...baseInput,
      name: "<script>alert('xss')</script>",
      message: "Bad <img src=x onerror=alert(1)>",
    });
    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain("<img src=x");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("omits company line when not provided", () => {
    const result = renderContactEmail({ ...baseInput, company: undefined });
    expect(result.text).not.toContain("Company:");
  });

  it("omits IP line when not provided", () => {
    const result = renderContactEmail({ ...baseInput, ipAddress: undefined });
    expect(result.text).not.toContain("IP:");
  });
});
