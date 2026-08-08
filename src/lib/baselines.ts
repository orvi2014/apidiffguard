import type { SupabaseClient } from "@supabase/supabase-js";
import { storeResponseBody } from "@/lib/response-body-store";

/** Postgres unique-violation. */
const UNIQUE_VIOLATION = "23505";

export type NewBaseline = {
  endpointId: string;
  body: unknown;
  statusCode: number;
  headers: unknown;
  responseTime: number;
  contentSize: number;
  notes: string;
  approved: boolean;
};

/**
 * Promote a response to the active baseline.
 *
 * Two things this gets right that the naive version did not:
 *
 * 1. The new row is inserted **and activated before** the old one is
 *    deactivated. Deactivating first means a failed insert leaves the endpoint
 *    with no active baseline at all, and every subsequent check errors with
 *    "Capture a baseline first."
 * 2. `version` is read-then-written, so concurrent promotions collide on the
 *    `(endpoint_id, version)` unique index. We retry on that collision instead
 *    of surfacing a raw Postgres error.
 *
 * Readers resolve the brief two-active window by taking the highest version.
 */
export async function promoteBaseline(
  supabase: SupabaseClient,
  input: NewBaseline,
  maxAttempts = 5
): Promise<{ id: string; version: number } | { error: string }> {
  let lastError = "Could not create a baseline.";

  // Stored once, before the retry loop: the content is identical on every
  // attempt, and the key is a content hash, so re-uploading per attempt would
  // be wasted work.
  const stored = await storeResponseBody(input.endpointId, input.body);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data: latest } = await supabase
      .from("baselines")
      .select("version")
      .eq("endpoint_id", input.endpointId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const version = (latest?.version ?? 0) + 1;

    const { data: inserted, error } = await supabase
      .from("baselines")
      .insert({
        endpoint_id: input.endpointId,
        version,
        body: stored.body,
        body_ref: stored.bodyRef,
        status_code: input.statusCode,
        headers: input.headers ?? {},
        response_time: input.responseTime,
        content_size: input.contentSize,
        notes: input.notes,
        approved: input.approved,
        is_active: true,
      })
      .select("id, version")
      .single();

    if (error) {
      lastError = error.message;
      // Someone else took this version number — re-read and try the next one.
      if (error.code === UNIQUE_VIOLATION) continue;
      return { error: error.message };
    }

    if (!inserted) return { error: lastError };

    // Now that a new active baseline exists, retire the previous ones.
    await supabase
      .from("baselines")
      .update({ is_active: false })
      .eq("endpoint_id", input.endpointId)
      .eq("is_active", true)
      .neq("id", inserted.id);

    return { id: inserted.id, version: inserted.version };
  }

  return { error: lastError };
}

/**
 * Make an existing baseline the active one. Same ordering rule: activate the
 * target first, then retire everything else.
 */
export async function activateBaseline(
  supabase: SupabaseClient,
  endpointId: string,
  baselineId: string
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase
    .from("baselines")
    .update({ is_active: true })
    .eq("id", baselineId)
    .eq("endpoint_id", endpointId);

  if (error) return { error: error.message };

  await supabase
    .from("baselines")
    .update({ is_active: false })
    .eq("endpoint_id", endpointId)
    .eq("is_active", true)
    .neq("id", baselineId);

  return { ok: true };
}
