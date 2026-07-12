import { NextResponse } from "next/server";
import { OpenAPIParseError } from "@/lib/openapi";
import { loadOpenAPISpecFromUrl } from "@/lib/openapi-fetch";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;

  return false;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      url?: string;
      serverUrl?: string;
    };

    const rawUrl = body.url?.trim();
    if (!rawUrl) {
      return NextResponse.json(
        { error: "Provide an OpenAPI document URL." },
        { status: 400 }
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return NextResponse.json(
        { error: "Only http and https URLs are allowed." },
        { status: 400 }
      );
    }

    if (isBlockedHost(parsed.hostname)) {
      return NextResponse.json(
        { error: "That host cannot be fetched from the server." },
        { status: 400 }
      );
    }

    const result = await loadOpenAPISpecFromUrl(parsed.toString(), {
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
