"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;
type ThemeChoice = (typeof ORDER)[number];

const ICONS: Record<ThemeChoice, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<ThemeChoice, string> = {
  light: "Switch to dark theme",
  dark: "Switch to system theme",
  system: "Switch to light theme",
};

/**
 * Three-state theme toggle: light → dark → system → light …
 * Cycles in a fixed order so keyboard users always know what's next.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — read theme only after mount.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Theme toggle"
        className="opacity-0"
      />
    );
  }

  const current: ThemeChoice = ORDER.includes(theme as ThemeChoice)
    ? (theme as ThemeChoice)
    : "system";
  const Icon = ICONS[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={LABELS[current]}
      title={LABELS[current]}
      onClick={() => setTheme(next)}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
