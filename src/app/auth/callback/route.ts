import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-url";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Keep the destination through the failure so a retried sign-in still lands
  // where the user was headed — an invite, a shared endpoint, a settings page.
  const retry = new URL("/login", origin);
  retry.searchParams.set("error", "auth");
  if (next && next !== "/dashboard") retry.searchParams.set("next", next);
  const plan = searchParams.get("plan");
  if (plan) retry.searchParams.set("plan", plan);
  return NextResponse.redirect(retry);
}
