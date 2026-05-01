import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectCard } from "@/components/projects/project-card";
import type { ProjectMeta } from "@/types/project";

const project: ProjectMeta = {
  slug: "demo-project",
  title: "Demo Project",
  summary: "A short summary describing the demo project.",
  stack: ["TypeScript", "Next.js"],
  period: "2026",
  publishedAt: "2026-04-30",
  links: { github: "https://github.com/example/demo" },
};

describe("<ProjectCard />", () => {
  it("renders the title, summary and period", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("Demo Project")).toBeInTheDocument();
    expect(screen.getByText(/short summary/)).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("renders one badge per stack entry", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
  });

  it("links the title to the project detail page", () => {
    render(<ProjectCard project={project} />);
    const titleLink = screen.getByRole("link", { name: "Demo Project" });
    expect(titleLink).toHaveAttribute("href", "/projects/demo-project");
  });

  it("renders a 'View source' link when github is provided", () => {
    render(<ProjectCard project={project} />);
    const githubLink = screen.getByRole("link", { name: /view source/i });
    expect(githubLink).toHaveAttribute("href", "https://github.com/example/demo");
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("hides the View source link when no github URL is provided", () => {
    render(<ProjectCard project={{ ...project, links: undefined }} />);
    expect(screen.queryByRole("link", { name: /view source/i })).toBeNull();
  });
});
