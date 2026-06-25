import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.name} — ${siteConfig.titleTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default function OpenGraphImage() {
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
      <div style={{ display: "flex", fontSize: 28, opacity: 0.6 }}>
        {siteConfig.url.replace(/^https?:\/\//, "")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "#8fa9c2",
          }}
        >
          {siteConfig.titleTagline}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 24,
          opacity: 0.7,
        }}
      >
        <span style={{ display: "flex" }}>{siteConfig.location}</span>
        <span style={{ display: "flex" }}>{siteConfig.availability}</span>
      </div>
    </div>,
    { ...size },
  );
}
