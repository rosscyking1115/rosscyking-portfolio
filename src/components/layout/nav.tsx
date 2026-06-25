"use client";

import { Github, Linkedin, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Container } from "@/components/layout/container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Lock body scroll while the mobile menu is open. This effect only writes
  // to the DOM (an external system), so it's an allowed effect.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <header className="border-border/60 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="font-display text-base font-bold tracking-tight transition-opacity hover:opacity-80"
          >
            {siteConfig.shortName}
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {siteConfig.nav.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="border-border ml-2 flex items-center gap-2 border-l pl-3">
              <Button asChild size="sm">
                <Link href="/contact">Get in touch</Link>
              </Button>
              <ThemeToggle />
            </div>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </Container>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="border-border/60 bg-background border-t md:hidden"
      >
        <Container>
          <nav aria-label="Mobile" className="flex flex-col gap-1 py-4">
            {siteConfig.nav.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  // Close the menu in the same user action that navigates,
                  // instead of reacting to pathname change in an effect.
                  onClick={closeMenu}
                  className={cn(
                    "rounded-md px-3 py-3 text-base transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center gap-1 border-t pt-3">
              <Link
                href={siteConfig.links.github}
                aria-label="GitHub"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-md transition-colors"
              >
                <Github className="size-5" aria-hidden="true" />
              </Link>
              <Link
                href={siteConfig.links.linkedin}
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-md transition-colors"
              >
                <Linkedin className="size-5" aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </Container>
      </div>
    </header>
  );
}
