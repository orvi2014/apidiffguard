import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function requireApiUser(request: Request) {
  const limited = await rateLimit(clientKey(request), 60, 60_000);
  if (!limited.ok) {
    return {
      error: NextResponse.json(
        { error: "Too many requests." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        }
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const userLimited = await rateLimit(`u:${user.id}:api`, 30, 60_000);
  if (!userLimited.ok) {
    return {
      error: NextResponse.json(
        { error: "Too many requests." },
        {
          status: 429,
          headers: { "Retry-After": String(userLimited.retryAfterSec) },
        }
      ),
    };
  }

  return { user, supabase };
}

function tooLarge(maxBytes: number) {
  return {
    error: NextResponse.json(
      { error: `Request body exceeds ${maxBytes} bytes.` },
      { status: 413 }
    ),
  };
}

/**
 * Read a JSON body with a hard byte ceiling.
 *
 * Streams and aborts as soon as the limit is crossed rather than buffering the
 * whole body first — otherwise the memory is already allocated by the time the
 * check runs. Counts bytes, not UTF-16 code units, so multi-byte input can't
 * slip through at several times the stated limit.
 */
export async function readJsonBody<T>(
  request: Request,
  maxBytes = 1_000_000
): Promise<{ data: T } | { error: NextResponse }> {
  // Fast path: trust an explicit oversized Content-Length and skip reading.
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return tooLarge(maxBytes);
  }

  const body = request.body;
  let raw: string;

  if (!body) {
    raw = "";
  } else {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          return tooLarge(maxBytes);
        }
        chunks.push(value);
      }
    } catch {
      return {
        error: NextResponse.json(
          { error: "Could not read request body." },
          { status: 400 }
        ),
      };
    }
    raw = Buffer.concat(chunks).toString("utf8");
  }

  try {
    return { data: JSON.parse(raw || "{}") as T };
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}
