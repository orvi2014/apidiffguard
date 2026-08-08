"use server";

import { revalidatePath } from "next/cache";
import { canEditWorkspace } from "@/lib/plans";
import { generateApiKey } from "@/lib/api-keys";
import { DEFAULT_SCOPES, parseScopes } from "@/lib/api-scopes";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

export async function createApiToken(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot create API tokens." };
  }

  const name = String(formData.get("name") ?? "").trim() || "CI token";
  if (name.length > 80) return { error: "Name is too long." };

  // Least privilege: only the scopes explicitly ticked, falling back to the
  // read + run pair rather than granting everything.
  const requested = formData.getAll("scopes").map(String);
  const scopes = requested.length
    ? parseScopes(requested)
    : DEFAULT_SCOPES;

  const { token, prefix, hash } = generateApiKey();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      name,
      key_hash: hash,
      prefix,
      scopes,
      user_id: ctx.userId,
      workspace_id: ctx.workspaceId,
    })
    .select("id, name, prefix, created_at")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/settings/tokens");
  return {
    ok: true as const,
    token,
    key: data,
  };
}

export async function revokeApiToken(keyId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot revoke API tokens." };
  }

  const supabase = await createClient();
  // Soft revoke: the row stays for the audit trail, and authenticateApiKey
  // refuses any key with revoked_at set. A hard DELETE left no record that the
  // token had ever existed.
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString(), revoked_by: ctx.userId })
    .eq("id", keyId)
    .eq("workspace_id", ctx.workspaceId)
    .is("revoked_at", null);

  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert({
    action: "api_key.revoked",
    resource: "api_key",
    resource_id: keyId,
    workspace_id: ctx.workspaceId,
    user_id: ctx.userId,
  });

  revalidatePath("/settings/tokens");
  return { ok: true as const };
}

export async function addIgnoreRule(endpointId: string, path: string, reason?: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot manage ignore rules." };
  }

  const cleaned = path.trim();
  if (!cleaned) return { error: "Path is required." };
  if (cleaned.length > 400) return { error: "Path is too long." };

  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("id")
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  if (!endpoint) return { error: "Endpoint not found." };

  const { error } = await supabase.from("ignore_rules").insert({
    endpoint_id: endpointId,
    path: cleaned,
    reason: reason?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/endpoints/${endpointId}`);
  return { ok: true as const };
}

export async function deleteIgnoreRule(endpointId: string, ruleId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot manage ignore rules." };
  }

  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("id")
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  if (!endpoint) return { error: "Endpoint not found." };

  const { error } = await supabase
    .from("ignore_rules")
    .delete()
    .eq("id", ruleId)
    .eq("endpoint_id", endpointId);

  if (error) return { error: error.message };

  revalidatePath(`/endpoints/${endpointId}`);
  return { ok: true as const };
}

export async function clearEndpointContract(endpointId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot edit contracts." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("endpoints")
    .update({ response_schema: null })
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId);

  if (error) return { error: error.message };
  revalidatePath(`/endpoints/${endpointId}`);
  return { ok: true as const };
}
