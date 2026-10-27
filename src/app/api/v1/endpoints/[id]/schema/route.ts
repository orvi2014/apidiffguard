import { NextResponse } from "next/server";
import { inferSchema } from "@/lib/agent-readable";
import { apiError, authenticateApiV1, isApiV1Failure } from "@/lib/api-v1";
import { hydrateResponseBody } from "@/lib/response-body-store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/endpoints/:id/schema — the shape of the endpoint's active
 * baseline, as JSON Schema.
 *
 * This is what an agent reads before writing code against an API it does not
 * control: the response as it actually is, not as the vendor's docs say it
 * was. The schema carries types and field names only. The baseline body is
 * never returned, for the same reason `GET /diffs/:id` leaves bodies out —
 * it is the part most likely to hold customer data.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const ctx = await authenticateApiV1(request, "endpoints:read");
  if (isApiV1Failure(ctx)) return ctx;

  const { data: endpoint, error } = await ctx.supabase
    .from("endpoints")
    .select("id, name, url, method")
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (error) return apiError(error.message, 500);
  if (!endpoint) return apiError("Endpoint not found.", 404);

  // Highest active version wins: promotion briefly leaves two rows active.
  const { data: baseline } = await ctx.supabase
    .from("baselines")
    .select("version, status_code, headers, body, body_ref, created_at")
    .eq("endpoint_id", id)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!baseline) {
    return apiError("This endpoint has no baseline yet. Run a check first.", 404);
  }

  const body = await hydrateResponseBody(baseline);
  const headers = (baseline.headers ?? {}) as Record<string, unknown>;
  const contentType =
    Object.entries(headers).find(([k]) => k.toLowerCase() === "content-type")?.[1] ??
    null;

  return NextResponse.json({
    endpointId: endpoint.id,
    name: endpoint.name,
    method: String(endpoint.method ?? "GET").toUpperCase(),
    url: endpoint.url,
    baselineVersion: baseline.version,
    capturedAt: baseline.created_at,
    statusCode: baseline.status_code,
    contentType: typeof contentType === "string" ? contentType : null,
    schema: inferSchema(body),
  });
}
