import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPlanId } from "@/lib/plans";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("auth-token") ||
        (c.name.startsWith("sb-") && c.name.includes("auth"))
    );
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/forgot-password");
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/endpoints") ||
    path.startsWith("/diff") ||
    path.startsWith("/alerts") ||
    path.startsWith("/schedules") ||
    path.startsWith("/settings");

  // Skip remote auth round-trip on public pages when no session cookie exists.
  if (!isProtected && !isAuthPage && !hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    const plan = request.nextUrl.searchParams.get("plan");
    const next = request.nextUrl.searchParams.get("next");
    if (isPlanId(plan)) {
      url.pathname = "/settings/billing";
      url.search = "";
      url.searchParams.set("upgrade", plan);
    } else if (next?.startsWith("/") && !next.startsWith("//")) {
      url.pathname = next;
      url.search = "";
    } else {
      url.pathname = "/dashboard";
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
