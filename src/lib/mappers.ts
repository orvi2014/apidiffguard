import type {
  AuthType,
  Endpoint,
  HealthStatus,
  HttpMethod,
} from "@/lib/types";

export type DbEndpoint = {
  id: string;
  name: string;
  url: string;
  method: string;
  environment: string;
  tags: string[] | null;
  description: string | null;
  health: string;
  auth_type: string;
  last_checked_at: string | null;
  response_time: number | null;
  baseline_version: number | null;
  breaking_count: number | null;
  warning_count: number | null;
};

export function toUiHealth(health: string): HealthStatus {
  return health.toLowerCase() as HealthStatus;
}

export function toUiMethod(method: string): HttpMethod {
  return method.toUpperCase() as HttpMethod;
}

export function toUiAuth(auth: string): AuthType {
  return auth.toLowerCase() as AuthType;
}

export function mapEndpoint(row: DbEndpoint): Endpoint {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    method: toUiMethod(row.method),
    environment: row.environment,
    tags: row.tags ?? [],
    description: row.description ?? undefined,
    health: toUiHealth(row.health),
    authType: toUiAuth(row.auth_type),
    lastCheckedAt: row.last_checked_at ?? undefined,
    responseTime: row.response_time ?? undefined,
    baselineVersion: row.baseline_version ?? undefined,
    breakingCount: row.breaking_count ?? undefined,
    warningCount: row.warning_count ?? undefined,
  };
}
