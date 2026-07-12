"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  FileJson,
  GitCompare,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Webhook,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";

type PaletteEndpoint = { id: string; name: string };

const navCommands = [
  { id: "dashboard", label: "Go to Overview", href: "/dashboard", icon: LayoutDashboard },
  { id: "endpoints", label: "Go to Endpoints", href: "/endpoints", icon: Webhook },
  { id: "alerts", label: "Go to Alerts", href: "/alerts", icon: Bell },
  { id: "schedules", label: "Go to Schedules", href: "/schedules", icon: Settings },
  { id: "diff", label: "Open latest diff", href: "/diff/latest", icon: GitCompare },
  { id: "settings", label: "Workspace settings", href: "/settings", icon: Settings },
];

const actionCommands = [
  { id: "new-endpoint", label: "Create endpoint", href: "/endpoints/new", icon: Plus },
  { id: "import", label: "Import OpenAPI", href: "/endpoints/import", icon: FileJson },
];

export function CommandPalette({
  endpoints = [],
}: {
  endpoints?: PaletteEndpoint[];
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to endpoint, run action…" />
      <CommandList>
        <CommandEmpty>No results</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={cmd.label}
              onSelect={() => run(cmd.href)}
            >
              <cmd.icon />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {actionCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={cmd.label}
              onSelect={() => run(cmd.href)}
            >
              <cmd.icon />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {endpoints.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Endpoints">
              {endpoints.map((e) => (
                <CommandItem
                  key={e.id}
                  value={e.name}
                  onSelect={() => run(`/endpoints/${e.id}`)}
                >
                  <Webhook />
                  <span>{e.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPaletteHotkeyHint() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      }}
      className="hidden items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-[#3f3f46] hover:text-foreground sm:inline-flex cursor-pointer"
    >
      <Search className="size-3.5" />
      <span>Search…</span>
      <Kbd className="ml-2">⌘K</Kbd>
    </button>
  );
}
