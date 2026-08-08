import { NextResponse, type NextRequest } from "next/server";
import { completeEmailVerification } from "@/lib/alerts/email-verification";

export const dynamic = "force-dynamic";

/**
 * Redeem an email-channel confirmation link.
 *
 * Unauthenticated by design: the recipient of the alert address is often not
 * the person who added it, and requiring a login would make confirmation
 * impossible for shared inboxes and aliases. The single-use token in the link
 * is the authorisation.
 */
export async function GET(request: NextRequest) {
  const configId = request.nextUrl.searchParams.get("c") ?? "";
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const base = new URL("/alerts/channels", request.nextUrl.origin);

  if (!configId || !token) {
    base.searchParams.set("verify", "invalid");
    return NextResponse.redirect(base);
  }

  const outcome = await completeEmailVerification(configId, token);
  base.searchParams.set("verify", outcome.status);
  return NextResponse.redirect(base);
}
