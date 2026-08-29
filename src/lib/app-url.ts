/**
 * The origin this deployment is reachable at.
 *
 * Five call sites had each written their own
 * `process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"`, which meant a
 * preview deployment — where that variable is deliberately unset, because the
 * URL differs per deployment — sent OAuth callbacks, invite links, and alert
 * deep links to localhost. Vercel exposes the real host as VERCEL_URL, so a
 * preview now points at itself instead of at the developer's machine.
 *
 * Order matters: an explicit NEXT_PUBLIC_APP_URL always wins, because
 * production sets it to the custom domain and VERCEL_URL there is the
 * deployment's own *.vercel.app address, which is not where users are.
 */
function fromVercel(): string | null {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return host ? `https://${host.replace(/\/$/, "")}` : null;
}

export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  return fromVercel() ?? "http://localhost:3000";
}
