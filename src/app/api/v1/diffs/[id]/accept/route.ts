import { NextResponse } from "next/server";
import { acceptDiff } from "@/lib/accept-diff";
import { apiError, authenticateApiV1, isApiV1Failure } from "@/lib/api-v1";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/diffs/:id/accept — make the response behind this diff the
 * endpoint's new baseline. Requires `baselines:write`.
 *
 * This is the "the vendor's change is intended, stop flagging it" step. It is
 * the one write an agent most needs after fixing the calling code, and the
 * one it should be most deliberate about: once accepted, the same change will
 * not be reported again. Hence its own scope, off by default.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id: diffId } = await context.params;
  const ctx = await authenticateApiV1(request, "baselines:write", {
    perMinute: 30,
  });
  if (isApiV1Failure(ctx)) return ctx;

  if (!ctx.canEdit) {
    return apiError("Your role cannot accept baselines.", 403);
  }

  const result = await acceptDiff(ctx.supabase, {
    diffId,
    workspaceId: ctx.workspaceId,
  });
  if ("error" in result) return apiError(result.error, result.status);

  return NextResponse.json({
    accepted: true,
    diffId,
    endpointId: result.endpointId,
    baselineVersion: result.baselineVersion,
  });
}
