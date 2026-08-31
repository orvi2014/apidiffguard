import { Suspense, cache } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { BrandLogo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { MarketingHeaderClient } from "@/components/marketing/header-client";
import { APP_VERSION } from "@/lib/seo";

function hasAuthCookie(
  jar: Awaited<ReturnType<typeof cookies>>
): boolean {
  return jar
    .getAll()
    .some(
      (c) =>
        c.name.includes("auth-token") ||
        (c.name.startsWith("sb-") && c.name.includes("auth"))
    );
}

/** Deduped per request — several marketing surfaces ask for the same viewer. */
const getMarketingViewer = cache(async () => {
  const jar = await cookies();
  if (!hasAuthCookie(jar)) return { signedIn: false, email: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { signedIn: !!user, email: user?.email ?? null };
});

async function MarketingHeaderAuth() {
  const viewer = await getMarketingViewer();
  return (
    <MarketingHeaderClient signedIn={viewer.signedIn} email={viewer.email} />
  );
}

export function MarketingHeader() {
  // Streamed behind Suspense so the Supabase round-trip a signed-in visitor
  // pays never blocks first byte on an otherwise static marketing page. The
  // signed-out header is the fallback, which is also the common case.
  return (
    <Suspense fallback={<MarketingHeaderClient signedIn={false} email={null} />}>
      <MarketingHeaderAuth />
    </Suspense>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-5 sm:py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <BrandLogo withWordmark size={20} />
          </div>
          <p className="max-w-xs text-sm text-muted leading-relaxed">
            Catch breaking API changes before production.
          </p>
        </div>
        {[
          {
            title: "Product",
            links: [
              ["Features", "/#features"],
              ["Pricing", "/pricing"],
              ["Free tools", "/tools"],
              ["Blog", "/blog"],
            ],
          },
          {
            title: "Developers",
            links: [
              ["Documentation", "/docs"],
              ["CLI", "/docs/cli"],
              ["JSON Diff", "/tools/json-diff"],
              ["GitHub", "https://github.com/orvi2014/apidiffguard"],
            ],
          },
          {
            title: "Company",
            links: [
              ["About", "/about"],
              ["Changelog", "/changelog"],
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            {/* h3, not h4: the nearest preceding heading is an h2, and jumping
                a level breaks the document outline for screen readers. */}
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
              {col.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-6 items-center py-1 text-sm text-muted hover:text-foreground transition-colors pointer-coarse:min-h-11"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:px-5">
          <span>© {new Date().getFullYear()} APIDiffGuard</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="inline-flex min-h-6 items-center py-1 hover:text-foreground pointer-coarse:min-h-11">
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex min-h-6 items-center py-1 hover:text-foreground pointer-coarse:min-h-11">
              Terms
            </Link>
            <Link href="/llms.txt" className="inline-flex min-h-6 items-center py-1 hover:text-foreground pointer-coarse:min-h-11">
              llms.txt
            </Link>
            <Link href="/llms-full.txt" className="inline-flex min-h-6 items-center py-1 hover:text-foreground pointer-coarse:min-h-11">
              llms-full.txt
            </Link>
            <span className="font-mono">v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
