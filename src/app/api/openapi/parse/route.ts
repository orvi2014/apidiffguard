import { NextResponse } from "next/server";
import { OpenAPIParseError, parseOpenAPIDocument } from "@/lib/openapi";
import { readJsonBody, requireApiUser } from "@/lib/api-guard";

export const runtime = "nodejs";

const MAX_SPEC_CHARS = 1_500_000;

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const parsed = await readJsonBody<{
      content?: string;
      serverUrl?: string;
    }>(request, MAX_SPEC_CHARS + 64_000);
    if ("error" in parsed) return parsed.error;

    const body = parsed.data;
    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "Provide OpenAPI JSON or YAML content." },
        { status: 400 }
      );
    }

    if (body.content.length > MAX_SPEC_CHARS) {
      return NextResponse.json(
        { error: "OpenAPI document is too large." },
        { status: 413 }
      );
    }

    const spec = parseOpenAPIDocument(body.content, {
      serverUrl: body.serverUrl,
    });

    return NextResponse.json({ spec });
  } catch (error) {
    const message =
      error instanceof OpenAPIParseError
        ? error.message
        : "Failed to parse OpenAPI document.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
