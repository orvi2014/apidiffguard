"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLinkStatus } from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function NavLinkContent({
  label,
  icon: Icon,
  active,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  const highlighted = active || pending;

  return (
    <span
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors sm:h-8",
        highlighted
          ? "bg-surface-elevated text-foreground"
          : "text-muted group-hover:text-foreground group-hover:bg-surface-elevated/60"
      )}
    >
      <Icon
        className={cn("size-3.5 opacity-70", pending && "animate-pulse")}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function ConsoleNavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/dashboard" &&
      href !== "/diffs" &&
      pathname.startsWith(href)) ||
    (href === "/diffs" &&
      (pathname.startsWith("/diffs") || pathname.startsWith("/diff")));

  // On a phone the nav scrolls. Landing on Schedules with the row scrolled to
  // Overview hid the one item that says where you are.
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  return (
    <Link
      ref={ref}
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      className="group cursor-pointer"
    >
      <NavLinkContent label={label} icon={icon} active={active} />
    </Link>
  );
}
