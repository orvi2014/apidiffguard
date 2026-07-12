import { NextResponse } from "next/server";
import { OpenAPIParseError } from "@/lib/openapi";
import { loadOpenAPISpecFromUrl } from "@/lib/openapi-fetch";
import { parseAndAssertPublicUrl } from "@/lib/safe-url";
import { readJsonBody, requireApiUser } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const parsed = await readJsonBody<{
      url?: string;
      serverUrl?: string;
    }>(request, 16_000);
    if ("error" in parsed) return parsed.error;

    const body = parsed.data;
    const rawUrl = body.url?.trim();
    if (!rawUrl) {
      return NextResponse.json(
        { error: "Provide an OpenAPI document URL." },
        { status: 400 }
      );
    }

    try {
      parseAndAssertPublicUrl(rawUrl);
      if (body.serverUrl) parseAndAssertPublicUrl(body.serverUrl);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid URL." },
        { status: 400 }
      );
    }

    const result = await loadOpenAPISpecFromUrl(rawUrl, {
      serverUrl: body.serverUrl,
    });

    return NextResponse.json({
      spec: result.spec,
      sourceUrl: result.sourceUrl,
      resolvedFrom: result.resolvedFrom,
    });
  } catch (error) {
    if (error instanceof OpenAPIParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const cause =
      error instanceof Error && "cause" in error && error.cause instanceof Error
        ? error.cause.message
        : null;
    const message =
      error instanceof Error
        ? cause
          ? `${error.message}: ${cause}`
          : error.message
        : "Failed to fetch OpenAPI URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
