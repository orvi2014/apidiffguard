"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Visual filter bar — filtering is client-enhanced later; search uses URL in a follow-up. */
export function EndpointsToolbar() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter by name, URL, tag…"
          className="h-8 pl-8"
          disabled
          title="Coming soon — use browser find for now"
        />
      </div>
    </div>
  );
}
