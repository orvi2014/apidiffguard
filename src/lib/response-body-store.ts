import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";

export const RESPONSE_BUCKET = "response-bodies";

/**
 * Bodies at or below this stay in Postgres.
 *
 * A round trip to object storage costs more than the bytes save for a typical
 * JSON response, and inline rows keep the diff viewer a single query. The
 * limit is about where a response stops being "a payload" and starts being
 * "a file".
 */
export const INLINE_BODY_LIMIT = 16 * 1024;

export type StoredBody = {
  /** Non-null when the body stayed in the row. */
  body: unknown;
  /** Non-null when the body went to object storage. */
  bodyRef: string | null;
};

function serialize(body: unknown): string {
  return JSON.stringify(body ?? null);
}

/**
 * Persist a response body, inline or offloaded.
 *
 * The key is the content hash, so a healthy endpoint returning byte-identical
 * JSON on every run writes one object rather than one per check.
 */
export async function storeResponseBody(
  endpointId: string,
  body: unknown
): Promise<StoredBody> {
  if (body === null || body === undefined) {
    return { body: null, bodyRef: null };
  }

  const serialized = serialize(body);
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes <= INLINE_BODY_LIMIT) {
    return { body, bodyRef: null };
  }

  const digest = createHash("sha256").update(serialized).digest("hex");
  const key = `${endpointId}/${digest}.json`;

  const service = createServiceClient();
  const { error } = await service.storage
    .from(RESPONSE_BUCKET)
    .upload(key, serialized, {
      contentType: "application/json",
      // Content-addressed, so an existing object with this key is already the
      // same bytes. Overwriting is harmless and avoids a pre-flight existence
      // check on every single write.
      upsert: true,
    });

  if (error) {
    // Falling back to inline keeps the check working; the row is larger than we
    // would like, and the offload sweep will retry it later.
    return { body, bodyRef: null };
  }

  return { body: null, bodyRef: key };
}

/** Resolve a row's body, fetching from storage when it was offloaded. */
export async function hydrateResponseBody(row: {
  body?: unknown;
  body_ref?: string | null;
}): Promise<unknown> {
  if (!row.body_ref) return row.body ?? null;

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(RESPONSE_BUCKET)
    .download(row.body_ref);

  if (error || !data) return null;

  try {
    return JSON.parse(await data.text()) as unknown;
  } catch {
    return null;
  }
}

/**
 * Move oversized inline bodies into storage, oldest first.
 *
 * This is the migration path for rows written before offloading existed: the
 * encryption-style "do it in SQL" option does not exist when the destination is
 * an object store, so it runs incrementally from the maintenance cron instead
 * of as one long-running migration.
 */
export async function offloadLargeBodies(
  supabase: SupabaseClient,
  opts: { limit?: number } = {}
): Promise<{ scanned: number; offloaded: number }> {
  const limit = opts.limit ?? 50;

  const { data: rows } = await supabase
    .from("checks")
    .select("id, endpoint_id, body")
    .is("body_ref", null)
    .not("body", "is", null)
    .order("started_at", { ascending: true })
    .limit(limit);

  if (!rows?.length) return { scanned: 0, offloaded: 0 };

  let offloaded = 0;
  for (const row of rows) {
    const bytes = Buffer.byteLength(serialize(row.body), "utf8");
    if (bytes <= INLINE_BODY_LIMIT) continue;

    const stored = await storeResponseBody(String(row.endpoint_id), row.body);
    if (!stored.bodyRef) continue;

    const { error } = await supabase
      .from("checks")
      .update({ body: null, body_ref: stored.bodyRef })
      .eq("id", row.id);

    if (!error) offloaded += 1;
  }

  return { scanned: rows.length, offloaded };
}
