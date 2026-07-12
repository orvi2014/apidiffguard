const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Safe in-app redirect path: absolute path, no protocol-relative or scheme. */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!value) return fallback;
  const next = value.trim();
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;
  if (next.includes("\\")) return fallback;
  if (/[\0\r\n]/.test(next)) return fallback;
  return next;
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function isIpv4(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function ipv4Octets(host: string): number[] | null {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return parts;
}

function isBlockedIpv4(host: string): boolean {
  const octets = ipv4Octets(host);
  if (!octets) return false;
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function expandIpv6(host: string): string | null {
  let h = host.toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  if (h.includes("%")) h = h.split("%")[0]!;
  if (!h.includes(":")) return null;

  // IPv4-mapped / IPv4-compatible
  const v4Tail = h.match(/:((\d{1,3}\.){3}\d{1,3})$/);
  if (v4Tail) {
    const mapped = v4Tail[1]!;
    if (isBlockedIpv4(mapped)) return "blocked-v4-mapped";
    h = h.replace(/:((\d{1,3}\.){3}\d{1,3})$/, "");
  }

  const sides = h.split("::");
  if (sides.length > 2) return null;
  let head = sides[0] ? sides[0].split(":").filter(Boolean) : [];
  let tail = sides[1] ? sides[1].split(":").filter(Boolean) : [];
  if (sides.length === 1) {
    head = h.split(":").filter(Boolean);
    tail = [];
  }
  const missing = 8 - head.length - tail.length;
  if (missing < 0) return null;
  const full = [
    ...head,
    ...Array.from({ length: sides.length === 2 ? missing : 0 }, () => "0"),
    ...tail,
  ];
  if (full.length !== 8) return null;
  return full.map((p) => p.padStart(4, "0")).join(":");
}

function isBlockedIpv6(host: string): boolean {
  const expanded = expandIpv6(host);
  if (!expanded) return host.includes(":");
  if (expanded === "blocked-v4-mapped") return true;
  // ::1 loopback
  if (expanded === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  // :: (unspecified)
  if (expanded === "0000:0000:0000:0000:0000:0000:0000:0000") return true;
  // fc00::/7 ULA
  const first = parseInt(expanded.slice(0, 4), 16);
  if ((first & 0xfe00) === 0xfc00) return true;
  // fe80::/10 link-local
  if ((first & 0xffc0) === 0xfe80) return true;
  // ff00::/8 multicast
  if ((first & 0xff00) === 0xff00) return true;
  // ::ffff:0:0/96 IPv4-mapped — check embedded v4
  if (expanded.startsWith("0000:0000:0000:0000:0000:ffff:")) {
    const hi = parseInt(expanded.slice(30, 34), 16);
    const lo = parseInt(expanded.slice(35, 39), 16);
    const a = (hi >> 8) & 0xff;
    const b = hi & 0xff;
    const c = (lo >> 8) & 0xff;
    const d = lo & 0xff;
    return isBlockedIpv4(`${a}.${b}.${c}.${d}`);
  }
  return false;
}

export function isBlockedHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return true;

  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".intranet") ||
    host.endsWith(".corp") ||
    host.endsWith(".home") ||
    host.endsWith(".lan")
  ) {
    return true;
  }

  // Decimal / hex IP tricks often still parse via URL — block bare "localhost" variants
  if (host.includes("localhost")) return true;

  if (isIpv4(host)) return isBlockedIpv4(host);
  if (host.includes(":")) return isBlockedIpv6(host);

  return false;
}

export function parseAndAssertPublicUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("URL is required.");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("Only http/https URLs are allowed.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URLs with credentials are not allowed.");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error("That host cannot be requested from the server.");
  }
  return parsed;
}

export const MAX_FETCH_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECTS = 5;

const BLOCKED_REQUEST_HEADERS = new Set([
  "host",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "te",
  "trailer",
  "upgrade",
  "cookie",
  "cookie2",
  "authorization",
  "proxy-authorization",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "forwarded",
]);

export function sanitizeOutboundHeaders(
  input?: Record<string, string>
): Headers {
  const headers = new Headers();
  if (!input) return headers;
  for (const [key, value] of Object.entries(input)) {
    const lower = key.toLowerCase();
    if (BLOCKED_REQUEST_HEADERS.has(lower) || lower.startsWith("proxy-")) {
      continue;
    }
    headers.set(key, value);
  }
  return headers;
}

export async function readResponseTextLimited(
  response: Response,
  maxBytes = MAX_FETCH_BYTES
): Promise<string> {
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader) {
    const declared = Number(lengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new Error(`Response exceeds ${maxBytes} byte limit.`);
    }
  }

  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => undefined);
      throw new Error(`Response exceeds ${maxBytes} byte limit.`);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/**
 * Fetch with manual redirects so each hop is re-validated against SSRF rules.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  let current = parseAndAssertPublicUrl(rawUrl);
  const timeoutMs = init.timeoutMs ?? 15000;
  let method = (init.method || "GET").toUpperCase();
  let body = init.body;
  const headers = new Headers(init.headers);

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const response = await fetch(current.toString(), {
      method,
      headers,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      body,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect without Location header.");
      }
      const next = new URL(location, current);
      parseAndAssertPublicUrl(next.toString());
      current = next;
      // Redirects become GET for 301/302/303; keep method for 307/308
      if ([301, 302, 303].includes(response.status) && method !== "HEAD") {
        method = "GET";
        body = undefined;
      }
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects.");
}
