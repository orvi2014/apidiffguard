import Link from "next/link";
import { MethodBadge, HealthBadge } from "@/components/domain/badges";
import type { Endpoint } from "@/lib/types";
import { cn, formatMs, formatRelativeTime } from "@/lib/utils";

export function EndpointRow({
  endpoint,
  className,
}: {
  endpoint: Endpoint;
  className?: string;
}) {
  return (
    <Link
      href={`/endpoints/${endpoint.id}`}
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 border-b border-border-subtle px-4 py-3 transition-colors duration-150 hover:bg-surface cursor-pointer sm:grid-cols-[72px_1fr_120px_100px_88px]",
        className
      )}
    >
      <MethodBadge method={endpoint.method} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground group-hover:text-accent transition-colors">
            {endpoint.name}
          </span>
          <HealthBadge status={endpoint.health} className="hidden sm:inline-flex" />
        </div>
        <div className="truncate font-mono text-[11px] text-muted">
          {endpoint.url}
        </div>
      </div>
      <div className="hidden text-right text-xs text-muted sm:block">
        {endpoint.environment}
      </div>
      <div className="hidden text-right font-mono text-xs tabular-nums text-muted sm:block">
        {endpoint.responseTime != null ? formatMs(endpoint.responseTime) : "—"}
      </div>
      <div className="text-right text-xs text-muted-foreground">
        {endpoint.lastCheckedAt
          ? formatRelativeTime(endpoint.lastCheckedAt)
          : "—"}
      </div>
    </Link>
  );
}

export function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <Link
      href={`/endpoints/${endpoint.id}`}
      className="block border-b border-border-subtle px-4 py-4 transition-colors hover:bg-surface cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5">
            <MethodBadge method={endpoint.method} />
            <span className="truncate text-sm font-medium">{endpoint.name}</span>
          </div>
          <p className="truncate font-mono text-[11px] text-muted">
            {endpoint.url}
          </p>
        </div>
        <HealthBadge status={endpoint.health} />
      </div>
      {(endpoint.breakingCount || endpoint.warningCount) ? (
        <div className="mt-3 flex gap-3 text-xs">
          {endpoint.breakingCount ? (
            <span className="text-danger">
              {endpoint.breakingCount} breaking
            </span>
          ) : null}
          {endpoint.warningCount ? (
            <span className="text-warning">
              {endpoint.warningCount} warnings
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
