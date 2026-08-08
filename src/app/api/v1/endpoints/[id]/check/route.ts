import { NextResponse } from "next/server";
import { authenticateApiKey, hasScope } from "@/lib/api-keys";
import { canEditWorkspace } from "@/lib/plans";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { runEndpointCheck } from "@/lib/run-endpoint-check";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/endpoints/:id/check
 * Auth: Bearer adg_live_… (workspace API token) or signed-in session cookie.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id: endpointId } = await context.params;
  const limited = await rateLimit(clientKey(request), 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const authHeader = request.headers.get("authorization");
  const apiKey = await authenticateApiKey(authHeader);

  let workspaceId: string;
  let supabase;

  if (apiKey) {
    if (!hasScope(apiKey, "checks:run")) {
      return NextResponse.json(
        { error: "This token does not have the checks:run scope." },
        { status: 403 }
      );
    }
    workspaceId = apiKey.workspaceId;
    supabase = createServiceClient();
  } else {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Use Authorization: Bearer adg_live_…" },
        { status: 401 }
      );
    }
    const { data: membership } = await supabase
      .from("memberships")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "No workspace." }, { status: 403 });
    }
    // Mirror runCheckAction: viewers may read, but must not trigger outbound checks.
    if (!canEditWorkspace(String(membership.role ?? ""))) {
      return NextResponse.json(
        { error: "Your role cannot run checks." },
        { status: 403 }
      );
    }
    workspaceId = membership.workspace_id;
  }

  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("id")
    .eq("id", endpointId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found." }, { status: 404 });
  }

  const result = await runEndpointCheck(supabase, {
    endpointId,
    workspaceId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    diffId: result.diffId ?? null,
    breakingCount: result.breakingCount,
    warningCount: result.warningCount,
    changeCount: result.changeCount,
    alertsSent: result.alertsSent ?? 0,
  });
}
