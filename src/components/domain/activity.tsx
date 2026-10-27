import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  GitCompare,
  Plus,
  Shield,
  UserPlus,
} from "lucide-react";
import type { ActivityItem } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const icons: Record<ActivityItem["type"], ReactNode> = {
  baseline_created: <Shield className="size-3.5" />,
  endpoint_added: <Plus className="size-3.5" />,
  diff_detected: <GitCompare className="size-3.5" />,
  alert_sent: <Bell className="size-3.5" />,
  baseline_accepted: <CheckCircle2 className="size-3.5" />,
  check_run: <Activity className="size-3.5" />,
  member_invited: <UserPlus className="size-3.5" />,
  workspace_created: <Shield className="size-3.5" />,
};

/* Every non-grey in this system is a reading. Only two events are readings:
   a check that found breaking changes (the runner writes `diff_detected` only
   then), and a baseline accepted back to matching. Adding an endpoint is not
   "healthy", and inviting someone is not "scanning" — those stay grey. */
const tones: Record<ActivityItem["type"], string> = {
  baseline_created: "text-muted",
  endpoint_added: "text-muted",
  diff_detected: "text-danger",
  alert_sent: "text-muted",
  baseline_accepted: "text-success",
  check_run: "text-muted",
  member_invited: "text-muted",
  workspace_created: "text-muted",
};

export function ActivityFeed({
  items,
  className,
}: {
  items: ActivityItem[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-0", className)}>
      {items.map((item) => {
        const content = (
          <div className="flex gap-3 px-1 py-3">
            <div
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface",
                tones[item.type]
              )}
            >
              {icons[item.type]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm text-foreground">{item.title}</p>
                <time className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatRelativeTime(item.createdAt)}
                </time>
              </div>
              {item.description ? (
                <p className="mt-0.5 truncate text-xs text-muted">
                  {item.description}
                </p>
              ) : null}
            </div>
          </div>
        );

        return (
          <li
            key={item.id}
            className="border-b border-border-subtle last:border-0"
          >
            {item.href ? (
              <Link
                href={item.href}
                className="block transition-colors hover:bg-surface cursor-pointer"
              >
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Timeline({
  items,
}: {
  items: { id: string; title: string; meta?: string; at: string; tone?: "danger" | "warning" | "success" | "default" }[];
}) {
  return (
    <ol className="relative space-y-0 pl-6">
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
      {items.map((item) => (
        <li key={item.id} className="relative py-3">
          <span
            className={cn(
              "absolute left-[-19px] top-4 size-2 rounded-full border-2 border-background",
              item.tone === "danger" && "bg-danger",
              item.tone === "warning" && "bg-warning",
              item.tone === "success" && "bg-success",
              (!item.tone || item.tone === "default") && "bg-muted-foreground"
            )}
          />
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm">{item.title}</p>
            <time className="text-xs text-muted-foreground">
              {formatRelativeTime(item.at)}
            </time>
          </div>
          {item.meta ? (
            <p className="mt-0.5 text-xs text-muted">{item.meta}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-10 items-center justify-center rounded-md border border-border text-muted">
        {icon ?? <AlertTriangle className="size-4" />}
      </div>
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-xs text-muted leading-relaxed">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function MetricStrip({
  items,
}: {
  items: { label: string; value: string | number; tone?: string }[];
}) {
  return (
    /* Borders per cell rather than `divide-x`: in the two-column phone grid,
       divide-x drew a rule down the left edge of the second row and none
       between the rows. */
    <div className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-border px-4 py-4 even:border-l max-sm:[&:nth-child(-n+2)]:border-b sm:px-5 sm:[&:not(:first-child)]:border-l"
        >
          <div
            className={cn(
              "font-mono text-2xl font-semibold tabular-nums tracking-tight",
              item.tone
            )}
          >
            {item.value}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A single line of counts for a page header. MetricStrip gives each number a
 * tile; this is for pages where the counts are context for a list, not the
 * point of the page.
 */
export function MetricReadout({
  items,
}: {
  items: { label: string; value: string | number; tone?: string }[];
}) {
  return (
    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <dt className="order-2 text-xs text-muted">{item.label}</dt>
          <dd
            className={cn(
              "order-1 font-mono text-base font-medium tabular-nums",
              item.tone
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
