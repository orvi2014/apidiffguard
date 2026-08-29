import { NextResponse } from "next/server";
import { apiError, authenticateApiV1, isApiV1Failure } from "@/lib/api-v1";
import { serializeDiffDetail } from "@/lib/api-v1-serialize";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/diffs/:id — one diff with its full change list.
 *
 * Response bodies are deliberately not included. They can be megabytes, they
 * are offloaded out of this row, and they are the part most likely to carry
 * customer data — the changes carry the meaning.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const ctx = await authenticateApiV1(request, "endpoints:read");
  if (isApiV1Failure(ctx)) return ctx;

  const { data, error } = await ctx.supabase
    .from("diffs")
    .select(
      "id, endpoint_id, created_at, accepted, breaking_count, warning_count, info_count, summary, changes, baseline_id, check_id, endpoints!inner(name, workspace_id)"
    )
    .eq("id", id)
    .eq("endpoints.workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("Diff not found.", 404);

  return NextResponse.json({ diff: serializeDiffDetail(data) });
}
