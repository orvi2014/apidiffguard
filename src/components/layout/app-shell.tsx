"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CreditCard,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/logo";
import { CommandPaletteTrigger } from "@/components/layout/command-palette";
import { ConsoleNavLink } from "@/components/layout/console-nav-link";
import { signOut } from "@/app/actions/auth";
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/components/layout/workspace-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** First letter of the signed-in address, for the account avatar. */
function accountInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "?";
}

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
  workspaceId,
  workspaces = [],
  email,
  canEdit = true,
  checksTodaySlot,
}: {
  children: React.ReactNode;
  workspaceName: string;
  workspaceSlug: string;
  workspaceId: string;
  workspaces?: WorkspaceOption[];
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
          <BrandLogo size={20} />
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
          <WorkspaceSwitcher
            workspaceName={workspaceName}
            workspaceId={workspaceId}
            workspaces={workspaces}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-elevated hover:text-foreground cursor-pointer"
                aria-label="Account menu"
              >
                <span
                  aria-hidden
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 text-xs font-semibold leading-none text-foreground"
                >
                  {accountInitial(email)}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block text-xs text-muted">Signed in as</span>
                <span className="block truncate text-sm text-foreground">
                  {email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <User className="size-3.5" aria-hidden />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/workspace">
                  <Settings className="size-3.5" aria-hidden />
                  Workspace settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing">
                  <CreditCard className="size-3.5" aria-hidden />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action={signOut} className="w-full">
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2 text-left"
                  >
                    <LogOut className="size-3.5" aria-hidden />
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main id="main" className="min-h-0 flex-1 overflow-auto">
        {children}
      </main>

      <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-border bg-surface px-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          Signed in
        </span>
        {/* A drawn rule rather than a pipe character. As text it computed
            1.27:1, and no colour fixes that without making a separator look
            like content — a separator is a line, so it is drawn as one. */}
        <span aria-hidden className="h-3 w-px bg-border" />
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
