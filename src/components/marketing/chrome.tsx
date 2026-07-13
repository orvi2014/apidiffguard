import Link from "next/link";
import { cookies } from "next/headers";
import { BrandLogo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { MarketingHeaderClient } from "@/components/marketing/header-client";

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

export async function MarketingHeader() {
  const jar = await cookies();
  if (!hasAuthCookie(jar)) {
    return <MarketingHeaderClient signedIn={false} email={null} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <MarketingHeaderClient signedIn={!!user} email={user?.email ?? null} />;
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
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted">
              {col.title}
            </h4>
            <ul className="mt-3 space-y-2">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted hover:text-foreground transition-colors"
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
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/llms.txt" className="hover:text-foreground">
              llms.txt
            </Link>
            <Link href="/llms-full.txt" className="hover:text-foreground">
              llms-full.txt
            </Link>
            <span className="font-mono">v0.1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
