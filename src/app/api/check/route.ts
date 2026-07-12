import { NextResponse } from "next/server";
import { runHttpCheck } from "@/lib/http-check";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      timeoutMs?: number;
    };

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
