import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";

describe("<Badge />", () => {
  it("renders children", () => {
    render(<Badge>PySpark</Badge>);
    expect(screen.getByText("PySpark")).toBeInTheDocument();
  });

  it("applies the default variant class by default", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default").className).toMatch(/bg-secondary/);
  });

  it("applies the outline variant class", () => {
    render(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText("Outline").className).toMatch(/border-border/);
  });
});
