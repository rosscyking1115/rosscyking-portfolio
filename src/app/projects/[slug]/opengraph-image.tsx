import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { getProjectBySlug } from "@/lib/projects";
import { siteConfig } from "@/lib/site-config";

export const alt = "Project preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

interface OgProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectOgImage({ params }: OgProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: "#151619",
        color: "#e7e8ea",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 24, color: "#8fa9c2" }}>
        {siteConfig.shortName} · Projects
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -1.5,
            lineHeight: 1.1,
          }}
        >
          {project.title}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            opacity: 0.85,
            lineHeight: 1.4,
          }}
        >
          {project.summary.length > 160
            ? project.summary.slice(0, 160).trimEnd() + "…"
            : project.summary}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {project.stack.slice(0, 5).map((tech) => (
          <div
            key={tech}
            style={{
              display: "flex",
              fontSize: 20,
              padding: "8px 16px",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 999,
            }}
          >
            {tech}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
