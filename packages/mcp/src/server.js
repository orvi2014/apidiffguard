import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  compareJson,
  describeChanges,
  inferSchema,
  summarizeChanges,
} from "@apidiffguard/diff";

export const DEFAULT_BASE_URL = "https://apidiffguard.com";

/** Bodies past this are refused rather than buffered: an agent wants a shape, not a dump. */
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const SAMPLE_CHARS = 4_000;
const RANK = { info: 0, warning: 1, breaking: 2 };

const INSTRUCTIONS = `APIDiffGuard tells you what an HTTP JSON API actually returns, and what changed since a known-good response.

Before writing code against an API you do not control, call snapshot_api to see the live response shape instead of trusting docs. To check whether an API still matches a response you saved earlier, use check_url or diff_json. Severities: "breaking" means code reading the old shape can fail (field removed, type changed); "warning" and "info" usually need no code change.`;

const HOSTED_INSTRUCTIONS = `

Workspace tools are enabled. Endpoints in the workspace are checked on a schedule. list_endpoints with health "breaking" finds what needs attention; get_diff says what changed; get_endpoint_schema gives the current shape to code against. Only call accept_diff after the calling code handles the change: it makes the new response the baseline, and the change will not be reported again.`;

function text(value) {
  return { type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) };
}

function ok(structured, summary) {
  return {
    content: summary ? [text(summary), text(structured)] : [text(structured)],
    structuredContent: structured,
  };
}

function fail(message) {
  return { content: [text(message)], isError: true };
}

/** Run a handler, turning a thrown error into a tool error the agent can read. */
function guarded(handler) {
  return async (args) => {
    try {
      return await handler(args);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  };
}

function parseJsonArg(value, label) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    // A plain string is a valid JSON value; only treat it as text when it
    // clearly was meant to be a document.
    if (/^\s*[[{]/.test(value)) throw new Error(`${label} is not valid JSON.`);
    return value;
  }
}

async function fetchResponse(fetchImpl, { url, method = "GET", headers = {}, body }) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }

  const started = Date.now();
  const res = await fetchImpl(parsed, {
    method,
    headers: { Accept: "application/json, */*;q=0.5", ...headers },
    body: body === undefined || method === "GET" || method === "HEAD" ? undefined : body,
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  const raw = await res.text();
  const responseTimeMs = Date.now() - started;
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    throw new Error(`Response is larger than ${MAX_BODY_BYTES / 1024 / 1024} MB.`);
  }

  let json;
  let isJson = true;
  try {
    json = raw === "" ? null : JSON.parse(raw);
  } catch {
    isJson = false;
  }

  return {
    status: res.status,
    contentType: res.headers.get("content-type"),
    responseTimeMs,
    raw,
    json,
    isJson,
  };
}

function compare(baseline, current, schemaOnly) {
  const changes = compareJson(baseline, current, { schemaOnly, arrayIdentity: true });
  return { changes, summary: summarizeChanges(changes), overview: describeChanges(changes) };
}

function registerLocalTools(server, fetchImpl) {
  server.registerTool(
    "snapshot_api",
    {
      title: "Snapshot an API response",
      description:
        "Call an HTTP endpoint and return the shape of its JSON response as JSON Schema: field names, types, which fields are always present, and string formats. Use it before writing code that reads a third-party API, so the code matches what the API returns today. Values are left out unless includeSample is true.",
      inputSchema: {
        url: z.string().describe("Full http(s) URL to call."),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).optional().describe("Defaults to GET."),
        headers: z.record(z.string(), z.string()).optional().describe("Request headers, e.g. an Authorization header."),
        body: z.string().optional().describe("Raw request body for non-GET requests."),
        includeSample: z.boolean().optional().describe(`Also return the first ${SAMPLE_CHARS} characters of the body. Off by default: responses can hold personal data.`),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guarded(async ({ url, method, headers, body, includeSample }) => {
      const res = await fetchResponse(fetchImpl, { url, method, headers, body });
      const result = {
        url,
        method: method ?? "GET",
        status: res.status,
        contentType: res.contentType,
        responseTimeMs: res.responseTimeMs,
        isJson: res.isJson,
        schema: res.isJson ? inferSchema(res.json) : null,
        ...(includeSample ? { sample: res.raw.slice(0, SAMPLE_CHARS) } : {}),
      };
      if (!res.isJson) {
        return ok(result, `HTTP ${res.status}: the response is not JSON (content-type ${res.contentType ?? "unknown"}).`);
      }
      return ok(result);
    })
  );

  server.registerTool(
    "diff_json",
    {
      title: "Diff two JSON documents",
      description:
        "Compare a baseline JSON document with a current one and classify every change as breaking, warning or info. Arrays of objects are matched by id-like keys, so reordering is not a change. With schemaOnly (the default) changed values are ignored and only structure counts: added, removed, retyped and newly-null fields.",
      inputSchema: {
        baseline: z.unknown().describe("The known-good document, as JSON or a JSON string."),
        current: z.unknown().describe("The document to check, as JSON or a JSON string."),
        schemaOnly: z.boolean().optional().describe("Ignore changed values. Defaults to true."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guarded(async ({ baseline, current, schemaOnly }) => {
      const result = compare(
        parseJsonArg(baseline, "baseline"),
        parseJsonArg(current, "current"),
        schemaOnly ?? true
      );
      return ok(result, result.overview);
    })
  );

  server.registerTool(
    "check_url",
    {
      title: "Check a live API against a saved response",
      description:
        "Call a URL and diff its JSON response against a saved baseline, the way `npx @apidiffguard/cli check` does in CI. Pass the baseline inline or as a path to a JSON file. Returns passed=false when any change is at or above failOn.",
      inputSchema: {
        url: z.string().describe("Full http(s) URL to call."),
        baseline: z.unknown().optional().describe("The known-good response, as JSON or a JSON string."),
        baselinePath: z.string().optional().describe("Path to a JSON file holding the known-good response."),
        headers: z.record(z.string(), z.string()).optional(),
        schemaOnly: z.boolean().optional().describe("Ignore changed values. Defaults to true."),
        failOn: z.enum(["breaking", "warning", "info"]).optional().describe("Defaults to breaking."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guarded(async ({ url, baseline, baselinePath, headers, schemaOnly, failOn }) => {
      if ((baseline === undefined) === (baselinePath === undefined)) {
        return fail("Pass exactly one of baseline or baselinePath.");
      }
      const expected =
        baselinePath !== undefined
          ? parseJsonArg(readFileSync(resolve(baselinePath), "utf8"), baselinePath)
          : parseJsonArg(baseline, "baseline");

      const res = await fetchResponse(fetchImpl, { url, headers });
      if (!res.isJson) {
        return fail(`HTTP ${res.status}: ${url} did not return JSON. Body starts with: ${res.raw.slice(0, 120)}`);
      }

      const threshold = failOn ?? "breaking";
      const result = compare(expected, res.json, schemaOnly ?? true);
      const failing = result.changes.filter((c) => RANK[c.severity] >= RANK[threshold]);
      const structured = { passed: failing.length === 0, failOn: threshold, status: res.status, ...result };
      return ok(
        structured,
        `${structured.passed ? "Passed" : "Failed"} (fail on ${threshold}). ${result.overview}`
      );
    })
  );
}

function hostedClient(fetchImpl, baseUrl, token) {
  return async function call(method, path, { query, body } = {}) {
    const url = new URL(`/api/v1${path}`, baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    const res = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      // Fall through with a status-only error below.
    }
    if (!res.ok) {
      const message = payload?.error ?? `HTTP ${res.status}`;
      const retry = res.headers.get("retry-after");
      throw new Error(
        `APIDiffGuard returned ${res.status}: ${message}${retry ? ` Retry after ${retry}s.` : ""}`
      );
    }
    return payload;
  };
}

const idArg = (what) => z.string().describe(`${what} id (a UUID).`);
const page = {
  limit: z.number().int().min(1).max(100).optional().describe("Defaults to 25."),
  offset: z.number().int().min(0).optional(),
};

function registerHostedTools(server, call) {
  server.registerTool(
    "list_endpoints",
    {
      title: "List monitored endpoints",
      description:
        "List the API endpoints this workspace monitors, with health and the latest breaking and warning counts. Filter by health to find what needs attention.",
      inputSchema: {
        health: z.enum(["healthy", "warning", "breaking", "unknown", "checking"]).optional(),
        environment: z.string().optional(),
        ...page,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guarded(async (args) => ok(await call("GET", "/endpoints", { query: args })))
  );

  server.registerTool(
    "get_endpoint",
    {
      title: "Get an endpoint",
      description: "One monitored endpoint and a summary of its most recent diff.",
      inputSchema: { id: idArg("Endpoint") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guarded(async ({ id }) => ok(await call("GET", `/endpoints/${encodeURIComponent(id)}`)))
  );

  server.registerTool(
    "get_endpoint_schema",
    {
      title: "Get an endpoint's response schema",
      description:
        "The JSON Schema of the endpoint's current baseline response: the shape to write code against. Never includes response values.",
      inputSchema: { id: idArg("Endpoint") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guarded(async ({ id }) => ok(await call("GET", `/endpoints/${encodeURIComponent(id)}/schema`)))
  );

  server.registerTool(
    "run_check",
    {
      title: "Run a check now",
      description:
        "Call the endpoint from APIDiffGuard and diff the response against its baseline, sending the workspace's alerts if something broke. Uses one check from the monthly quota. diffId is null when nothing changed.",
      inputSchema: { id: idArg("Endpoint") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    guarded(async ({ id }) => ok(await call("POST", `/endpoints/${encodeURIComponent(id)}/check`)))
  );

  server.registerTool(
    "list_diffs",
    {
      title: "List recent diffs",
      description:
        "Recent changes detected across the workspace, newest first. Each has an overview sentence; call get_diff for the full change list.",
      inputSchema: {
        endpointId: z.string().optional(),
        since: z.string().optional().describe("ISO 8601 timestamp."),
        breakingOnly: z.boolean().optional(),
        ...page,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guarded(async (args) => ok(await call("GET", "/diffs", { query: args })))
  );

  server.registerTool(
    "get_diff",
    {
      title: "Get a diff",
      description:
        "Every change in one diff, with path, change type, severity, and old and new types. Response bodies are not included.",
      inputSchema: { id: idArg("Diff") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guarded(async ({ id }) => {
      const result = await call("GET", `/diffs/${encodeURIComponent(id)}`);
      return ok(result, result?.diff?.overview);
    })
  );

  server.registerTool(
    "accept_diff",
    {
      title: "Accept a diff as the new baseline",
      description:
        "Make the response behind this diff the endpoint's baseline, so the change stops being reported. Only do this once the calling code handles the change, and preferably after the user agrees. Needs a token with the baselines:write scope.",
      inputSchema: { id: idArg("Diff") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    guarded(async ({ id }) => ok(await call("POST", `/diffs/${encodeURIComponent(id)}/accept`)))
  );

  server.registerTool(
    "add_endpoint",
    {
      title: "Start monitoring an endpoint",
      description:
        "Register an API endpoint for scheduled monitoring. The first check captures its baseline. Needs a token with the endpoints:write scope. Credentials passed in auth are sealed server-side and never returned.",
      inputSchema: {
        name: z.string(),
        url: z.string().describe("Public http(s) URL. Private network addresses are refused."),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).optional(),
        environment: z.string().optional().describe("Defaults to production."),
        tags: z.array(z.string()).optional(),
        description: z.string().optional(),
        auth: z
          .object({
            type: z.enum(["none", "bearer", "api_key", "basic", "oauth", "custom"]),
            token: z.string().optional(),
            header: z.string().optional(),
            key: z.string().optional(),
            username: z.string().optional(),
            password: z.string().optional(),
            value: z.string().optional(),
          })
          .optional(),
        frequency: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY"]).optional().describe("Check schedule. Needs a Starter plan or above."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    guarded(async ({ frequency, ...input }) => {
      const result = await call("POST", "/endpoints", {
        body: { ...input, ...(frequency ? { schedule: { frequency } } : {}) },
      });
      const skipped = result?.skipped ?? [];
      return ok(
        result,
        skipped.length ? `Not created: ${skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}` : undefined
      );
    })
  );
}

/**
 * Build the server. Workspace tools are registered only when a token is set,
 * so an agent without one is not handed tools that can only fail.
 */
export function createServer({
  token = process.env.APIDIFFGUARD_TOKEN,
  baseUrl = process.env.APIDIFFGUARD_URL || DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  version = "0.0.0",
} = {}) {
  const hosted = Boolean(token);
  const server = new McpServer(
    { name: "apidiffguard", version },
    { instructions: INSTRUCTIONS + (hosted ? HOSTED_INSTRUCTIONS : "") }
  );
  registerLocalTools(server, fetchImpl);
  if (hosted) registerHostedTools(server, hostedClient(fetchImpl, baseUrl, token));
  return server;
}
