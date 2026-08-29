import { NextResponse } from "next/server";
import { apiError, authenticateApiV1, isApiV1Failure } from "@/lib/api-v1";
import { runEndpointCheck } from "@/lib/run-endpoint-check";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/endpoints/:id/check — run a hosted check now.
 * Auth: Bearer adg_live_… with `checks:run`, or a signed-in session.
 *
 * Held to a lower rate limit than the read routes: this one makes an outbound
 * request and consumes the workspace's monthly check quota.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id: endpointId } = await context.params;
  const ctx = await authenticateApiV1(request, "checks:run", {
    perMinute: 30,
  });
  if (isApiV1Failure(ctx)) return ctx;

  // Mirrors runCheckAction: viewers may read, but must not spend quota.
  if (!ctx.canEdit) {
    return apiError("Your role cannot run checks.", 403);
  }

  const { data: endpoint } = await ctx.supabase
    .from("endpoints")
    .select("id")
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (!endpoint) return apiError("Endpoint not found.", 404);

  const result = await runEndpointCheck(ctx.supabase, {
    endpointId,
    workspaceId: ctx.workspaceId,
  });

  if ("error" in result) return apiError(result.error, 400);

  return NextResponse.json({
    success: true,
    diffId: result.diffId ?? null,
    breakingCount: result.breakingCount,
    warningCount: result.warningCount,
    changeCount: result.changeCount,
    alertsSent: result.alertsSent ?? 0,
  });
}
