const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_METHODS = new Set(["TRACE", "CONNECT"]);

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
  timeoutMs?: number;
}): Promise<HttpCheckResult> {
  const rawUrl = input.url?.trim();
  if (!rawUrl) {
    return {
      statusCode: 0,
      headers: {},
      body: null,
      responseTime: 0,
      contentSize: 0,
      error: "URL is required.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      statusCode: 0,
      headers: {},
      body: null,
      responseTime: 0,
      contentSize: 0,
      error: "Invalid URL.",
    };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      statusCode: 0,
      headers: {},
      body: null,
      responseTime: 0,
      contentSize: 0,
      error: "Only http/https URLs are allowed.",
    };
  }

  if (isBlockedHost(parsed.hostname)) {
    return {
      statusCode: 0,
      headers: {},
      body: null,
      responseTime: 0,
      contentSize: 0,
      error: "That host cannot be requested from the server.",
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
  const headers = new Headers();
  headers.set(
    "User-Agent",
    "APIDiffGuard/0.1 (+https://apidiffguard.com; check)"
  );
  headers.set("Accept", "application/json, text/plain, */*");

  if (input.headers) {
    for (const [key, value] of Object.entries(input.headers)) {
      const lower = key.toLowerCase();
      if (
        lower === "host" ||
        lower === "content-length" ||
        lower.startsWith("proxy-")
      ) {
        continue;
      }
      headers.set(key, value);
    }
  }

  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      method,
      headers,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
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
  const text = await response.text();
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
