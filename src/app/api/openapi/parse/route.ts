import { NextResponse } from "next/server";
import { OpenAPIParseError, parseOpenAPIDocument } from "@/lib/openapi";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      content?: string;
      serverUrl?: string;
    };

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "Provide OpenAPI JSON or YAML content." },
        { status: 400 }
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
