import { Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border/60 py-10 text-sm text-muted-foreground">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <p>
            &copy; {year} {siteConfig.name}. All rights reserved.
          </p>

          <ul className="flex items-center gap-1">
            <li>
              <Link
                href={siteConfig.links.github}
                aria-label="GitHub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Github className="size-4" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link
                href={siteConfig.links.linkedin}
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Linkedin className="size-4" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link
                href={`mailto:${siteConfig.email}`}
                aria-label="Email"
                className="inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Mail className="size-4" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
