import { parse as parseYaml } from "yaml";
import {
  extractOperationResponseSchema,
  type JsonSchema,
} from "./contract-validate";
import type { AuthType, HttpMethod } from "./types";

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);

export interface OpenAPIDocument {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  host?: string;
  basePath?: string;
  schemes?: string[];
  servers?: Array<{ url: string; description?: string }>;
  paths?: Record<string, Record<string, OpenAPIOperation | unknown>>;
  components?: {
    securitySchemes?: Record<string, SecurityScheme>;
  };
  securityDefinitions?: Record<string, SecurityScheme>;
  security?: Array<Record<string, string[]>>;
  tags?: Array<{ name: string; description?: string }>;
}

export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
}

export interface SecurityScheme {
  type?: string;
  scheme?: string;
  name?: string;
  in?: string;
  flows?: unknown;
}

export interface ParsedOpenAPIEndpoint {
  id: string;
  name: string;
  path: string;
  method: HttpMethod;
  url: string;
  description?: string;
  tags: string[];
  operationId?: string;
  deprecated: boolean;
  authType: AuthType;
  server: string;
  /** Primary JSON response schema when present in the OpenAPI operation. */
  responseSchema?: JsonSchema | null;
}

export interface ParsedOpenAPISpec {
  title: string;
  version: string;
  description?: string;
  openapiVersion: string;
  servers: string[];
  authType: AuthType;
  endpoints: ParsedOpenAPIEndpoint[];
  tagCounts: Record<string, number>;
}

export class OpenAPIParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAPIParseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function looksLikeHtml(raw: string): boolean {
  const head = raw.trim().slice(0, 280).toLowerCase();
  return (
    head.startsWith("<!doctype html") ||
    head.startsWith("<html") ||
    (head.includes("<head") && head.includes("swagger"))
  );
}

export function looksLikeSwaggerInitJs(raw: string): boolean {
  return (
    raw.includes("swaggerDoc") &&
    (raw.includes("SwaggerUIBundle") ||
      raw.includes("swagger-ui") ||
      raw.includes("window.onload"))
  );
}

/** Extract a JSON object starting at `start` (index of '{'), respecting strings. */
function extractJsonObject(source: string, start: number): string {
  if (source[start] !== "{") {
    throw new OpenAPIParseError("Expected JSON object while reading swaggerDoc.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }

  throw new OpenAPIParseError("Unterminated swaggerDoc object in Swagger UI bundle.");
}

export function extractSwaggerDocFromInitJs(source: string): unknown {
  const patterns = ['"swaggerDoc"', "swaggerDoc"];
  let markerAt = -1;

  for (const pattern of patterns) {
    const idx = source.indexOf(pattern);
    if (idx !== -1) {
      markerAt = idx;
      break;
    }
  }

  if (markerAt === -1) {
    throw new OpenAPIParseError(
      "Swagger UI script did not contain an embedded swaggerDoc."
    );
  }

  const colon = source.indexOf(":", markerAt);
  if (colon === -1) {
    throw new OpenAPIParseError("Malformed swaggerDoc assignment.");
  }

  let i = colon + 1;
  while (i < source.length && /\s/.test(source[i]!)) i++;

  const json = extractJsonObject(source, i);
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new OpenAPIParseError("Embedded swaggerDoc is not valid JSON.");
  }
}

export function findSwaggerUiFollowUpUrls(
  html: string,
  pageUrl: string
): string[] {
  const base = pageUrl.endsWith("/") ? pageUrl : `${pageUrl}/`;
  const page = new URL(pageUrl);
  const urls = new Set<string>();

  const scriptSrc =
    html.match(/src=["']([^"']*swagger-ui-init\.js[^"']*)["']/i)?.[1] ??
    html.match(/src=["']([^"']*swagger-initializer\.js[^"']*)["']/i)?.[1];
  if (scriptSrc) {
    urls.add(new URL(scriptSrc, base).toString());
  } else {
    urls.add(new URL("swagger-ui-init.js", base).toString());
    urls.add(new URL("swagger-initializer.js", base).toString());
  }

  for (const match of html.matchAll(
    /(?:url|urls)\s*[:=]\s*\[\s*\{\s*url:\s*["']([^"']+)["']/gi
  )) {
    urls.add(new URL(match[1]!, base).toString());
  }
  for (const match of html.matchAll(/\burl:\s*["']([^"']+\.(?:json|yaml|yml))["']/gi)) {
    urls.add(new URL(match[1]!, base).toString());
  }

  // NestJS / Spring common companions
  const origin = page.origin;
  const path = page.pathname.replace(/\/$/, "");
  for (const candidate of [
    `${origin}${path}-json`,
    `${origin}${path}/swagger.json`,
    `${origin}${path}/openapi.json`,
    `${origin}/v3/api-docs`,
    `${origin}/swagger.json`,
    `${origin}/openapi.json`,
  ]) {
    urls.add(candidate);
  }

  return [...urls];
}

export function parseOpenAPIContent(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new OpenAPIParseError("Document is empty.");
  }

  if (looksLikeHtml(trimmed)) {
    throw new OpenAPIParseError(
      "That URL is a Swagger UI page, not a raw OpenAPI file. Use Import URL and we’ll resolve swagger-ui-init.js automatically — or paste the OpenAPI JSON/YAML."
    );
  }

  if (looksLikeSwaggerInitJs(trimmed)) {
    return extractSwaggerDocFromInitJs(trimmed);
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      throw new OpenAPIParseError("Invalid JSON OpenAPI document.");
    }
  }

  try {
    return parseYaml(trimmed) as unknown;
  } catch {
    throw new OpenAPIParseError(
      "Invalid OpenAPI document. Expected JSON, YAML, or a Swagger UI swagger-ui-init.js bundle."
    );
  }
}

/**
 * Prefer a server URL that matches the docs host when the embedded
 * servers list only contains staging/localhost entries.
 */
export function pickServerForDocsHost(
  servers: string[],
  docsUrl?: string
): string | undefined {
  if (!docsUrl) return servers[0];
  try {
    const host = new URL(docsUrl).hostname;
    const match = servers.find((s) => {
      try {
        return new URL(s).hostname === host;
      } catch {
        return false;
      }
    });
    if (match) return match;

    // api.example.com/docs → https://api.example.com/api/v1 when no match
    if (host.startsWith("api.")) {
      return `https://${host}/api/v1`;
    }
  } catch {
    /* ignore */
  }
  return servers[0];
}

function resolveServers(doc: OpenAPIDocument): string[] {
  if (doc.servers?.length) {
    return doc.servers
      .map((s) => s.url?.trim())
      .filter((url): url is string => Boolean(url));
  }

  if (doc.host) {
    const scheme = doc.schemes?.[0] ?? "https";
    const base = doc.basePath ?? "";
    return [`${scheme}://${doc.host}${base}`.replace(/\/$/, "")];
  }

  return [""];
}

function joinUrl(server: string, path: string): string {
  if (!server) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = server.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  // OpenAPI servers can include path prefixes; avoid double slashes
  return `${base}${suffix}`.replace(/([^:]\/)\/+/g, "$1");
}

function inferAuthType(doc: OpenAPIDocument): AuthType {
  const schemes = {
    ...(doc.components?.securitySchemes ?? {}),
    ...(doc.securityDefinitions ?? {}),
  };

  const values = Object.values(schemes);
  if (!values.length) return "none";

  for (const scheme of values) {
    const type = scheme.type?.toLowerCase();
    if (type === "oauth2") return "oauth";
    if (type === "http" && scheme.scheme?.toLowerCase() === "bearer") {
      return "bearer";
    }
    if (type === "http" && scheme.scheme?.toLowerCase() === "basic") {
      return "basic";
    }
    if (type === "apikey") return "api_key";
  }

  return "custom";
}

function operationAuth(
  op: OpenAPIOperation,
  docAuth: AuthType,
  doc: OpenAPIDocument
): AuthType {
  if (op.security) {
    if (op.security.length === 0) return "none";
    return docAuth === "none" ? inferAuthType(doc) : docAuth;
  }
  if (doc.security?.length) return docAuth;
  return docAuth;
}

function humanizePath(method: string, path: string, op: OpenAPIOperation): string {
  if (op.summary?.trim()) return op.summary.trim();
  if (op.operationId?.trim()) {
    return op.operationId
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_.-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return `${method.toUpperCase()} ${path}`;
}

export function extractEndpointsFromOpenAPI(
  input: unknown,
  options: { serverUrl?: string } = {}
): ParsedOpenAPISpec {
  if (!isRecord(input)) {
    throw new OpenAPIParseError("OpenAPI document must be an object.");
  }

  const doc = input as OpenAPIDocument;
  const openapiVersion = doc.openapi ?? doc.swagger ?? "";

  if (!openapiVersion) {
    throw new OpenAPIParseError(
      "Missing openapi or swagger version field. Expected OpenAPI 3.x or Swagger 2.0."
    );
  }

  if (!doc.paths || !isRecord(doc.paths)) {
    throw new OpenAPIParseError("Document has no paths to import.");
  }

  const servers = resolveServers(doc);
  const selectedServer = options.serverUrl?.trim() || servers[0] || "";
  const docAuth = inferAuthType(doc);
  const endpoints: ParsedOpenAPIEndpoint[] = [];
  const tagCounts: Record<string, number> = {};

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!isRecord(pathItem)) continue;

    for (const [key, value] of Object.entries(pathItem)) {
      const methodKey = key.toLowerCase();
      if (!HTTP_METHODS.has(methodKey)) continue;
      if (!isRecord(value)) continue;

      const op = value as OpenAPIOperation;
      const method = methodKey.toUpperCase() as HttpMethod;
      const tags = op.tags?.length ? op.tags : ["untagged"];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }

      const id = `${method}:${path}`.toLowerCase().replace(/[^a-z0-9]+/g, "_");

      endpoints.push({
        id,
        name: humanizePath(method, path, op),
        path,
        method,
        url: joinUrl(selectedServer, path),
        description: op.description?.trim() || op.summary?.trim(),
        tags,
        operationId: op.operationId,
        deprecated: Boolean(op.deprecated),
        authType: operationAuth(op, docAuth, doc),
        server: selectedServer,
        responseSchema: extractOperationResponseSchema(op, doc),
      });
    }
  }

  endpoints.sort((a, b) => {
    if (a.path === b.path) return a.method.localeCompare(b.method);
    return a.path.localeCompare(b.path);
  });

  if (!endpoints.length) {
    throw new OpenAPIParseError("No HTTP operations found in paths.");
  }

  return {
    title: doc.info?.title?.trim() || "Untitled API",
    version: doc.info?.version?.trim() || "unknown",
    description: doc.info?.description?.trim(),
    openapiVersion,
    servers: servers.length ? servers : selectedServer ? [selectedServer] : [],
    authType: docAuth,
    endpoints,
    tagCounts,
  };
}

export function parseOpenAPIDocument(
  raw: string,
  options: { serverUrl?: string } = {}
): ParsedOpenAPISpec {
  const content = parseOpenAPIContent(raw);
  return extractEndpointsFromOpenAPI(content, options);
}

/** Well-known specs for one-click import */
export const OPENAPI_PRESETS = [
  {
    id: "agencyhandy",
    name: "AgencyHandy API",
    description: "Swagger UI docs — auto-resolves embedded OpenAPI",
    url: "https://api.agencyhandy.com/docs/",
  },
  {
    id: "openai",
    name: "OpenAI API",
    description: "Official OpenAI OpenAPI specification",
    url: "https://raw.githubusercontent.com/openai/openai-openapi/main/openapi.yaml",
  },
  {
    id: "petstore",
    name: "Petstore (demo)",
    description: "Swagger Petstore sample for testing imports",
    url: "https://petstore3.swagger.io/api/v3/openapi.json",
  },
] as const;
