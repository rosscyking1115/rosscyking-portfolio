import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export const runtime = "nodejs";

/**
 * Generated favicon: monochrome "RK" letterform on a circle.
 * Renders at request time and gets cached by Vercel's CDN.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#ffffff",
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: -0.5,
        borderRadius: "100%",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      RK
    </div>,
    { ...size },
  );
}
