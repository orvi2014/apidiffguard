/**
 * Public response shapes for `/api/v1`.
 *
 * These are hand-written rather than spread from the database row on purpose.
 * A row carries things a caller must never see — `auth_config` holds sealed
 * credentials, and `headers` can hold whatever a user typed, including
 * secrets they chose not to put in the credential field. Serializing by
 * allow-list means adding a column can never widen the API by accident.
 *
 * Casing is normalized here too: Postgres enums are UPPERCASE, the diff
 * engine emits lowercase severities, and a public API should not expose that
 * seam. Everything enumerable goes out lowercase; HTTP methods stay upper,
 * because that is the convention everywhere else in HTTP.
 */

import type { DiffChange } from "@/lib/types";

function lower(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value.toLowerCase() : fallback;
}

export type EndpointRow = Record<string, unknown>;

export function serializeEndpoint(row: EndpointRow) {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    method: String(row.method ?? "GET").toUpperCase(),
    environment: (row.environment as string) ?? "production",
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    description: (row.description as string | null) ?? null,
    health: lower(row.health, "unknown"),
    authType: lower(row.auth_type, "none"),
    diffMode: lower(row.diff_mode, "schema"),
    timeoutMs: (row.timeout_ms as number) ?? null,
    baselineVersion: (row.baseline_version as number | null) ?? null,
    // The contract itself can be large and is an internal artifact; callers
    // only need to know whether one is in force.
    hasResponseContract: row.response_schema != null,
    lastCheckedAt: (row.last_checked_at as string | null) ?? null,
    responseTime: (row.response_time as number | null) ?? null,
    breakingCount: (row.breaking_count as number) ?? 0,
    warningCount: (row.warning_count as number) ?? 0,
    createdAt: (row.created_at as string) ?? null,
    updatedAt: (row.updated_at as string) ?? null,
  };
}

/** Columns the endpoint serializer reads. Never `auth_config` or `headers`. */
export const ENDPOINT_PUBLIC_COLUMNS =
  "id, name, url, method, environment, tags, description, health, auth_type, diff_mode, timeout_ms, baseline_version, response_schema, last_checked_at, response_time, breaking_count, warning_count, created_at, updated_at";

function normalizeChange(value: unknown): DiffChange | null {
  if (!value || typeof value !== "object") return null;
  const c = value as Record<string, unknown>;
  return {
    id: String(c.id ?? ""),
    path: String(c.path ?? ""),
    type: lower(c.type, "changed") as DiffChange["type"],
    severity: lower(c.severity, "info") as DiffChange["severity"],
    message: String(c.message ?? ""),
    ...(c.oldValue !== undefined ? { oldValue: c.oldValue } : {}),
    ...(c.newValue !== undefined ? { newValue: c.newValue } : {}),
    ...(c.oldType !== undefined ? { oldType: String(c.oldType) } : {}),
    ...(c.newType !== undefined ? { newType: String(c.newType) } : {}),
  };
}

export type DiffRow = Record<string, unknown>;

/** List shape: counts only, so a caller can page cheaply before drilling in. */
export function serializeDiffSummary(row: DiffRow) {
  const endpoint = (row.endpoints ?? null) as Record<string, unknown> | null;
  const changes = Array.isArray(row.changes) ? row.changes : [];
  return {
    id: row.id as string,
    endpointId: (row.endpoint_id as string) ?? null,
    endpointName: (endpoint?.name as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
    accepted: Boolean(row.accepted),
    breakingCount: (row.breaking_count as number) ?? 0,
    warningCount: (row.warning_count as number) ?? 0,
    infoCount: (row.info_count as number) ?? 0,
    changeCount: changes.length,
  };
}

/** Detail shape: the summary plus the changes themselves. */
export function serializeDiffDetail(row: DiffRow) {
  const changes = Array.isArray(row.changes) ? row.changes : [];
  return {
    ...serializeDiffSummary(row),
    baselineId: (row.baseline_id as string | null) ?? null,
    checkId: (row.check_id as string | null) ?? null,
    summary: (row.summary as unknown) ?? {},
    changes: changes
      .map(normalizeChange)
      .filter((c): c is DiffChange => c !== null),
  };
}
