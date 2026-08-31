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
  CalendarClock,
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
  { id: "schedules", label: "Go to Schedules", href: "/schedules", icon: CalendarClock },
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
  canEdit = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [endpoints, setEndpoints] = React.useState<PaletteEndpoint[] | null>(
    null
  );
  const [endpointsError, setEndpointsError] = React.useState(false);
  // In-flight guard lives in a ref, not state: it only gates the fetch and
  // must not trigger a render (setting it synchronously in the effect would
  // cascade a render before the request even starts).
  const inFlight = React.useRef(false);

  React.useEffect(() => {
    if (!open || endpoints !== null || inFlight.current) return;
    inFlight.current = true;

    void fetch("/api/workspace/endpoints")
      .then(async (r) => {
        if (!r.ok) throw new Error("failed");
        return r.json() as Promise<{ endpoints?: PaletteEndpoint[] }>;
      })
      .then((data) => {
        setEndpoints(data.endpoints ?? []);
        setEndpointsError(false);
      })
      .catch(() => {
        setEndpoints([]);
        setEndpointsError(true);
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [open, endpoints]);

  // Derived, not stored: "loading" is simply "opened but nothing has arrived".
  const loadingEndpoints = open && endpoints === null;
  const endpointList = endpoints ?? [];

  const run = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to endpoint, run action…" />
      <CommandList>
        <CommandEmpty>
          {loadingEndpoints
            ? "Loading…"
            : endpointsError
              ? "Couldn’t load endpoints"
              : "No results"}
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
        {canEdit ? (
          <>
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
          </>
        ) : null}
        {endpointList.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Endpoints">
              {endpointList.map((ep) => (
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
