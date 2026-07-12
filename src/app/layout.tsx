import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "APIDiffGuard — Catch breaking API changes before production",
    template: "%s · APIDiffGuard",
  },
  description:
    "Monitor API responses, detect schema drift, compare versions, and alert developers before integrations break.",
  metadataBase: new URL("https://apidiffguard.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark h-full antialiased", sans.variable, mono.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <RootProvider
          theme={{
            enabled: false,
            defaultTheme: "dark",
          }}
        >
          <TooltipProvider>
            {children}
            <Toaster richColors theme="dark" position="bottom-right" />
          </TooltipProvider>
        </RootProvider>
      </body>
    </html>
  );
}
