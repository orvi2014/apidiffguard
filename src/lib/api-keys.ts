import { createHash, randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { parseScopes, type ApiScope } from "@/lib/api-scopes";

// Re-exported for server-side callers that already import from here.
// Client components must import from "@/lib/api-scopes" directly — this module
// pulls in the service-role Supabase client.
export * from "@/lib/api-scopes";

export const API_KEY_PREFIX = "adg_live_";

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiKey(): { token: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const token = `${API_KEY_PREFIX}${secret}`;
  return {
    token,
    prefix: token.slice(0, 16),
    hash: hashApiKey(token),
  };
}

export type ApiKeyAuth = {
  keyId: string;
  userId: string;
  workspaceId: string;
  scopes: ApiScope[];
};

export function hasScope(auth: ApiKeyAuth, scope: ApiScope): boolean {
  return auth.scopes.includes(scope);
}

/** Resolve a Bearer adg_live_… token via service role (bypasses RLS). */
export async function authenticateApiKey(
  authorizationHeader: string | null
): Promise<ApiKeyAuth | null> {
  if (!authorizationHeader?.toLowerCase().startsWith("bearer ")) return null;
  const token = authorizationHeader.slice(7).trim();
  if (!token.startsWith(API_KEY_PREFIX)) return null;

  const hash = hashApiKey(token);
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("api_keys")
    .select("id, user_id, workspace_id, expires_at, revoked_at, scopes")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!data) return null;
  // Revocation is a soft delete so the row survives for audit; a revoked key
  // must stop authenticating immediately.
  if (data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }

  // Fire-and-forget last_used stamp
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    keyId: data.id,
    userId: data.user_id,
    workspaceId: data.workspace_id,
    scopes: parseScopes(data.scopes),
  };
}
