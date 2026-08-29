/**
 * Shared plumbing for the token-authenticated `/api/v1` surface.
 *
 * Every v1 route needs the same four things — rate limit, authenticate,
 * check a scope, resolve a workspace — and the check route grew its own
 * copy first. Pulling it here keeps one definition of what a token may do,
 * so a future route cannot accidentally skip the scope test.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authenticateApiKey, hasScope } from "@/lib/api-keys";
import type { ApiScope } from "@/lib/api-scopes";
import { canEditWorkspace } from "@/lib/plans";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type ApiV1Context = {
  supabase: SupabaseClient;
  workspaceId: string;
  /** False for viewers — they may read but must not trigger outbound traffic. */
  canEdit: boolean;
};

export function apiError(
  message: string,
  status: number,
  extraHeaders?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: extraHeaders }
  );
}

function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export { isResponse as isApiV1Failure };

/**
 * Authenticate a v1 request and resolve the workspace it may act on.
 *
 * Returns a `NextResponse` on failure so callers can `if (isApiV1Failure(x))
 * return x` rather than juggling a result union.
 *
 * Note the two rate-limit buckets. The first is keyed on the caller and runs
 * before any database work, so an unauthenticated flood is cheap to reject.
 * The second is keyed on the workspace, which is the bucket that actually
 * matters here: an integration calls from one server address, so limiting
 * only by address would either throttle a whole tenant to one client's
 * budget or, when proxy headers are untrusted, share a single global bucket
 * across every caller.
 */
export async function authenticateApiV1(
  request: Request,
  scope: ApiScope,
  opts: { perMinute?: number } = {}
): Promise<ApiV1Context | NextResponse> {
  const perMinute = opts.perMinute ?? 120;

  const preAuth = await rateLimit(clientKey(request), perMinute, 60_000);
  if (!preAuth.ok) {
    return apiError("Too many requests.", 429, {
      "Retry-After": String(preAuth.retryAfterSec),
    });
  }

  const apiKey = await authenticateApiKey(request.headers.get("authorization"));

  let workspaceId: string;
  let supabase: SupabaseClient;
  let canEdit: boolean;

  if (apiKey) {
    if (!hasScope(apiKey, scope)) {
      return apiError(`This token does not have the ${scope} scope.`, 403);
    }
    workspaceId = apiKey.workspaceId;
    supabase = createServiceClient();
    // A token is minted by a member who could already edit; the scope list is
    // what narrows it, and that has been checked above.
    canEdit = true;
  } else {
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    if (!user) {
      return apiError(
        "Unauthorized. Use Authorization: Bearer adg_live_…",
        401
      );
    }
    const { data: membership } = await sessionClient
      .from("memberships")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return apiError("No workspace.", 403);
    }
    workspaceId = membership.workspace_id;
    supabase = sessionClient;
    canEdit = canEditWorkspace(String(membership.role ?? ""));
  }

  const perWorkspace = await rateLimit(
    `ws:${workspaceId}`,
    perMinute,
    60_000
  );
  if (!perWorkspace.ok) {
    return apiError("Too many requests.", 429, {
      "Retry-After": String(perWorkspace.retryAfterSec),
    });
  }

  return { supabase, workspaceId, canEdit };
}
