import type { Metadata } from "next";
import { ArrowUpRight, Download, Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

import { ContactForm } from "@/components/contact/contact-form";
import { Container } from "@/components/layout/container";
import { IndexMark } from "@/components/layout/index-mark";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch about applied AI, GenAI evaluation, data science, and AI safety roles in the UK. Replies usually within a couple of days.",
  alternates: { canonical: "/contact" },
};

const strip = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");

const links = [
  {
    icon: Mail,
    label: "Email",
    value: siteConfig.email,
    href: `mailto:${siteConfig.email}`,
  },
  {
    icon: Github,
    label: "GitHub",
    value: strip(siteConfig.links.github),
    href: siteConfig.links.github,
    external: true,
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: strip(siteConfig.links.linkedin),
    href: siteConfig.links.linkedin,
    external: true,
  },
  {
    icon: Download,
    label: "Download CV",
    value: "PDF",
    href: "/cv.pdf",
    download: "Cheng-Yuan-King-CV.pdf",
  },
];

export default function ContactPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        {/* Intro + links */}
        <div className="max-w-prose">
          <IndexMark mark="Contact" label="Sheffield, UK · GMT" />
          <h1 className="font-display mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Let&rsquo;s talk.
          </h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
            I&rsquo;m looking for 2026 roles in AI safety, GenAI evaluation, and applied
            data science. If that&rsquo;s what you&rsquo;re hiring for, the fastest route
            is email — I reply within a day or two.
          </p>

          <span className="border-border bg-background mt-8 inline-flex w-fit items-center gap-2 rounded-full border py-1 pr-3 pl-2.5 text-sm font-medium">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {siteConfig.availability}
          </span>

          <div className="border-border divide-border mt-8 flex flex-col divide-y border-y">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                {...(link.download ? { download: link.download } : {})}
                className="group flex items-center gap-3 py-3.5 transition-[padding] duration-150 hover:px-1"
              >
                <span className="border-border text-muted-foreground flex size-9 items-center justify-center rounded border">
                  <link.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{link.label}</span>
                  <span className="text-muted-foreground block font-mono text-xs">
                    {link.value}
                  </span>
                </span>
                <ArrowUpRight
                  className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Form */}
        <ContactForm />
      </div>
    </Container>
  );
}
