import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

// Vite inlines these as base64 data URIs, so the bundler tracks them and the
// bytes travel with the chunk wherever it is emitted.
import geistBold from "../assets/fonts/Geist-Bold.ttf?inline";
import geistRegular from "../assets/fonts/Geist-Regular.ttf?inline";

import { OG_SIZE as SIZE } from "./og-config";
import { siteConfig } from "./site-config";

/**
 * Open Graph card generation (migration risk #3).
 *
 * Astro has no built-in equivalent to Next's `ImageResponse`, and — checked,
 * not assumed — the docs carry no recipe for this: the official recipes index
 * has no Open Graph entry, and /en/recipes/og-images/ 404s. The only OG mentions
 * in the docs are third-party hosted media services (ImageKit, Cloudinary),
 * which serve images rather than generate them.
 *
 * So this is a deliberate, documented choice rather than a documented pattern.
 * It uses satori + resvg directly, which is exactly what `next/og` wraps —
 * meaning the JSX layouts below are near-verbatim ports of the two
 * opengraph-image.tsx files and render the same design.
 *
 * IMPROVEMENT over Next: these are PRERENDERED at build time (the endpoints set
 * `prerender = true` and enumerate via getStaticPaths), so there are no
 * serverless invocations, no cold starts and no runtime cost. Next generated
 * them on demand.
 *
 * DELIBERATE DIFFERENCE: satori requires real font buffers — it cannot resolve
 * `system-ui`. next/og silently falls back to its bundled Noto Sans, so the
 * live cards are Noto today. These use Geist, the site's actual typeface, so
 * the cards now match the site. Flagged in the migration plan as the one
 * intentional visual change.
 */

/** Design tokens lifted from the Next OG images, unchanged. */
const INK = "#e7e8ea";
const BACKDROP = "#151619";
const ACCENT = "#8fa9c2";

let fontCache: Array<{ name: string; data: Buffer; weight: 400 | 700 }> | null = null;

function decodeDataUri(uri: string): Buffer {
  const comma = uri.indexOf(",");
  return Buffer.from(uri.slice(comma + 1), "base64");
}

/**
 * Fonts are vendored into src/assets/fonts rather than read from the `geist`
 * npm package: that package's `exports` map only exposes Next-specific font
 * modules — even `geist/package.json` is not exported — so there is no
 * supported way to resolve the raw .ttf. Geist is SIL Open Font License;
 * LICENSE.txt sits beside the files.
 *
 * They are imported with Vite's `?inline` rather than read from disk. A path
 * built from `import.meta.url` resolves against the EMITTED chunk, which the
 * build moves to dist/server/.prerender/chunks — the fonts are not copied
 * there, so reading them failed with ENOENT. Inlining makes the bytes travel
 * with the chunk.
 */
async function loadFonts() {
  if (fontCache) return fontCache;
  const [regular, bold] = [decodeDataUri(geistRegular), decodeDataUri(geistBold)];
  fontCache = [
    { name: "Geist", data: regular, weight: 400 as const },
    { name: "Geist", data: bold, weight: 700 as const },
  ];
  return fontCache;
}

/** Shared frame: satori needs explicit `display: flex` on every container. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: BACKDROP,
        color: INK,
        fontFamily: "Geist",
      }}
    >
      {children}
    </div>
  );
}

/** The site-wide card. Ported from src/app/opengraph-image.tsx. */
export function SiteCard() {
  return (
    <Card>
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
        <div style={{ display: "flex", fontSize: 36, color: ACCENT }}>
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
    </Card>
  );
}

/** The per-project card. Ported from src/app/projects/[slug]/opengraph-image.tsx. */
export function ProjectCard({
  title,
  summary,
  stack,
}: {
  title: string;
  summary: string;
  stack: readonly string[];
}) {
  return (
    <Card>
      <div style={{ display: "flex", fontSize: 24, color: ACCENT }}>
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
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.85, lineHeight: 1.4 }}>
          {summary.length > 160 ? summary.slice(0, 160).trimEnd() + "…" : summary}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {stack.slice(0, 5).map((tech) => (
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
    </Card>
  );
}

/** Render a card element to a PNG buffer at the OG standard 1200x630. */
export async function renderCard(element: React.ReactElement): Promise<Buffer> {
  const svg = await satori(element, { ...SIZE, fonts: await loadFonts() });
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: SIZE.width },
  })
    .render()
    .asPng();
  return Buffer.from(png);
}

/** The response shape every OG endpoint returns. */
export function pngResponse(body: Buffer): Response {
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

/**
 * Site favicon / PWA icon. Ported from src/app/icon.tsx and apple-icon.tsx,
 * which used the same satori-backed renderer via next/og. Rendered at whatever
 * size the endpoint asks for — 512 for the PWA icon, 180 for the iOS touch icon.
 */
export function IconCard({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#ffffff",
        fontSize: Math.round(size * 0.47),
        fontWeight: 700,
        letterSpacing: Math.round(size * -0.016),
        borderRadius: "100%",
        fontFamily: "Geist",
      }}
    >
      RK
    </div>
  );
}

/** Render a square icon to PNG at the given edge length. */
export async function renderIcon(size: number): Promise<Buffer> {
  const svg = await satori(IconCard({ size }), {
    width: size,
    height: size,
    fonts: await loadFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } })
    .render()
    .asPng();
  return Buffer.from(png);
}
