import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redeem a workspace invite.
 *
 * A Route Handler rather than a page because accepting sets the active-
 * workspace cookie, and cookies cannot be written during Server Component
 * rendering — the response headers are already on their way by then.
 *
 * Sign-in is required before the token is even looked at, which also keeps
 * link-prefetching mail scanners from burning an invite.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const origin = request.nextUrl.origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(`/invite/${token}`);
    return NextResponse.redirect(new URL(`/login?next=${next}`, origin));
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabase
    .rpc("accept_workspace_invite", { p_token_hash: tokenHash })
    .single<{ workspace_id: string | null; status: string }>();

  // The seat-limit trigger raises instead of returning a status, so an error
  // here is almost always a workspace with no seats left.
  const status = error ? "seat-limit" : (data?.status ?? "invalid");

  const destination = new URL("/invite/status", origin);
  destination.searchParams.set("state", status);

  const response = NextResponse.redirect(destination);

  if (status === "accepted" && data?.workspace_id) {
    response.cookies.set(WORKSPACE_COOKIE, data.workspace_id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
