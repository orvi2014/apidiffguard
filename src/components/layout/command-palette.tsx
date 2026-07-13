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
  { id: "diffs", label: "Go to Diffs", href: "/diffs", icon: GitCompare },
  { id: "diff", label: "Open latest diff", href: "/diff/latest", icon: GitCompare },
  { id: "settings", label: "Workspace settings", href: "/settings", icon: Settings },
];

const actionCommands = [
  { id: "new-endpoint", label: "Create endpoint", href: "/endpoints/new", icon: Plus },
  { id: "import", label: "Import OpenAPI", href: "/endpoints/import", icon: FileJson },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [endpoints, setEndpoints] = React.useState<PaletteEndpoint[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = React.useState(false);

  React.useEffect(() => {
    if (!open || endpoints.length > 0 || loadingEndpoints) return;
    setLoadingEndpoints(true);
    void fetch("/api/workspace/endpoints")
      .then((r) => (r.ok ? r.json() : { endpoints: [] }))
      .then((data: { endpoints?: PaletteEndpoint[] }) => {
        setEndpoints(data.endpoints ?? []);
      })
      .catch(() => setEndpoints([]))
      .finally(() => setLoadingEndpoints(false));
  }, [open, endpoints.length, loadingEndpoints]);

  const run = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to endpoint, run action…" />
      <CommandList>
        <CommandEmpty>
          {loadingEndpoints ? "Loading…" : "No results"}
        </CommandEmpty>
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
              {endpoints.map((ep) => (
                <CommandItem
                  key={ep.id}
                  value={ep.name}
                  onSelect={() => run(`/endpoints/${ep.id}`)}
                >
                  <Webhook />
                  <span>{ep.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

export function CommandPaletteTrigger({
  onOpen,
}: {
  onOpen: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);

  return (
    <button
      type="button"
      aria-label="Search"
      onClick={onOpen}
      className="hidden items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-[#3f3f46] hover:text-foreground sm:inline-flex cursor-pointer"
    >
      <Search className="size-3.5" aria-hidden />
      <span>Search…</span>
      <Kbd className="ml-2">⌘K</Kbd>
    </button>
  );
}
