import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const runtime = "nodejs";

/**
 * Apple touch icon for iOS home-screen and Safari pinned tabs.
 * Uses a rounded square with subtle inset, the iOS-native look.
 */
export default function AppleIcon() {
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
        fontSize: 86,
        fontWeight: 700,
        letterSpacing: -2,
        borderRadius: 38,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      RK
    </div>,
    { ...size },
  );
}
