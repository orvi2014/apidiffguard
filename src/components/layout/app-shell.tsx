"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarClock,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Settings,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CommandPalette,
  useCommandPaletteHotkeyHint,
} from "@/components/layout/command-palette";
import { signOut } from "@/app/actions/auth";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/endpoints", label: "Endpoints", icon: Webhook },
  { href: "/diff/latest", label: "Diffs", icon: GitCompare },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/schedules", label: "Schedules", icon: CalendarClock },
];

export function AppShell({
  children,
  workspaceName,
  workspaceSlug,
  email,
  checksToday,
  endpoints,
}: {
  children: React.ReactNode;
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  checksToday: number;
  endpoints: Array<{ id: string; name: string }>;
}) {
  const pathname = usePathname();
  const search = useCommandPaletteHotkeyHint();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="z-30 flex h-12 shrink-0 items-center gap-1 border-b border-border bg-surface px-2 sm:px-3">
        <Link
          href="/dashboard"
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
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/diff/latest" &&
                pathname.startsWith(item.href)) ||
              (item.href.includes("/diff/") && pathname.startsWith("/diff"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer sm:h-8",
                  active
                    ? "bg-surface-elevated text-foreground"
                    : "text-muted hover:text-foreground hover:bg-surface-elevated/60"
                )}
              >
                <Icon className="size-3.5 opacity-70" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {search}
          <Link
            href="/endpoints/new"
            className="hidden h-8 items-center rounded-md border border-border bg-surface-elevated px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-[#1f1f23] md:inline-flex"
          >
            New endpoint
          </Link>
          <Link
            href="/settings"
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
          <div className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted">
            <span className="size-5 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800" />
            <span className="hidden max-w-[120px] truncate sm:inline">
              {workspaceName}
            </span>
          </div>
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

      <main className="min-h-0 flex-1 overflow-auto">{children}</main>

      <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-border bg-surface px-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          Connected
        </span>
        <span className="text-border">|</span>
        <span>Workspace · {workspaceSlug}</span>
        <span className="ml-auto font-mono tabular-nums">
          {checksToday} checks today
        </span>
      </footer>

      <CommandPalette endpoints={endpoints} />
    </div>
  );
}
