import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>

      <h1 className="mt-3 text-2xl font-semibold text-foreground">
        We couldn&apos;t find that page
      </h1>

      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The link may be outdated, or the endpoint or diff it pointed to has been
        deleted.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/docs">Read the docs</Link>
        </Button>
      </div>
    </div>
  );
}
