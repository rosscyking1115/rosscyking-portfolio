import { Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/60 text-muted-foreground mt-24 border-t py-10 text-sm">
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
                className="hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md transition-colors"
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
                className="hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md transition-colors"
              >
                <Linkedin className="size-4" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link
                href={`mailto:${siteConfig.email}`}
                aria-label="Email"
                className="hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md transition-colors"
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
