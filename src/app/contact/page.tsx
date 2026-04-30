import type { Metadata } from "next";
import { Mail } from "lucide-react";
import Link from "next/link";

import { ContactForm } from "@/components/contact/contact-form";
import { Section } from "@/components/layout/section";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Send a message about ML, data, or AI-security roles in the UK. Replies usually within a couple of days.",
};

export default function ContactPage() {
  return (
    <Section
      headingAs="h1"
      size="lg"
      containerSize="md"
      eyebrow="Contact"
      heading="Get in touch"
      description="Fill in the form below or send me an email directly. I read everything."
    >
      <div className="text-muted-foreground mb-8 inline-flex items-center gap-2 text-sm">
        <Mail className="size-4" aria-hidden="true" />
        <Link
          href={`mailto:${siteConfig.email}`}
          className="underline-offset-4 hover:underline"
        >
          {siteConfig.email}
        </Link>
      </div>

      <ContactForm />
    </Section>
  );
}
