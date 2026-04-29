"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type Theme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const satisfies readonly Theme[];

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<Theme, string> = {
  light: "Switch to dark theme",
  dark: "Switch to system theme",
  system: "Switch to light theme",
};

/**
 * Three-state toggle: light → dark → system → light…
 * The icon is driven by `theme` (cookie value), not `resolvedTheme`, so it's
 * the same on server and client — no hydration mismatch, no mounted flag needed.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={LABELS[theme]}
      title={LABELS[theme]}
      onClick={() => setTheme(next)}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
