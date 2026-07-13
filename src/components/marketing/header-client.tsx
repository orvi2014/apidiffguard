"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/#features", label: "Product" },
  { href: "/about", label: "About" },
  { href: "/tools", label: "Tools" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function MarketingHeaderClient({
  signedIn,
  email,
}: {
  signedIn: boolean;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <BrandLogo withWordmark size={24} priority />
        </Link>

        <nav
          className="hidden items-center gap-6 text-sm text-muted md:flex"
          aria-label="Primary"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <>
              <span className="hidden max-w-[140px] truncate text-xs text-muted lg:inline">
                {email}
              </span>
              <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
                <Link href="/settings/billing">Billing</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden px-3 py-1.5 text-sm text-muted hover:text-foreground sm:inline"
              >
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/register">Start free</Link>
              </Button>
            </>
          )}

          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-border px-4 py-3 md:hidden"
          aria-label="Mobile"
        >
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-md px-3 py-2.5 text-sm text-muted hover:bg-surface hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {signedIn ? (
              <>
                <li>
                  <Link
                    href="/settings/billing"
                    className="block rounded-md px-3 py-2.5 text-sm text-muted hover:bg-surface hover:text-foreground"
                    onClick={() => setOpen(false)}
                  >
                    Billing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/login"
                  className="block rounded-md px-3 py-2.5 text-sm text-muted hover:bg-surface hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
              </li>
            )}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
