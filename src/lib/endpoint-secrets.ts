import { createServiceClient } from "@/lib/supabase/server";
import { openSecrets, sealSecrets } from "@/lib/crypto/secret-box";

/**
 * Every endpoint column except `auth_config`.
 *
 * `auth_config` is revoked from the `authenticated` role at the column level,
 * so `select("*")` through a user-scoped client is a permission error rather
 * than a convenience. Selecting this list keeps that boundary explicit at each
 * call site instead of failing at runtime.
 */
// Written as one literal, not a concatenation: supabase-js derives the row type
// from the select string's literal type, and `"a" + "b"` widens to `string`,
// which collapses every downstream field access into an error.
export const ENDPOINT_COLUMNS =
  "id, workspace_id, name, url, method, environment, tags, description, health, auth_type, headers, timeout_ms, last_checked_at, response_time, baseline_version, breaking_count, warning_count, diff_mode, response_schema, created_at, updated_at" as const;

/**
 * Read and decrypt an endpoint's credentials.
 *
 * Uses the service role deliberately: the credential column is unreadable by
 * every user-facing role, so the only code that can see a token is code that
 * is about to send it to the endpoint it belongs to.
 */
export async function loadEndpointCredentials(
  endpointId: string
): Promise<Record<string, string>> {
  const service = createServiceClient();
  const { data } = await service
    .from("endpoints")
    .select("auth_config")
    .eq("id", endpointId)
    .maybeSingle();

  if (!data?.auth_config) return {};
  return openSecrets(data.auth_config, endpointId);
}

/** Seal a credential map for storage against a specific endpoint id. */
export function sealEndpointCredentials(
  credentials: Record<string, string>,
  endpointId: string
) {
  const entries = Object.entries(credentials).filter(([, v]) => v !== "");
  if (!entries.length) return {};
  return sealSecrets(Object.fromEntries(entries), endpointId);
}
