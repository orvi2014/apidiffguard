"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/settings", label: "General", exact: true },
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/tokens", label: "API tokens" },
  { href: "/settings/profile", label: "Profile" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mt-4 flex gap-1 overflow-x-auto pb-1 md:flex-col md:pb-0"
      aria-label="Settings"
    >
      {sections.map((s) => {
        const active = s.exact
          ? pathname === s.href
          : pathname === s.href || pathname.startsWith(`${s.href}/`);
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-surface text-foreground"
                : "text-muted hover:bg-surface hover:text-foreground"
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
