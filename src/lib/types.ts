export type HealthStatus =
  | "healthy"
  | "warning"
  | "breaking"
  | "unknown"
  | "checking";

export type Severity = "info" | "warning" | "breaking";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type AuthType =
  | "none"
  | "bearer"
  | "api_key"
  | "basic"
  | "oauth"
  | "custom";

export type DiffChangeType =
  | "added"
  | "removed"
  | "changed"
  | "type_changed"
  | "nullability_changed"
  | "status_changed"
  | "header_changed"
  | "contract_violation";

/** How endpoint checks classify body drift. */
export type DiffMode = "schema" | "full";

export interface Endpoint {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  environment: string;
  tags: string[];
  description?: string;
  health: HealthStatus;
  authType: AuthType;
  /** schema = ignore leaf values; full = include value changes */
  diffMode?: DiffMode;
  lastCheckedAt?: string;
  responseTime?: number;
  baselineVersion?: number;
  breakingCount?: number;
  warningCount?: number;
}

export interface Baseline {
  id: string;
  version: number;
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
  contentSize: number;
  notes?: string;
  approved: boolean;
  isActive: boolean;
  createdAt: string;
  endpointId: string;
}

export interface DiffChange {
  id: string;
  path: string;
  type: DiffChangeType;
  severity: Severity;
  oldValue?: unknown;
  newValue?: unknown;
  oldType?: string;
  newType?: string;
  message: string;
}

export interface DiffResult {
  id: string;
  endpointId: string;
  endpointName: string;
  createdAt: string;
  breakingCount: number;
  warningCount: number;
  infoCount: number;
  accepted: boolean;
  changes: DiffChange[];
  baseline: {
    version: number;
    statusCode: number;
    body?: unknown;
    responseTime: number;
    contentSize: number;
  };
  current: {
    statusCode: number;
    body?: unknown;
    responseTime: number;
    contentSize: number;
  };
}

export interface ActivityItem {
  id: string;
  type:
    | "baseline_created"
    | "endpoint_added"
    | "diff_detected"
    | "alert_sent"
    | "baseline_accepted"
    | "check_run"
    | "member_invited"
    | "workspace_created";
  title: string;
  description?: string;
  createdAt: string;
  href?: string;
}

export interface AlertItem {
  id: string;
  channel: "email" | "slack" | "discord" | "webhook";
  severity: Severity;
  message: string;
  status: "pending" | "sent" | "failed" | "retrying";
  endpointName?: string;
  createdAt: string;
  sentAt?: string;
}

export interface ScheduleItem {
  id: string;
  endpointId: string;
  endpointName: string;
  frequency: "hourly" | "daily" | "weekly" | "monthly";
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface WorkspaceStats {
  healthy: number;
  breaking: number;
  warnings: number;
  checksToday: number;
  endpoints: number;
  baselines: number;
}
