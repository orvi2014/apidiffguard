import { NextResponse } from "next/server";
import { runHttpCheck } from "@/lib/http-check";
import { readJsonBody, requireApiUser } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const parsed = await readJsonBody<{
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      timeoutMs?: number;
    }>(request, 32_000);
    if ("error" in parsed) return parsed.error;

    const body = parsed.data;
    if (!body.url?.trim()) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    const result = await runHttpCheck({
      url: body.url,
      method: body.method || "GET",
      headers: body.headers,
      timeoutMs: body.timeoutMs,
    });

    if (result.error && result.statusCode === 0 && !result.responseTime) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Check request failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
