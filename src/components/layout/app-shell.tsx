"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarClock,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPaletteTrigger } from "@/components/layout/command-palette";
import { ConsoleNavLink } from "@/components/layout/console-nav-link";
import { signOut } from "@/app/actions/auth";

const CommandPalette = dynamic(
  () =>
    import("@/components/layout/command-palette").then((m) => m.CommandPalette),
  { ssr: false }
);

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/endpoints", label: "Endpoints", icon: Webhook },
  { href: "/diffs", label: "Diffs", icon: GitCompare },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/schedules", label: "Schedules", icon: CalendarClock },
];

export function AppShell({
  children,
  workspaceName,
  workspaceSlug,
  email,
  canEdit = true,
  checksTodaySlot,
}: {
  children: React.ReactNode;
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  canEdit?: boolean;
  checksTodaySlot: React.ReactNode;
}) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface-elevated focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <header className="z-30 flex h-12 shrink-0 items-center gap-1 border-b border-border bg-surface px-2 sm:px-3">
        <Link
          href="/dashboard"
          prefetch
          className="mr-2 flex items-center gap-2 px-2 py-1.5 text-sm font-semibold tracking-tight"
        >
          <span className="flex size-5 items-center justify-center rounded-[4px] bg-accent text-[10px] font-bold text-white">
            A
          </span>
          <span className="hidden sm:inline">APIDiffGuard</span>
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Console"
        >
          {nav.map((item) => (
            <ConsoleNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-elevated hover:text-foreground sm:hidden"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
          <CommandPaletteTrigger onOpen={() => setPaletteOpen(true)} />
          {canEdit ? (
            <>
              <Link
                href="/endpoints/new"
                prefetch
                className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface-elevated text-foreground transition-colors hover:bg-[#1f1f23] md:hidden"
                aria-label="New endpoint"
              >
                <Plus className="size-4" />
              </Link>
              <Link
                href="/endpoints/new"
                prefetch
                className="hidden h-8 items-center rounded-md border border-border bg-surface-elevated px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-[#1f1f23] md:inline-flex"
              >
                New endpoint
              </Link>
            </>
          ) : null}
          <Link
            href="/settings"
            prefetch
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md transition-colors cursor-pointer",
              pathname.startsWith("/settings")
                ? "bg-surface-elevated text-foreground"
                : "text-muted hover:text-foreground hover:bg-surface-elevated"
            )}
            aria-label="Settings"
          >
            <Settings className="size-4" />
          </Link>
          <Link
            href="/settings/workspace"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-[#3f3f46] hover:text-foreground"
            title="Workspace settings"
          >
            <span className="size-5 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800" />
            <span className="hidden max-w-[120px] truncate sm:inline">
              {workspaceName}
            </span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-elevated hover:text-foreground cursor-pointer"
              aria-label="Sign out"
              title={email}
            >
              <LogOut className="size-3.5" />
            </button>
          </form>
        </div>
      </header>

      <main id="main" className="min-h-0 flex-1 overflow-auto">
        {children}
      </main>

      <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-border bg-surface px-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          Signed in
        </span>
        <span className="text-border">|</span>
        <span>Workspace · {workspaceSlug}</span>
        {checksTodaySlot}
      </footer>

      {paletteOpen ? (
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          canEdit={canEdit}
        />
      ) : null}
    </div>
  );
}
