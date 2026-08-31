import Link from "next/link";
import { MethodBadge, HealthBadge } from "@/components/domain/badges";
import type { Endpoint } from "@/lib/types";
import { cn, formatMs, formatRelativeTime, pluralize } from "@/lib/utils";

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
          <HealthBadge status={endpoint.health} />
        </div>
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-xs text-muted">
            {endpoint.url}
          </span>
          {/* The triage signal the dashboard card already showed. Without it
              the main endpoints table could not answer "how bad is it"
              without opening each row. */}
          {endpoint.breakingCount ? (
            <span className="shrink-0 font-mono text-xs tabular-nums text-danger">
              {endpoint.breakingCount} breaking
            </span>
          ) : endpoint.warningCount ? (
            <span className="shrink-0 font-mono text-xs tabular-nums text-warning">
              {endpoint.warningCount} warning
            </span>
          ) : null}
        </div>
      </div>
      <div className="hidden text-right text-xs text-muted sm:block">
        {endpoint.environment}
      </div>
      <div className="hidden text-right font-mono text-xs tabular-nums text-muted sm:block">
        {endpoint.responseTime != null ? formatMs(endpoint.responseTime) : "—"}
      </div>
      <div className="text-right text-xs tabular-nums text-muted-foreground">
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
          <p className="truncate font-mono text-xs text-muted">
            {endpoint.url}
          </p>
        </div>
        <HealthBadge status={endpoint.health} />
      </div>
      {(endpoint.breakingCount || endpoint.warningCount) ? (
        <div className="mt-3 flex gap-3 text-xs">
          {endpoint.breakingCount ? (
            <span className="text-danger">
              {pluralize(endpoint.breakingCount, "breaking change")}
            </span>
          ) : null}
          {endpoint.warningCount ? (
            <span className="text-warning">
              {pluralize(endpoint.warningCount, "warning")}
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
