import {
  MAX_FETCH_BYTES,
  parseAndAssertPublicUrl,
  readResponseTextLimited,
  safeFetch,
  sanitizeOutboundHeaders,
} from "@/lib/safe-url";

const BLOCKED_METHODS = new Set(["TRACE", "CONNECT"]);

function parseBody(text: string, contentType: string | null): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const type = contentType?.toLowerCase() ?? "";
  if (
    type.includes("json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed;
    }
  }
  return trimmed.length > 8000 ? `${trimmed.slice(0, 8000)}…` : trimmed;
}

export type HttpCheckResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
  contentSize: number;
  error?: string;
};

export async function runHttpCheck(input: {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}): Promise<HttpCheckResult> {
  try {
    parseAndAssertPublicUrl(input.url ?? "");
  } catch (err) {
    return {
      statusCode: 0,
      headers: {},
      body: null,
      responseTime: 0,
      contentSize: 0,
      error: err instanceof Error ? err.message : "Invalid URL.",
    };
  }

  const method = (input.method || "GET").toUpperCase();
  if (BLOCKED_METHODS.has(method)) {
    return {
      statusCode: 0,
      headers: {},
      body: null,
      responseTime: 0,
      contentSize: 0,
      error: `Method ${method} is not allowed.`,
    };
  }

  const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 15000, 1000), 30000);
  const headers = sanitizeOutboundHeaders(input.headers);
  headers.set(
    "User-Agent",
    "APIDiffGuard/0.1 (+https://apidiffguard.com; check)"
  );
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json, text/plain, */*");
  }

  const started = Date.now();
  let response: Response;
  try {
    response = await safeFetch(input.url.trim(), {
      method,
      headers,
      body:
        input.body && method !== "GET" && method !== "HEAD"
          ? input.body
          : undefined,
      timeoutMs,
    });
  } catch (err) {
    return {
      statusCode: 0,
      headers: {},
      body: null,
      responseTime: Date.now() - started,
      contentSize: 0,
      error: err instanceof Error ? err.message : "Request failed.",
    };
  }

  const responseTime = Date.now() - started;
  let text: string;
  try {
    text = await readResponseTextLimited(response, MAX_FETCH_BYTES);
  } catch (err) {
    return {
      statusCode: response.status,
      headers: {},
      body: null,
      responseTime,
      contentSize: 0,
      error: err instanceof Error ? err.message : "Response too large.",
    };
  }

  const contentSize = new TextEncoder().encode(text).length;
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: parseBody(text, response.headers.get("content-type")),
    responseTime,
    contentSize,
  };
}
