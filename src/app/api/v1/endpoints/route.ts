import { NextResponse } from "next/server";
import {
  apiError,
  authenticateApiV1,
  isApiV1Failure,
} from "@/lib/api-v1";
import {
  HEALTH_VALUES,
  isHealthValue,
  readPagination,
} from "@/lib/api-v1-params";
import {
  ENDPOINT_PUBLIC_COLUMNS,
  serializeEndpoint,
} from "@/lib/api-v1-serialize";

export const runtime = "nodejs";

/**
 * GET /api/v1/endpoints — list the workspace's monitored endpoints.
 * Auth: Bearer adg_live_… with `endpoints:read`, or a signed-in session.
 * Query: limit, offset, health, environment.
 */
export async function GET(request: Request) {
  const ctx = await authenticateApiV1(request, "endpoints:read");
  if (isApiV1Failure(ctx)) return ctx;

  const url = new URL(request.url);
  const { limit, offset } = readPagination(url);

  let query = ctx.supabase
    .from("endpoints")
    .select(ENDPOINT_PUBLIC_COLUMNS, { count: "exact" })
    // Explicit even on the session client: the token path uses the service
    // role, which bypasses RLS, so this filter is the only tenant boundary.
    .eq("workspace_id", ctx.workspaceId);

  const health = url.searchParams.get("health");
  if (health) {
    if (!isHealthValue(health)) {
      return apiError(
        `health must be one of ${HEALTH_VALUES.join(", ")}.`,
        400
      );
    }
    query = query.eq("health", health.toUpperCase());
  }

  const environment = url.searchParams.get("environment");
  if (environment) query = query.eq("environment", environment);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(error.message, 500);

  return NextResponse.json({
    endpoints: (data ?? []).map(serializeEndpoint),
    pagination: { limit, offset, total: count ?? 0 },
  });
}
