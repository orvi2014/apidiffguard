import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-6 items-center justify-center rounded-[5px] bg-accent text-[11px] font-bold text-white">
            A
          </span>
          APIDiffGuard
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href="/#features" className="hover:text-foreground transition-colors">
            Product
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/tools" className="hover:text-foreground transition-colors">
            Tools
          </Link>
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden px-3 py-1.5 text-sm text-muted hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link href="/register">
            <Button size="sm">Start free</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-5 items-center justify-center rounded-[4px] bg-accent text-[10px] font-bold text-white">
              A
            </span>
            APIDiffGuard
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} APIDiffGuard</span>
          <div className="flex gap-4">
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
