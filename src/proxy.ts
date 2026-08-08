import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip Next internals, static assets, and crawl files.
     * sitemap/robots must not go through Supabase session refresh.
     *
     * `api/` is excluded too: those routes authenticate themselves (bearer
     * token or their own createClient()), so refreshing the cookie session here
     * only adds a Supabase round-trip per request. `auth/` is NOT excluded —
     * the OAuth callback needs the cookie writes.
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|llms\\.txt|llms-full\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
