/**
 * API token scopes.
 *
 * Kept separate from `api-keys.ts` because that module imports the service-role
 * Supabase client (server-only), while the token settings UI is a client
 * component that needs the scope list.
 */
export const API_SCOPES = [
  "endpoints:read",
  "endpoints:write",
  "checks:run",
  "baselines:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/** Least privilege: read + run, not write. */
export const DEFAULT_SCOPES: ApiScope[] = ["endpoints:read", "checks:run"];

export function isApiScope(value: string): value is ApiScope {
  return (API_SCOPES as readonly string[]).includes(value);
}

/** Normalize scopes read from the database or a form, dropping anything unknown. */
export function parseScopes(input: unknown): ApiScope[] {
  if (!Array.isArray(input)) return DEFAULT_SCOPES;
  const scopes = input.filter(
    (s): s is ApiScope => typeof s === "string" && isApiScope(s)
  );
  return scopes.length ? scopes : DEFAULT_SCOPES;
}
