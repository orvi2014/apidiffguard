import { NextResponse } from "next/server";
import {
  apiError,
  authenticateApiV1,
  isApiV1Failure,
} from "@/lib/api-v1";
import { readPagination } from "@/lib/api-v1-params";
import { serializeDiffSummary } from "@/lib/api-v1-serialize";

export const runtime = "nodejs";

/**
 * GET /api/v1/diffs — recent diffs across the workspace.
 * Query: limit, offset, endpointId, since (ISO 8601), breakingOnly.
 */
export async function GET(request: Request) {
  const ctx = await authenticateApiV1(request, "endpoints:read");
  if (isApiV1Failure(ctx)) return ctx;

  const url = new URL(request.url);
  const { limit, offset } = readPagination(url);

  // `diffs` carries no workspace_id — it is scoped through its endpoint. The
  // inner join is what enforces the tenant boundary, so it must stay inner
  // and the filter must stay on the joined column.
  let query = ctx.supabase
    .from("diffs")
    .select(
      "id, endpoint_id, created_at, accepted, breaking_count, warning_count, info_count, changes, endpoints!inner(name, workspace_id)",
      { count: "exact" }
    )
    .eq("endpoints.workspace_id", ctx.workspaceId);

  const endpointId = url.searchParams.get("endpointId");
  if (endpointId) query = query.eq("endpoint_id", endpointId);

  const since = url.searchParams.get("since");
  if (since) {
    const parsed = new Date(since);
    if (Number.isNaN(parsed.getTime())) {
      return apiError("since must be an ISO 8601 timestamp.", 400);
    }
    query = query.gte("created_at", parsed.toISOString());
  }

  if (url.searchParams.get("breakingOnly") === "true") {
    query = query.gt("breaking_count", 0);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(error.message, 500);

  return NextResponse.json({
    diffs: (data ?? []).map(serializeDiffSummary),
    pagination: { limit, offset, total: count ?? 0 },
  });
}
