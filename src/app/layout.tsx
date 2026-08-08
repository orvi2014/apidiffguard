import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  organizationJsonLd,
  softwareJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import "./globals.css";

// Weights are trimmed to what the UI actually uses: font-medium (500) and
// font-semibold (600) appear throughout, 700 is never referenced. Mono only
// renders at 400 and 600.
const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Catch breaking API changes before production`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "API monitoring",
    "breaking API changes",
    "schema drift",
    "JSON diff",
    "OpenAPI monitoring",
    "API contract testing",
    "CI API checks",
  ],
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // No root `alternates.canonical`: it is inherited by every route that does
  // not call buildMetadata(), which would point them all at the homepage.
  // Pages set their own canonical.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Catch breaking API changes before production`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Catch breaking API changes before production`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Catch breaking API changes before production`,
    description: DEFAULT_DESCRIPTION,
    images: ["/twitter-image"],
  },
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  // Site verification is emitted only when the codes are actually configured —
  // an empty object renders nothing and just invites a half-filled block.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
            ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
            : {}),
          ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
            ? {
                other: {
                  "msvalidate.01":
                    process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
                },
              }
            : {}),
        },
      }
    : {}),
};

// The manifest declares theme_color but the document never emitted the tag,
// so mobile browsers painted the default chrome colour.
export const viewport: Viewport = {
  // Matches manifest.ts theme_color.
  themeColor: "#4F7FFF",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Dark-only by design: globals.css defines a single palette on `:root, .dark`
    // and pins `color-scheme: dark`. Nothing mutates this at runtime, so there is
    // no hydration mismatch to suppress.
    <html
      lang="en"
      className={cn("dark h-full antialiased", sans.variable, mono.variable)}
    >
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), softwareJsonLd()]} />
        <TooltipProvider>
          {children}
          <Toaster richColors theme="dark" position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
