"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  if (!name || !url) {
    return { error: "Name and URL are required." };
  }

  const { data, error } = await supabase
    .from("endpoints")
    .insert({
      name,
      url,
      method,
      environment,
      auth_type: authType,
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
  const rows = endpoints.slice(0, 200).map((ep) => ({
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
