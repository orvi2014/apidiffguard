"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { EndpointRow } from "@/components/domain/endpoint-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Endpoint } from "@/lib/types";

export function EndpointsList({ endpoints }: { endpoints: Endpoint[] }) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!q) return endpoints;
    return endpoints.filter((e) => {
      const hay = [e.name, e.url, e.environment, e.method, ...(e.tags ?? [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [endpoints, q]);

  return (
    <>
      <div className="border-b border-border px-5 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, URL, tag…"
              className="h-8 pl-8"
              aria-label="Filter endpoints"
            />
          </div>
          {q ? (
            <span className="text-xs text-muted">
              {filtered.length} of {endpoints.length}
            </span>
          ) : null}
        </div>
      </div>

      <div className="hidden border-b border-border-subtle px-4 py-2 text-[11px] uppercase tracking-wider text-muted sm:grid sm:grid-cols-[72px_1fr_120px_100px_88px] sm:gap-x-4">
        <span>Method</span>
        <span>Endpoint</span>
        <span className="text-right">Env</span>
        <span className="text-right">Latency</span>
        <span className="text-right">Checked</span>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-muted">
              {q ? "No endpoints match that filter." : "No endpoints yet."}
            </p>
            {!q ? (
              <div className="mt-4 flex justify-center gap-2">
                <Link href="/endpoints/import">
                  <Button size="sm" variant="secondary">
                    Import OpenAPI
                  </Button>
                </Link>
                <Link href="/endpoints/new">
                  <Button size="sm">Create endpoint</Button>
                </Link>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="mt-4"
                onClick={() => setQuery("")}
              >
                Clear filter
              </Button>
            )}
          </div>
        ) : (
          filtered.map((e) => <EndpointRow key={e.id} endpoint={e} />)
        )}
      </div>
    </>
  );
}
