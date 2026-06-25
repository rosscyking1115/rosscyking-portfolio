import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

// Display face for headings — shares visual DNA with Space Mono, so the type
// system quietly reads as "measurement". Body stays Geist Sans, data Geist Mono.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { personSchema, websiteSchema } from "@/lib/json-ld";
import { siteConfig } from "@/lib/site-config";
import { getThemeFromCookie } from "@/lib/theme-cookie.server";
import { cn } from "@/lib/utils";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.shortName} — ${siteConfig.titleTagline}`,
    template: `%s — ${siteConfig.shortName}`,
  },
  description: siteConfig.metaDescription,
  applicationName: siteConfig.shortName,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  keywords: [
    "AI Safety",
    "GenAI Evaluation",
    "LLM Evaluation",
    "RAG Evaluation",
    "AI-agent reliability",
    "Red-team testing",
    "Applied AI",
    "Data Science",
    "Python",
    "FastAPI",
    "Streamlit",
    "Docker",
    "GitHub Actions",
    "MSc Artificial Intelligence",
    "University of Sheffield",
    "United Kingdom",
    "London",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteConfig.url,
    siteName: siteConfig.shortName,
    title: `${siteConfig.shortName} — ${siteConfig.titleTagline}`,
    description: siteConfig.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.shortName} — ${siteConfig.titleTagline}`,
    description: siteConfig.metaDescription,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafb" },
    { media: "(prefers-color-scheme: dark)", color: "#151619" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieTheme = await getThemeFromCookie();
  const isDark = cookieTheme === "dark";

  return (
    <html
      lang="en"
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        spaceGrotesk.variable,
        isDark ? "dark" : "",
      )}
      data-scroll-behavior="smooth"
      style={{ colorScheme: isDark ? "dark" : "light" }}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        {/* JSON-LD structured data — invisible to users, indexed by search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema()) }}
        />

        <ThemeProvider initialTheme={cookieTheme}>
          <a href="#main" className="skip-to-content">
            Skip to content
          </a>
          <Nav />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster position="top-right" richColors closeButton />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
