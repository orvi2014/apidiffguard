import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  apiError,
  authenticateApiV1,
  isApiV1Failure,
} from "@/lib/api-v1";
import {
  HEALTH_VALUES,
  isHealthValue,
  readPagination,
} from "@/lib/api-v1-params";
import {
  ENDPOINT_PUBLIC_COLUMNS,
  serializeEndpoint,
} from "@/lib/api-v1-serialize";
import { buildStoredHeaders } from "@/lib/endpoint-auth";
import {
  authConfigFromJson,
  authConfigValid,
  isScheduleFrequency,
  normalizeAuthType,
  normalizeDiffMode,
  normalizeMethod,
} from "@/lib/endpoint-input";
import { MissingSecretKeyError } from "@/lib/crypto/secret-box";
import { sealEndpointCredentials } from "@/lib/endpoint-secrets";
import { normalizePlan, planAllowsSchedules, planEndpointLimit } from "@/lib/plans";
import { parseAndAssertPublicUrl } from "@/lib/safe-url";

export const runtime = "nodejs";

/** Matches the OpenAPI import cap: one request should not write unbounded rows. */
const MAX_BATCH = 200;

/**
 * GET /api/v1/endpoints — list the workspace's monitored endpoints.
 * Auth: Bearer adg_live_… with `endpoints:read`, or a signed-in session.
 * Query: limit, offset, health, environment.
 */
export async function GET(request: Request) {
  const ctx = await authenticateApiV1(request, "endpoints:read");
  if (isApiV1Failure(ctx)) return ctx;

  const url = new URL(request.url);
  const { limit, offset } = readPagination(url);

  let query = ctx.supabase
    .from("endpoints")
    .select(ENDPOINT_PUBLIC_COLUMNS, { count: "exact" })
    // Explicit even on the session client: the token path uses the service
    // role, which bypasses RLS, so this filter is the only tenant boundary.
    .eq("workspace_id", ctx.workspaceId);

  const health = url.searchParams.get("health");
  if (health) {
    if (!isHealthValue(health)) {
      return apiError(
        `health must be one of ${HEALTH_VALUES.join(", ")}.`,
        400
      );
    }
    query = query.eq("health", health.toUpperCase());
  }

  const environment = url.searchParams.get("environment");
  if (environment) query = query.eq("environment", environment);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(error.message, 500);

  return NextResponse.json({
    endpoints: (data ?? []).map(serializeEndpoint),
    pagination: { limit, offset, total: count ?? 0 },
  });
}

type EndpointInput = Record<string, unknown>;
type Skipped = { name: string; reason: string };

function readBatch(body: unknown): EndpointInput[] | null {
  if (Array.isArray(body)) return body as EndpointInput[];
  if (!body || typeof body !== "object") return null;
  const list = (body as Record<string, unknown>).endpoints;
  if (Array.isArray(list)) return list as EndpointInput[];
  // A single endpoint posted bare is the common case for one-off registration.
  return [body as EndpointInput];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * POST /api/v1/endpoints — register one or many endpoints.
 * Auth: Bearer adg_live_… with `endpoints:write`, or a signed-in session.
 *
 * Accepts a single endpoint object, an array, or `{ endpoints: [...] }`.
 *
 * Unlike the OpenAPI import — which deliberately lands everything as
 * `auth_type: NONE` because a spec file should never carry secrets — this
 * route takes credentials directly and seals them per row, so an integration
 * can register an authenticated endpoint without a human editing it afterwards.
 *
 * Held to the write rate limit rather than the read one, and capped per batch.
 * Individually invalid entries are reported in `skipped` instead of failing the
 * whole request, so one bad URL in a large import does not discard the rest.
 */
export async function POST(request: Request) {
  const ctx = await authenticateApiV1(request, "endpoints:write", {
    perMinute: 30,
  });
  if (isApiV1Failure(ctx)) return ctx;

  if (!ctx.canEdit) {
    return apiError("Your role cannot create endpoints.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Request body must be JSON.", 400);
  }

  const batch = readBatch(body);
  if (!batch || batch.length === 0) {
    return apiError(
      "Send an endpoint object, an array, or { endpoints: [...] }.",
      400
    );
  }
  if (batch.length > MAX_BATCH) {
    return apiError(`Import is limited to ${MAX_BATCH} endpoints per batch.`, 400);
  }

  const { data: workspace } = await ctx.supabase
    .from("workspaces")
    .select("plan")
    .eq("id", ctx.workspaceId)
    .maybeSingle();
  const plan = normalizePlan(workspace?.plan as string | undefined);

  const skipped: Skipped[] = [];
  const rows: Record<string, unknown>[] = [];
  const schedules: Record<string, unknown>[] = [];

  for (const input of batch) {
    const name = text(input.name);
    const url = text(input.url);
    const label = name || url || "(unnamed)";

    if (!name || !url) {
      skipped.push({ name: label, reason: "name and url are required." });
      continue;
    }

    try {
      parseAndAssertPublicUrl(url);
    } catch (err) {
      skipped.push({
        name: label,
        reason: err instanceof Error ? err.message : "Invalid URL.",
      });
      continue;
    }

    const authType = normalizeAuthType(
      (input.auth as Record<string, unknown> | undefined)?.type ?? input.authType
    );
    const authConfig = authConfigFromJson(authType, input.auth);
    if (!authConfigValid(authType, authConfig)) {
      skipped.push({
        name: label,
        reason: `auth.${authType.toLowerCase()} is missing its credential fields.`,
      });
      continue;
    }

    const id = randomUUID();
    let sealed: unknown;
    try {
      sealed = authType === "NONE" ? {} : sealEndpointCredentials(authConfig, id);
    } catch (err) {
      if (err instanceof MissingSecretKeyError) {
        return apiError(
          "Credential storage is not configured on this server. Set ENDPOINT_SECRET_KEY.",
          503
        );
      }
      skipped.push({
        name: label,
        reason: err instanceof Error ? err.message : "Could not seal credentials.",
      });
      continue;
    }

    const requestBody = text(input.requestBody);
    const contentType = text(input.contentType) || "application/json";
    const timeoutMs = Number(input.timeoutMs);

    rows.push({
      id,
      name,
      url,
      method: normalizeMethod(input.method),
      environment: text(input.environment) || "production",
      description: text(input.description) || null,
      tags: Array.isArray(input.tags)
        ? (input.tags as unknown[]).filter((t): t is string => typeof t === "string")
        : [],
      auth_type: authType,
      auth_config: sealed,
      headers: buildStoredHeaders({
        contentType: requestBody ? contentType : undefined,
        requestBody: requestBody || undefined,
      }),
      diff_mode: normalizeDiffMode(input.diffMode),
      timeout_ms:
        Number.isFinite(timeoutMs) && timeoutMs > 0
          ? Math.min(Math.trunc(timeoutMs), 60_000)
          : 10_000,
      workspace_id: ctx.workspaceId,
    });

    const frequency = text(
      (input.schedule as Record<string, unknown> | undefined)?.frequency
    ).toUpperCase();
    if (frequency) {
      if (!isScheduleFrequency(frequency)) {
        skipped.push({ name: label, reason: `Unknown schedule frequency ${frequency}.` });
      } else if (!planAllowsSchedules(plan)) {
        skipped.push({
          name: label,
          reason: `Scheduled checks need a Starter plan or above; the endpoint was created without one.`,
        });
      } else {
        schedules.push({
          endpoint_id: id,
          workspace_id: ctx.workspaceId,
          frequency,
          enabled: true,
          next_run_at: new Date().toISOString(),
        });
      }
    }
  }

  // The plan cap is applied after validation so a rejected entry does not eat
  // one of the remaining slots.
  const limit = planEndpointLimit(plan);
  let toInsert = rows;
  if (limit != null) {
    const { count } = await ctx.supabase
      .from("endpoints")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId);
    const remaining = Math.max(0, limit - (count ?? 0));
    if (remaining === 0) {
      return apiError(
        `Your ${plan} plan allows ${limit} endpoints. Upgrade in Settings → Billing to add more.`,
        402
      );
    }
    if (rows.length > remaining) {
      for (const row of rows.slice(remaining)) {
        skipped.push({
          name: String(row.name),
          reason: `Your ${plan} plan allows ${limit} endpoints.`,
        });
      }
      toInsert = rows.slice(0, remaining);
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ endpoints: [], created: 0, skipped }, { status: 200 });
  }

  const keptIds = new Set(toInsert.map((r) => r.id as string));

  const { data: inserted, error } = await ctx.supabase
    .from("endpoints")
    .insert(toInsert)
    .select(ENDPOINT_PUBLIC_COLUMNS);

  if (error) return apiError(error.message, 500);

  const keptSchedules = schedules.filter((s) =>
    keptIds.has(s.endpoint_id as string)
  );
  let scheduled = 0;
  if (keptSchedules.length) {
    const { error: scheduleError } = await ctx.supabase
      .from("schedules")
      .insert(keptSchedules);
    // The endpoints are already written; a schedule failure is reported rather
    // than rolled back, so the caller can retry just the schedules.
    if (scheduleError) {
      skipped.push({
        name: "(schedules)",
        reason: scheduleError.message,
      });
    } else {
      scheduled = keptSchedules.length;
    }
  }

  await ctx.supabase.from("activities").insert({
    type: "endpoint_added",
    title: "API import",
    description: `Registered ${inserted?.length ?? 0} endpoints via the REST API`,
    workspace_id: ctx.workspaceId,
  });

  return NextResponse.json(
    {
      endpoints: (inserted ?? []).map(serializeEndpoint),
      created: inserted?.length ?? 0,
      scheduled,
      skipped,
    },
    { status: 201 }
  );
}
