import Link from "next/link";

import { Container } from "@/components/layout/container";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { href: "/projects", label: "Projects" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: siteConfig.links.github, label: "GitHub", external: true },
    { href: siteConfig.links.linkedin, label: "LinkedIn", external: true },
    { href: "/cv.pdf", label: "CV" },
  ];

  return (
    <footer className="border-border mt-24 border-t">
      <Container className="py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="font-display text-lg font-bold tracking-tight">
              {siteConfig.shortName}
            </Link>
            <p className="text-muted-foreground mt-1.5 max-w-xs text-sm leading-relaxed">
              AI safety, GenAI evaluation &amp; applied data science.{" "}
              {siteConfig.location}.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-border text-muted-foreground mt-8 flex flex-col gap-1 border-t pt-6 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {siteConfig.name}
          </span>
          <span>Built with Next.js &amp; Tailwind</span>
        </div>
      </Container>
    </footer>
  );
}
