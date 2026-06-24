"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

interface ProjectFilterProps {
  stacks: readonly string[];
  active: string | null;
}

/**
 * Stack-filter chip strip. Updates `?stack=X` in the URL, which the server
 * page reads on render. Plain Links so each filter state is shareable.
 */
export function ProjectFilter({ stacks, active }: ProjectFilterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <ul
      className={cn("flex flex-wrap gap-2 transition-opacity", isPending && "opacity-60")}
      aria-label="Filter projects by tech stack"
    >
      <li>
        <FilterChip
          href="/projects"
          isActive={!active}
          onNavigate={() => startTransition(() => router.push("/projects"))}
        >
          All
        </FilterChip>
      </li>
      {stacks.map((stack) => {
        const href = `/projects?stack=${encodeURIComponent(stack)}`;
        return (
          <li key={stack}>
            <FilterChip
              href={href}
              isActive={active === stack}
              onNavigate={() => startTransition(() => router.push(href))}
            >
              {stack}
            </FilterChip>
          </li>
        );
      })}
    </ul>
  );
}

interface FilterChipProps {
  href: string;
  isActive: boolean;
  onNavigate: () => void;
  children: React.ReactNode;
}

function FilterChip({ href, isActive, onNavigate, children }: FilterChipProps) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={(event) => {
        // Let modifier-clicks (cmd-click, middle-click) follow their default behaviour.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate();
      }}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
