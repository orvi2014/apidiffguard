import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPlanId } from "@/lib/plans";
import {
  AUTH_USER_HEADER,
  AUTH_VERIFIED_HEADER,
} from "@/lib/auth-headers";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("auth-token") ||
        (c.name.startsWith("sb-") && c.name.includes("auth"))
    );
}

function nextWithAuthHeaders(
  request: NextRequest,
  userId?: string | null
) {
  const requestHeaders = new Headers(request.headers);
  if (userId) {
    requestHeaders.set(AUTH_VERIFIED_HEADER, "1");
    requestHeaders.set(AUTH_USER_HEADER, userId);
  } else {
    requestHeaders.delete(AUTH_VERIFIED_HEADER);
    requestHeaders.delete(AUTH_USER_HEADER);
  }
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
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

  let userId: string | null = null;
  let supabaseResponse = nextWithAuthHeaders(request, null);

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
          supabaseResponse = nextWithAuthHeaders(request, userId);
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
  userId = user?.id ?? null;
  supabaseResponse = nextWithAuthHeaders(request, userId);
  // Re-apply cookies if setAll already ran — setAll will refresh on next write.
  // Ensure verified headers exist on the final response request clone.

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
