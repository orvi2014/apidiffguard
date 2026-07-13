"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { planEndpointLimit } from "@/lib/plans";
import { getWorkspaceContext } from "@/lib/workspace";
import { compareJson, summarizeChanges } from "@/lib/diff-engine";
import { runHttpCheck } from "@/lib/http-check";

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

function authHeadersFromEndpoint(endpoint: {
  auth_type?: string | null;
  auth_config?: unknown;
  headers?: unknown;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (endpoint.headers && typeof endpoint.headers === "object") {
    for (const [k, v] of Object.entries(
      endpoint.headers as Record<string, unknown>
    )) {
      if (typeof v === "string" && v) out[k] = v;
    }
  }
  const config =
    endpoint.auth_config && typeof endpoint.auth_config === "object"
      ? (endpoint.auth_config as Record<string, string>)
      : {};
  const type = String(endpoint.auth_type ?? "NONE").toUpperCase();
  if (type === "BEARER" || type === "OAUTH") {
    if (config.token) out.Authorization = `Bearer ${config.token}`;
  } else if (type === "API_KEY") {
    const header = config.header || "X-API-Key";
    if (config.key) out[header] = config.key;
  } else if (type === "BASIC") {
    const user = config.username ?? "";
    const pass = config.password ?? "";
    if (user) {
      out.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
    }
  } else if (type === "CUSTOM") {
    if (config.header && config.value) out[config.header] = config.value;
  }
  return out;
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
    .select("body, status_code, headers, response_time, content_size")
    .eq("id", diff.check_id)
    .single();

  if (!check) return { error: "Check for this diff was not found." };

  const { data: latest } = await supabase
    .from("baselines")
    .select("version")
    .eq("endpoint_id", diff.endpoint_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latest?.version ?? 0) + 1;

  await supabase
    .from("baselines")
    .update({ is_active: false })
    .eq("endpoint_id", diff.endpoint_id)
    .eq("is_active", true);

  const { error: baselineError } = await supabase.from("baselines").insert({
    endpoint_id: diff.endpoint_id,
    version,
    body: check.body,
    status_code: check.status_code,
    headers: check.headers ?? {},
    response_time: check.response_time ?? 0,
    content_size: check.content_size ?? 0,
    notes: "Accepted from diff",
    approved: true,
    is_active: true,
  });

  if (baselineError) return { error: baselineError.message };

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

  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const method = mapMethod(String(formData.get("method") ?? "GET"));
  const environment = String(formData.get("env") ?? "production").trim();
  const authType = mapAuth(String(formData.get("auth") ?? "none"));
  const description = String(formData.get("desc") ?? "").trim() || null;
  const authConfig = buildAuthConfig(authType, formData);

  if (!name || !url) {
    return { error: "Name and URL are required." };
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

  const { data, error } = await supabase
    .from("endpoints")
    .insert({
      name,
      url,
      method,
      environment,
      auth_type: authType,
      auth_config: authConfig,
      description,
      workspace_id: ctx.workspaceId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

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
  }>
) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized", count: 0 };

  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    return { error: "No endpoints to import.", count: 0 };
  }
  if (endpoints.length > 200) {
    return { error: "Import is limited to 200 endpoints per batch.", count: 0 };
  }

  const supabase = await createClient();
  let toImport = endpoints;
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
      };
    }
    toImport = endpoints.slice(0, remaining);
  }

  const rows = toImport.slice(0, 200).map((ep) => ({
    name: ep.name,
    url: ep.url,
    method: mapMethod(ep.method),
    description: ep.description ?? null,
    tags: ep.tags ?? [],
    auth_type: mapAuth(ep.authType ?? "none"),
    workspace_id: ctx.workspaceId,
    environment: "production",
  }));

  const { data, error } = await supabase
    .from("endpoints")
    .insert(rows)
    .select("id");

  if (error) return { error: error.message, count: 0 };

  await supabase.from("activities").insert({
    type: "endpoint_added",
    title: "OpenAPI import",
    description: `Imported ${data.length} endpoints`,
    workspace_id: ctx.workspaceId,
  });

  revalidatePath("/endpoints");
  revalidatePath("/dashboard");
  return { count: data.length };
}

export async function deleteEndpoint(endpointId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("endpoints")
    .delete()
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId);

  if (error) return { error: error.message };

  revalidatePath("/endpoints");
  revalidatePath("/dashboard");
  redirect("/endpoints");
}

export async function captureBaselineAction(endpointId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: endpoint, error: epError } = await supabase
    .from("endpoints")
    .select("*")
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .single();

  if (epError || !endpoint) return { error: "Endpoint not found." };

  await supabase
    .from("endpoints")
    .update({ health: "CHECKING" })
    .eq("id", endpointId);

  const result = await runHttpCheck({
    url: endpoint.url,
    method: endpoint.method,
    timeoutMs: endpoint.timeout_ms,
    headers: authHeadersFromEndpoint(endpoint),
  });

  if (result.error && result.statusCode === 0) {
    await supabase
      .from("endpoints")
      .update({ health: "UNKNOWN" })
      .eq("id", endpointId);
    return { error: result.error };
  }

  const { data: latest } = await supabase
    .from("baselines")
    .select("version")
    .eq("endpoint_id", endpointId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latest?.version ?? 0) + 1;

  await supabase
    .from("baselines")
    .update({ is_active: false })
    .eq("endpoint_id", endpointId)
    .eq("is_active", true);

  const { data: baseline, error: blError } = await supabase
    .from("baselines")
    .insert({
      endpoint_id: endpointId,
      version,
      status_code: result.statusCode,
      headers: result.headers,
      body: result.body,
      response_time: result.responseTime,
      content_size: result.contentSize,
      notes: "Captured from live check",
      approved: true,
      is_active: true,
    })
    .select("id, version")
    .single();

  if (blError) return { error: blError.message };

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

  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("*")
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .single();

  if (!endpoint) return { error: "Endpoint not found." };

  const { data: baseline } = await supabase
    .from("baselines")
    .select("*")
    .eq("endpoint_id", endpointId)
    .eq("is_active", true)
    .maybeSingle();

  if (!baseline) {
    return { error: "Capture a baseline before running a check." };
  }

  await supabase
    .from("endpoints")
    .update({ health: "CHECKING" })
    .eq("id", endpointId);

  const result = await runHttpCheck({
    url: endpoint.url,
    method: endpoint.method,
    timeoutMs: endpoint.timeout_ms,
    headers: authHeadersFromEndpoint(endpoint),
  });

  if (result.error && result.statusCode === 0) {
    await supabase
      .from("endpoints")
      .update({ health: "UNKNOWN" })
      .eq("id", endpointId);
    return { error: result.error };
  }

  const { data: checkRow } = await supabase
    .from("checks")
    .insert({
      endpoint_id: endpointId,
      status: "SUCCESS",
      status_code: result.statusCode,
      headers: result.headers,
      body: result.body,
      response_time: result.responseTime,
      content_size: result.contentSize,
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const changes = compareJson(baseline.body, result.body);
  if (baseline.status_code !== result.statusCode) {
    changes.unshift({
      id: "chg_status",
      path: "$status",
      type: "status_changed",
      severity: "breaking",
      oldValue: baseline.status_code,
      newValue: result.statusCode,
      message: `HTTP status changed ${baseline.status_code} → ${result.statusCode}`,
    });
  }

  const summary = summarizeChanges(changes);
  const health =
    summary.breakingCount > 0
      ? "BREAKING"
      : summary.warningCount > 0
        ? "WARNING"
        : "HEALTHY";

  const { data: diff } = await supabase
    .from("diffs")
    .insert({
      endpoint_id: endpointId,
      baseline_id: baseline.id,
      check_id: checkRow?.id ?? null,
      summary,
      changes,
      breaking_count: summary.breakingCount,
      warning_count: summary.warningCount,
      info_count: summary.infoCount,
    })
    .select("id")
    .single();

  await supabase
    .from("endpoints")
    .update({
      health,
      response_time: result.responseTime,
      last_checked_at: new Date().toISOString(),
      breaking_count: summary.breakingCount,
      warning_count: summary.warningCount,
    })
    .eq("id", endpointId);

  await supabase.from("activities").insert({
    type: summary.breakingCount ? "diff_detected" : "check_run",
    title: summary.breakingCount
      ? `Breaking changes on ${endpoint.name}`
      : `Check completed · ${endpoint.name}`,
    description: `${summary.breakingCount} breaking · ${summary.warningCount} warnings`,
    workspace_id: ctx.workspaceId,
    metadata: diff ? { diffId: diff.id } : null,
  });

  revalidatePath(`/endpoints/${endpointId}`);
  revalidatePath("/endpoints");
  revalidatePath("/dashboard");

  return {
    success: true,
    diffId: diff?.id,
    breakingCount: summary.breakingCount,
    warningCount: summary.warningCount,
    changeCount: changes.length,
  };
}
