/**
 * Normalisation for endpoint create input.
 *
 * The console form and `POST /api/v1/endpoints` accept the same endpoint from
 * very different callers — a `FormData` of strings, and parsed JSON. What must
 * not drift between them is the risky part: which auth types exist, and which
 * credential fields each one requires before a row is worth writing. Both read
 * those rules from here.
 */

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type HttpMethodName = (typeof HTTP_METHODS)[number];

export const AUTH_TYPES = [
  "NONE",
  "BEARER",
  "API_KEY",
  "BASIC",
  "OAUTH",
  "CUSTOM",
] as const;

export type AuthTypeName = (typeof AUTH_TYPES)[number];

export const DIFF_MODES = ["schema", "exact"] as const;

export type DiffModeName = (typeof DIFF_MODES)[number];

export function isHttpMethod(value: string): value is HttpMethodName {
  return (HTTP_METHODS as readonly string[]).includes(value);
}

export function normalizeMethod(value: unknown): HttpMethodName {
  const key = String(value ?? "GET").trim().toUpperCase();
  return isHttpMethod(key) ? key : "GET";
}

/**
 * Map a caller's auth label onto the database enum.
 *
 * Accepts `api-key`, `api_key` and `API_KEY` alike: the console posts the enum
 * value, the JSON API documents lowercase, and an OpenAPI spec may carry either.
 */
export function normalizeAuthType(value: unknown): AuthTypeName {
  const key = String(value ?? "NONE")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  return (AUTH_TYPES as readonly string[]).includes(key)
    ? (key as AuthTypeName)
    : "NONE";
}

export function normalizeDiffMode(value: unknown): DiffModeName {
  const key = String(value ?? "schema").trim().toLowerCase();
  return (DIFF_MODES as readonly string[]).includes(key)
    ? (key as DiffModeName)
    : "schema";
}

/**
 * Whether a credential map carries what its auth type actually needs.
 *
 * Saving a `BEARER` endpoint with no token produces a row that fails on every
 * single check, so this is rejected at write time rather than discovered later.
 */
export function authConfigValid(
  authType: AuthTypeName,
  config: Record<string, string>
): boolean {
  switch (authType) {
    case "BEARER":
    case "OAUTH":
      return Boolean(config.token);
    case "API_KEY":
      return Boolean(config.key);
    case "BASIC":
      return Boolean(config.username);
    case "CUSTOM":
      return Boolean(config.header && config.value);
    default:
      return true;
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Pull the credential fields for an auth type out of a JSON `auth` object.
 *
 * Only the fields that type uses are read, so a caller cannot smuggle a second
 * credential into the sealed envelope by sending every field at once.
 */
export function authConfigFromJson(
  authType: AuthTypeName,
  input: unknown
): Record<string, string> {
  const src = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  switch (authType) {
    case "BEARER":
    case "OAUTH":
      return { token: str(src.token) };
    case "API_KEY":
      return {
        header: str(src.header) || "X-API-Key",
        key: str(src.key),
      };
    case "BASIC":
      return { username: str(src.username), password: str(src.password) };
    case "CUSTOM":
      return { header: str(src.header), value: str(src.value) };
    default:
      return {};
  }
}

export const SCHEDULE_FREQUENCIES = [
  "HOURLY",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
] as const;

export type ScheduleFrequencyName = (typeof SCHEDULE_FREQUENCIES)[number];

export function isScheduleFrequency(
  value: string
): value is ScheduleFrequencyName {
  return (SCHEDULE_FREQUENCIES as readonly string[]).includes(value);
}
