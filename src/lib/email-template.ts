import "server-only";

import type { ContactFormValues } from "@/lib/contact-schema";

interface EmailTemplateInput extends ContactFormValues {
  receivedAt: Date;
  ipAddress?: string;
}

/**
 * Plain HTML email body sent to the portfolio owner.
 * Inline styles only — many email clients strip <style> blocks.
 */
export function renderContactEmail(input: EmailTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Portfolio contact from ${input.name}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a">New contact form submission</p>
      <h1 style="margin:0 0 24px;font-size:20px;font-weight:600">${escapeHtml(input.name)}</h1>

      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:13px;width:120px">Email</td>
          <td style="padding:8px 0;font-size:14px"><a href="mailto:${escapeHtml(input.email)}" style="color:#0a0a0a">${escapeHtml(input.email)}</a></td>
        </tr>
        ${
          input.company
            ? `<tr><td style="padding:8px 0;color:#71717a;font-size:13px">Company</td><td style="padding:8px 0;font-size:14px">${escapeHtml(input.company)}</td></tr>`
            : ""
        }
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:13px">Received</td>
          <td style="padding:8px 0;font-size:14px;color:#52525b">${input.receivedAt.toUTCString()}</td>
        </tr>
        ${
          input.ipAddress
            ? `<tr><td style="padding:8px 0;color:#71717a;font-size:13px">IP</td><td style="padding:8px 0;font-size:13px;color:#52525b">${escapeHtml(input.ipAddress)}</td></tr>`
            : ""
        }
      </table>

      <div style="border-top:1px solid #e4e4e7;padding-top:24px">
        <p style="margin:0 0 8px;font-size:13px;color:#71717a">Message</p>
        <div style="font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(input.message)}</div>
      </div>
    </div>
  </body>
</html>`.trim();

  const text = [
    `New contact form submission`,
    ``,
    `Name:      ${input.name}`,
    `Email:     ${input.email}`,
    input.company ? `Company:   ${input.company}` : null,
    `Received:  ${input.receivedAt.toUTCString()}`,
    input.ipAddress ? `IP:        ${input.ipAddress}` : null,
    ``,
    `Message:`,
    input.message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { subject, html, text };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
