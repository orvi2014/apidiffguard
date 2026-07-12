import { cn } from "@/lib/utils";
import type { HealthStatus, HttpMethod, Severity } from "@/lib/types";

const healthConfig: Record<
  HealthStatus,
  { label: string; className: string; dot: string }
> = {
  healthy: {
    label: "Healthy",
    className: "text-success bg-success-muted",
    dot: "bg-success",
  },
  warning: {
    label: "Warning",
    className: "text-warning bg-warning-muted",
    dot: "bg-warning",
  },
  breaking: {
    label: "Breaking",
    className: "text-danger bg-danger-muted",
    dot: "bg-danger",
  },
  unknown: {
    label: "Unknown",
    className: "text-muted bg-surface-elevated",
    dot: "bg-muted-foreground",
  },
  checking: {
    label: "Checking",
    className: "text-info bg-[rgba(56,189,248,0.12)]",
    dot: "bg-info animate-pulse-dot",
  },
};

export function HealthBadge({
  status,
  className,
}: {
  status: HealthStatus;
  className?: string;
}) {
  const config = healthConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide",
        config.className,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

const severityConfig: Record<
  Severity,
  { label: string; className: string }
> = {
  info: {
    label: "Info",
    className: "text-info bg-[rgba(56,189,248,0.12)]",
  },
  warning: {
    label: "Warning",
    className: "text-warning bg-warning-muted",
  },
  breaking: {
    label: "Breaking",
    className: "text-danger bg-danger-muted",
  },
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const config = severityConfig[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

const methodColors: Record<HttpMethod, string> = {
  GET: "text-[#4ade80]",
  POST: "text-[#60a5fa]",
  PUT: "text-[#fbbf24]",
  PATCH: "text-[#c084fc]",
  DELETE: "text-[#f87171]",
  HEAD: "text-muted",
  OPTIONS: "text-muted",
};

export function MethodBadge({
  method,
  className,
}: {
  method: HttpMethod;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[11px] font-semibold tracking-wider",
        methodColors[method],
        className
      )}
    >
      {method}
    </span>
  );
}
