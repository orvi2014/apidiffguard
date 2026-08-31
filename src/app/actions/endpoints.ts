"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditWorkspace, planEndpointLimit } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { MissingSecretKeyError } from "@/lib/crypto/secret-box";
import {
  ENDPOINT_COLUMNS,
  loadEndpointCredentials,
  sealEndpointCredentials,
} from "@/lib/endpoint-secrets";
import {
  authHeadersFromEndpoint,
  buildStoredHeaders,
  requestBodyFromEndpoint,
} from "@/lib/endpoint-auth";
import { runHttpCheck } from "@/lib/http-check";
import { hydrateResponseBody } from "@/lib/response-body-store";
import { runEndpointCheck } from "@/lib/run-endpoint-check";
import { activateBaseline, promoteBaseline } from "@/lib/baselines";
import { parseAndAssertPublicUrl } from "@/lib/safe-url";

function mapMethod(method: string) {
  return method.toUpperCase() as
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "HEAD"
    | "OPTIONS";
}

function mapAuth(auth: string) {
  const key = auth.toUpperCase().replace("-", "_");
  const allowed = ["NONE", "BEARER", "API_KEY", "BASIC", "OAUTH", "CUSTOM"] as const;
  return (allowed.includes(key as (typeof allowed)[number])
    ? key
    : "NONE") as (typeof allowed)[number];
}

function buildAuthConfig(
  authType: ReturnType<typeof mapAuth>,
  formData: FormData,
): Record<string, string> {
  switch (authType) {
    case "BEARER":
      return { token: String(formData.get("auth_token") ?? "").trim() };
    case "API_KEY":
      return {
        header: String(formData.get("auth_header") ?? "X-API-Key").trim() || "X-API-Key",
        key: String(formData.get("auth_key") ?? "").trim(),
      };
    case "BASIC":
      return {
        username: String(formData.get("auth_username") ?? "").trim(),
        password: String(formData.get("auth_password") ?? "").trim(),
      };
    case "OAUTH":
      return { token: String(formData.get("auth_token") ?? "").trim() };
    case "CUSTOM":
      return {
        header: String(formData.get("auth_header") ?? "").trim(),
        value: String(formData.get("auth_value") ?? "").trim(),
      };
    default:
      return {};
  }
}

function authConfigValid(
  authType: ReturnType<typeof mapAuth>,
  config: Record<string, string>,
) {
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

export async function acceptDiffAsBaseline(diffId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot accept baselines." };
  }

  const supabase = await createClient();
  const { data: diff } = await supabase
    .from("diffs")
    .select("id, endpoint_id, check_id, endpoints!inner(workspace_id)")
    .eq("id", diffId)
    .single();

  if (!diff) return { error: "Diff not found." };
  const endpoint = Array.isArray(diff.endpoints)
    ? diff.endpoints[0]
    : diff.endpoints;
  if (!endpoint || endpoint.workspace_id !== ctx.workspaceId) {
    return { error: "Diff not found." };
  }
  if (!diff.check_id) return { error: "Check for this diff was not found." };

  const { data: check } = await supabase
    .from("checks")
    .select("body, body_ref, status_code, headers, response_time, content_size")
    .eq("id", diff.check_id)
    .single();

  if (!check) return { error: "Check for this diff was not found." };

  // A large body lives in object storage, so accepting a diff has to fetch the
  // real content before promoting it to a baseline.
  const checkBody = await hydrateResponseBody(check);

  const promoted = await promoteBaseline(supabase, {
    endpointId: diff.endpoint_id,
    body: checkBody,
    statusCode: check.status_code,
    headers: check.headers ?? {},
    responseTime: check.response_time ?? 0,
    contentSize: check.content_size ?? 0,
    notes: "Accepted from diff",
    approved: true,
  });

  if ("error" in promoted) return { error: promoted.error };
  const version = promoted.version;

  await supabase
    .from("diffs")
    .update({ accepted: true })
    .eq("id", diffId);

  await supabase
    .from("endpoints")
    .update({
      health: "HEALTHY",
      baseline_version: version,
      last_checked_at: new Date().toISOString(),
      breaking_count: 0,
      warning_count: 0,
    })
    .eq("id", diff.endpoint_id);

  await supabase.from("activities").insert({
    type: "baseline_accepted",
    title: "Baseline accepted",
    description: "Diff response promoted to active baseline",
    workspace_id: ctx.workspaceId,
    endpoint_id: diff.endpoint_id,
  });

  revalidatePath(`/diff/${diffId}`);
  revalidatePath(`/endpoints/${diff.endpoint_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/diffs");
  return { ok: true as const };
}

export async function createEndpoint(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot create endpoints." };
  }

  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const method = mapMethod(String(formData.get("method") ?? "GET"));
  const environment = String(formData.get("env") ?? "production").trim();
  const authType = mapAuth(String(formData.get("auth") ?? "none"));
  const description = String(formData.get("desc") ?? "").trim() || null;
  const authConfig = buildAuthConfig(authType, formData);
  const requestBody = String(formData.get("request_body") ?? "").trim();
  const contentType = String(formData.get("content_type") ?? "application/json").trim();
  const headers = buildStoredHeaders({
    contentType: requestBody ? contentType || "application/json" : undefined,
    requestBody: requestBody || undefined,
  });

  if (!name || !url) {
    return { error: "Name and URL are required." };
  }
  // Same guard the checker uses at request time — otherwise a user can save an
  // endpoint (localhost, link-local, credentials in the URL) that is rejected
  // on every single check.
  try {
    parseAndAssertPublicUrl(url);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Enter a valid URL.",
    };
  }
  if (authType !== "NONE" && !authConfigValid(authType, authConfig)) {
    return { error: "Fill in the auth credentials for the selected type." };
  }

  const limit = planEndpointLimit(ctx.plan);
  if (limit != null) {
    const { count } = await supabase
      .from("endpoints")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId);
    if ((count ?? 0) >= limit) {
      return {
        error: `Your ${ctx.plan} plan allows ${limit} endpoints. Upgrade in Settings → Billing to add more.`,
      };
    }
  }

  // The id is generated here rather than by the database default because it is
  // bound into the credential ciphertext as additional authenticated data — the
  // envelope has to know which endpoint it belongs to before the row exists.
  const endpointId = randomUUID();
  let sealedAuthConfig: unknown;
  try {
    sealedAuthConfig =
      authType === "NONE" ? {} : sealEndpointCredentials(authConfig, endpointId);
  } catch (err) {
    return {
      error:
        err instanceof MissingSecretKeyError
          ? "Credential storage is not configured on this server. Set ENDPOINT_SECRET_KEY and try again."
          : err instanceof Error
            ? err.message
            : "Could not secure the credentials.",
    };
  }

  const { data, error } = await supabase
    .from("endpoints")
    .insert({
      id: endpointId,
      name,
      url,
      method,
      environment,
      auth_type: authType,
      auth_config: sealedAuthConfig,
      headers,
      description,
      workspace_id: ctx.workspaceId,
    })
    .select("id")
    .single();

  if (error) return { error: friendlyEndpointError(error.message) };

  await supabase.from("activities").insert({
    type: "endpoint_added",
    title: "Endpoint added",
    description: `${method} ${name}`,
    workspace_id: ctx.workspaceId,
  });

  revalidatePath("/endpoints");
  revalidatePath("/dashboard");
  redirect(`/endpoints/${data.id}`);
}

export async function importEndpoints(
  endpoints: Array<{
    name: string;
    url: string;
    method: string;
    description?: string;
    tags?: string[];
    authType?: string;
    responseSchema?: Record<string, unknown> | null;
  }>
) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized", count: 0, skipped: 0 };
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot import endpoints.", count: 0, skipped: 0 };
  }

  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    return { error: "No endpoints to import.", count: 0, skipped: 0 };
  }
  if (endpoints.length > 200) {
    return { error: "Import is limited to 200 endpoints per batch.", count: 0, skipped: 0 };
  }

  const supabase = await createClient();

  // Imported specs are user-supplied data like any other input — validate the
  // URLs here rather than discovering them at check time.
  let invalid = 0;
  const endpointsToConsider = endpoints.filter((ep) => {
    try {
      parseAndAssertPublicUrl(String(ep.url ?? ""));
      return true;
    } catch {
      invalid += 1;
      return false;
    }
  });

  if (endpointsToConsider.length === 0) {
    return {
      error: "No endpoints in that spec had a valid, publicly reachable URL.",
      count: 0,
      skipped: endpoints.length,
    };
  }

  let toImport = endpointsToConsider;
  let skipped = invalid;
  const limit = planEndpointLimit(ctx.plan);
  if (limit != null) {
    const { count } = await supabase
      .from("endpoints")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId);
    const remaining = Math.max(0, limit - (count ?? 0));
    if (remaining === 0) {
      return {
        error: `Your ${ctx.plan} plan allows ${limit} endpoints. Upgrade in Settings → Billing to import more.`,
        count: 0,
        skipped: endpoints.length,
      };
    }
    skipped = invalid + Math.max(0, endpointsToConsider.length - remaining);
    toImport = endpointsToConsider.slice(0, remaining);
  }

  const rows = toImport.slice(0, 200).map((ep) => ({
    name: ep.name,
    url: ep.url,
    method: mapMethod(ep.method),
    description: ep.description ?? null,
    tags: ep.tags ?? [],
    // Spec auth types need credentials — import as NONE until edited.
    auth_type: "NONE" as const,
    workspace_id: ctx.workspaceId,
    environment: "production",
    diff_mode: "schema" as const,
    response_schema: ep.responseSchema ?? null,
  }));

  const { data, error } = await supabase
    .from("endpoints")
    .insert(rows)
    .select("id");

  if (error) return { error: error.message, count: 0, skipped };

  await supabase.from("activities").insert({
    type: "endpoint_added",
    title: "OpenAPI import",
    description: `Imported ${data.length} endpoints`,
    workspace_id: ctx.workspaceId,
  });

  revalidatePath("/endpoints");
  revalidatePath("/dashboard");
  return { count: data.length, skipped };
}

export async function deleteEndpoint(endpointId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot delete endpoints." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("endpoints")
    .delete()
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId);

  if (error) return { error: friendlyEndpointError(error.message) };

  revalidatePath("/endpoints");
  revalidatePath("/dashboard");
  redirect("/endpoints");
}

export async function captureBaselineAction(
  endpointId: string,
  opts?: { allowErrorStatus?: boolean }
) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot capture baselines." };
  }

  const supabase = await createClient();
  const { data: endpoint, error: epError } = await supabase
    .from("endpoints")
    .select(ENDPOINT_COLUMNS)
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .single();

  if (epError || !endpoint) return { error: "Endpoint not found." };

  // Capturing a baseline is an outbound request too, so it is metered like any
  // other check rather than being a free way around the quota.
  const { data: quota, error: quotaError } = await supabase
    .rpc("consume_check_quota", { p_workspace_id: ctx.workspaceId })
    .single<{ allowed: boolean; used: number; quota: number | null }>();

  if (quotaError) {
    return { error: `Could not reserve check quota: ${quotaError.message}` };
  }
  if (quota && !quota.allowed) {
    return {
      error: `Monthly check limit reached (${quota.used} of ${quota.quota}). Upgrade in Settings → Billing to capture more baselines.`,
    };
  }

  await supabase
    .from("endpoints")
    .update({ health: "CHECKING" })
    .eq("id", endpointId);

  const credentials = await loadEndpointCredentials(endpointId);
  const result = await runHttpCheck({
    url: endpoint.url,
    method: endpoint.method,
    timeoutMs: endpoint.timeout_ms,
    headers: authHeadersFromEndpoint(endpoint, credentials),
    body: requestBodyFromEndpoint(endpoint),
  });

  if (result.error && result.statusCode === 0) {
    await supabase
      .from("endpoints")
      .update({ health: "UNKNOWN" })
      .eq("id", endpointId);
    return { error: result.error };
  }

  if (
    result.statusCode >= 400 &&
    !opts?.allowErrorStatus
  ) {
    await supabase
      .from("endpoints")
      .update({ health: "UNKNOWN" })
      .eq("id", endpointId);
    return {
      error: `HTTP ${result.statusCode} — confirm to save as baseline anyway.`,
      needsConfirm: true as const,
      statusCode: result.statusCode,
    };
  }

  const baseline = await promoteBaseline(supabase, {
    endpointId,
    statusCode: result.statusCode,
    headers: result.headers,
    body: result.body,
    responseTime: result.responseTime,
    contentSize: result.contentSize,
    notes: "Captured from live check",
    approved: true,
  });

  if ("error" in baseline) return { error: baseline.error };
  const version = baseline.version;

  await supabase
    .from("endpoints")
    .update({
      health: "HEALTHY",
      baseline_version: version,
      response_time: result.responseTime,
      last_checked_at: new Date().toISOString(),
      breaking_count: 0,
      warning_count: 0,
    })
    .eq("id", endpointId);

  await supabase.from("activities").insert({
    type: "baseline_created",
    title: "Baseline captured",
    description: `${endpoint.name} · v${version}`,
    workspace_id: ctx.workspaceId,
  });

  revalidatePath(`/endpoints/${endpointId}`);
  revalidatePath("/endpoints");
  revalidatePath("/dashboard");

  return {
    success: true,
    version: baseline.version,
    statusCode: result.statusCode,
    responseTime: result.responseTime,
  };
}

export async function runCheckAction(endpointId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot run checks." };
  }

  const supabase = await createClient();
  const result = await runEndpointCheck(supabase, {
    endpointId,
    workspaceId: ctx.workspaceId,
  });

  revalidatePath(`/endpoints/${endpointId}`);
  revalidatePath("/endpoints");
  revalidatePath("/dashboard");
  revalidatePath("/diffs");
  revalidatePath("/alerts");
  return result;
}

export async function updateEndpoint(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot edit endpoints." };
  }

  const endpointId = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const method = mapMethod(String(formData.get("method") ?? "GET"));
  const environment = String(formData.get("env") ?? "production").trim();
  const authType = mapAuth(String(formData.get("auth") ?? "none"));
  const description = String(formData.get("desc") ?? "").trim() || null;
  const diffMode =
    String(formData.get("diff_mode") ?? "schema").trim() === "full"
      ? "full"
      : "schema";
  const authConfig = buildAuthConfig(authType, formData);
  const requestBody = String(formData.get("request_body") ?? "").trim();
  const contentType = String(formData.get("content_type") ?? "application/json").trim();
  const keepAuth = String(formData.get("keep_auth") ?? "") === "1";

  if (!endpointId || !name || !url) {
    return { error: "Name and URL are required." };
  }
  try {
    parseAndAssertPublicUrl(url);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Enter a valid URL.",
    };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("endpoints")
    .select("id, headers")
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (!existing) return { error: "Endpoint not found." };

  let nextAuthConfig = authConfig;
  if (keepAuth && authType !== "NONE") {
    // "Leave blank to keep" needs the old secret, which no user-scoped client
    // can read. Membership was just proven by the lookup above, so this
    // service-role read is scoped to an endpoint the caller already owns.
    let prev: Record<string, string>;
    try {
      prev = await loadEndpointCredentials(endpointId);
    } catch {
      return {
        error:
          "Existing credentials could not be read. Re-enter them to replace the stored value.",
      };
    }
    nextAuthConfig = { ...prev, ...Object.fromEntries(
      Object.entries(authConfig).filter(([, v]) => v !== "")
    ) };
  }
  if (authType !== "NONE" && !authConfigValid(authType, nextAuthConfig)) {
    return { error: "Fill in the auth credentials for the selected type." };
  }

  let sealedAuthConfig: unknown;
  try {
    sealedAuthConfig =
      authType === "NONE"
        ? {}
        : sealEndpointCredentials(nextAuthConfig, endpointId);
  } catch (err) {
    return {
      error:
        err instanceof MissingSecretKeyError
          ? "Credential storage is not configured on this server. Set ENDPOINT_SECRET_KEY and try again."
          : err instanceof Error
            ? err.message
            : "Could not secure the credentials.",
    };
  }

  const prevHeaders =
    existing.headers && typeof existing.headers === "object"
      ? (existing.headers as Record<string, string>)
      : {};
  const needsBody = ["POST", "PUT", "PATCH"].includes(method);
  const headers = needsBody
    ? buildStoredHeaders({
        contentType: contentType || "application/json",
        requestBody: requestBody || undefined,
      })
    : buildStoredHeaders({
        // Clear stored body when switching away from body methods
        contentType: undefined,
        requestBody: undefined,
        extra: Object.fromEntries(
          Object.entries(prevHeaders).filter(
            ([k]) => !k.startsWith("__adg_") && k.toLowerCase() !== "content-type"
          )
        ),
      });

  const { error } = await supabase
    .from("endpoints")
    .update({
      name,
      url,
      method,
      environment,
      auth_type: authType,
      auth_config: sealedAuthConfig,
      headers,
      description,
      diff_mode: diffMode,
    })
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId);

  if (error) return { error: friendlyEndpointError(error.message) };

  revalidatePath(`/endpoints/${endpointId}`);
  revalidatePath("/endpoints");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function restoreBaselineAction(
  endpointId: string,
  baselineId: string
) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Viewers cannot restore baselines." };
  }

  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("id")
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  if (!endpoint) return { error: "Endpoint not found." };

  const { data: baseline } = await supabase
    .from("baselines")
    .select("id, version")
    .eq("id", baselineId)
    .eq("endpoint_id", endpointId)
    .maybeSingle();
  if (!baseline) return { error: "Baseline not found." };

  await supabase
    .from("baselines")
    .update({ approved: true })
    .eq("id", baselineId)
    .eq("endpoint_id", endpointId);

  const activated = await activateBaseline(supabase, endpointId, baselineId);
  if ("error" in activated) return { error: activated.error };

  await supabase
    .from("endpoints")
    .update({
      baseline_version: baseline.version,
      health: "HEALTHY",
      breaking_count: 0,
      warning_count: 0,
    })
    .eq("id", endpointId);

  await supabase.from("activities").insert({
    type: "baseline_accepted",
    title: "Baseline restored",
    description: `Active baseline set to v${baseline.version}`,
    workspace_id: ctx.workspaceId,
    endpoint_id: endpointId,
  });

  revalidatePath(`/endpoints/${endpointId}`);
  revalidatePath(`/endpoints/${endpointId}/baselines`);
  revalidatePath("/dashboard");
  return { ok: true as const, version: baseline.version };
}

/**
 * The count-then-insert guard has a race the database trigger closes, but the
 * trigger's message is bare Postgres text with no next step. Rewrite it to the
 * same wording the pre-check uses.
 */
function friendlyEndpointError(message: string): string {
  if (/endpoint limit reached/i.test(message)) {
    return "You've reached your plan's endpoint limit. Upgrade in Settings → Billing to add more.";
  }
  return message;
}
