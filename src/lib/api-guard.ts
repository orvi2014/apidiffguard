import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function requireApiUser(request: Request) {
  const limited = rateLimit(clientKey(request), 60, 60_000);
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

  const userLimited = rateLimit(`u:${user.id}:api`, 30, 60_000);
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

export async function readJsonBody<T>(
  request: Request,
  maxBytes = 1_000_000
): Promise<{ data: T } | { error: NextResponse }> {
  const raw = await request.text();
  if (raw.length > maxBytes) {
    return {
      error: NextResponse.json(
        { error: `Request body exceeds ${maxBytes} bytes.` },
        { status: 413 }
      ),
    };
  }
  try {
    return { data: JSON.parse(raw || "{}") as T };
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}
