import { NextResponse } from "next/server";
import { apiError, authenticateApiV1, isApiV1Failure } from "@/lib/api-v1";
import {
  ENDPOINT_PUBLIC_COLUMNS,
  serializeEndpoint,
} from "@/lib/api-v1-serialize";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/endpoints/:id — one endpoint, plus its most recent diff.
 *
 * The latest diff is included because the question an agent asks after
 * "which endpoints are unhealthy" is always "what changed on this one",
 * and making that a second round trip helps nobody.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const ctx = await authenticateApiV1(request, "endpoints:read");
  if (isApiV1Failure(ctx)) return ctx;

  const { data, error } = await ctx.supabase
    .from("endpoints")
    .select(ENDPOINT_PUBLIC_COLUMNS)
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("Endpoint not found.", 404);

  const { data: latest } = await ctx.supabase
    .from("diffs")
    .select("id, created_at, breaking_count, warning_count, info_count")
    .eq("endpoint_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    endpoint: serializeEndpoint(data),
    latestDiff: latest
      ? {
          id: latest.id,
          createdAt: latest.created_at,
          breakingCount: latest.breaking_count ?? 0,
          warningCount: latest.warning_count ?? 0,
          infoCount: latest.info_count ?? 0,
        }
      : null,
  });
}
