import type { Metadata, Viewport } from "next";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { siteConfig } from "@/lib/site-config";
import { getThemeFromCookie } from "@/lib/theme-cookie.server";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.shortName} — ${siteConfig.role}`,
    template: `%s — ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteConfig.url,
    siteName: siteConfig.shortName,
    title: `${siteConfig.shortName} — ${siteConfig.role}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.shortName} — ${siteConfig.role}`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Cookie is the only source of truth the server has access to.
  // - "dark"   → render with .dark class. No FOUC on reload.
  // - "light"  → render without .dark class. No FOUC on reload.
  // - "system" → no class server-side; ThemeProvider applies the resolved
  //              system preference on hydration.
  const cookieTheme = await getThemeFromCookie();
  const htmlClassName = cookieTheme === "dark" ? "dark" : "";

  return (
    <html
      lang="en"
      className={htmlClassName}
      data-scroll-behavior="smooth"
      style={{ colorScheme: cookieTheme === "dark" ? "dark" : "light" }}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <ThemeProvider initialTheme={cookieTheme}>
          <a href="#main" className="skip-to-content">
            Skip to content
          </a>
          <Nav />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
