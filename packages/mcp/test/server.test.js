import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

/** A fetch that answers from a table keyed by "METHOD pathname", and records calls. */
function fakeFetch(routes) {
  const calls = [];
  const impl = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    calls.push({ method, url, headers: init.headers ?? {}, body: init.body });
    const route = routes[`${method} ${url.pathname}`];
    if (!route) return new Response(JSON.stringify({ error: "Not found." }), { status: 404 });
    const { status = 200, json, text, headers } = typeof route === "function" ? route(url, init) : route;
    return new Response(text ?? JSON.stringify(json), {
      status,
      headers: { "content-type": text ? "text/html" : "application/json", ...headers },
    });
  };
  return { impl, calls };
}

async function connect(options) {
  const server = createServer({ token: "", ...options });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return client;
}

async function toolNames(client) {
  return (await client.listTools()).tools.map((t) => t.name).sort();
}

describe("tool registration", () => {
  it("offers only local tools without a token", async () => {
    const client = await connect({ fetchImpl: fakeFetch({}).impl });
    assert.deepEqual(await toolNames(client), ["check_url", "diff_json", "snapshot_api"]);
  });

  it("adds the workspace tools when a token is set", async () => {
    const client = await connect({ token: "adg_live_x", fetchImpl: fakeFetch({}).impl });
    assert.deepEqual(await toolNames(client), [
      "accept_diff",
      "add_endpoint",
      "check_url",
      "diff_json",
      "get_diff",
      "get_endpoint",
      "get_endpoint_schema",
      "list_diffs",
      "list_endpoints",
      "run_check",
      "snapshot_api",
    ]);
  });

  it("marks accept_diff destructive and the reads read-only", async () => {
    const client = await connect({ token: "adg_live_x", fetchImpl: fakeFetch({}).impl });
    const tools = Object.fromEntries((await client.listTools()).tools.map((t) => [t.name, t]));
    assert.equal(tools.accept_diff.annotations.destructiveHint, true);
    assert.equal(tools.get_diff.annotations.readOnlyHint, true);
    assert.equal(tools.snapshot_api.annotations.readOnlyHint, true);
  });
});

describe("snapshot_api", () => {
  it("returns the response shape and no values by default", async () => {
    const { impl, calls } = fakeFetch({
      "GET /v1/users": { json: { data: [{ id: 1, email: "a@b.co" }, { id: 2 }] } },
    });
    const client = await connect({ fetchImpl: impl });
    const res = await client.callTool({
      name: "snapshot_api",
      arguments: { url: "https://vendor.test/v1/users", headers: { Authorization: "Bearer t" } },
    });
    assert.equal(res.isError, undefined);
    const out = res.structuredContent;
    assert.equal(out.status, 200);
    assert.equal(out.isJson, true);
    assert.deepEqual(out.schema.properties.data.items.required, ["id"]);
    assert.equal(out.sample, undefined);
    assert.ok(!JSON.stringify(res).includes("a@b.co"));
    assert.equal(calls[0].headers.Authorization, "Bearer t");
  });

  it("includes a sample only when asked", async () => {
    const { impl } = fakeFetch({ "GET /x": { json: { ok: true } } });
    const client = await connect({ fetchImpl: impl });
    const res = await client.callTool({
      name: "snapshot_api",
      arguments: { url: "https://vendor.test/x", includeSample: true },
    });
    assert.equal(res.structuredContent.sample, '{"ok":true}');
  });

  it("reports a non-JSON response instead of failing", async () => {
    const { impl } = fakeFetch({ "GET /page": { text: "<html>hi</html>" } });
    const client = await connect({ fetchImpl: impl });
    const res = await client.callTool({ name: "snapshot_api", arguments: { url: "https://vendor.test/page" } });
    assert.equal(res.structuredContent.isJson, false);
    assert.equal(res.structuredContent.schema, null);
    assert.match(res.content[0].text, /not JSON/);
  });

  it("refuses non-http URLs as a tool error", async () => {
    const client = await connect({ fetchImpl: fakeFetch({}).impl });
    const res = await client.callTool({ name: "snapshot_api", arguments: { url: "file:///etc/passwd" } });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /http and https/);
  });
});

describe("diff_json", () => {
  it("classifies changes and ignores value churn by default", async () => {
    const client = await connect({ fetchImpl: fakeFetch({}).impl });
    const res = await client.callTool({
      name: "diff_json",
      arguments: {
        baseline: { id: 1, name: "a", count: 3 },
        current: JSON.stringify({ id: "1", count: 4, extra: true }),
      },
    });
    const out = res.structuredContent;
    assert.equal(out.summary.breakingCount, 2);
    assert.equal(out.summary.infoCount, 1);
    assert.ok(!out.changes.some((c) => c.path === "count"));
    assert.match(res.content[0].text, /^2 breaking, 1 info\./);
  });

  it("rejects a malformed JSON document", async () => {
    const client = await connect({ fetchImpl: fakeFetch({}).impl });
    const res = await client.callTool({
      name: "diff_json",
      arguments: { baseline: "{ broken", current: {} },
    });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /baseline is not valid JSON/);
  });
});

describe("check_url", () => {
  const routes = { "GET /v1/user": { json: { id: 1, name: "a" } } };

  it("passes when the live response still matches", async () => {
    const client = await connect({ fetchImpl: fakeFetch(routes).impl });
    const res = await client.callTool({
      name: "check_url",
      arguments: { url: "https://vendor.test/v1/user", baseline: { id: 2, name: "b" } },
    });
    assert.equal(res.structuredContent.passed, true);
  });

  it("fails on a removed field, reading the baseline from a file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "adg-mcp-"));
    const file = join(dir, "user.json");
    writeFileSync(file, JSON.stringify({ id: 1, name: "a", email: "x" }));
    const client = await connect({ fetchImpl: fakeFetch(routes).impl });
    const res = await client.callTool({
      name: "check_url",
      arguments: { url: "https://vendor.test/v1/user", baselinePath: file },
    });
    assert.equal(res.structuredContent.passed, false);
    assert.match(res.content[0].text, /^Failed \(fail on breaking\)\. 1 breaking\. email removed/);
  });

  it("needs exactly one baseline source", async () => {
    const client = await connect({ fetchImpl: fakeFetch(routes).impl });
    const res = await client.callTool({ name: "check_url", arguments: { url: "https://vendor.test/v1/user" } });
    assert.equal(res.isError, true);
  });
});

describe("workspace tools", () => {
  it("call the v1 API with the token and the configured base URL", async () => {
    const { impl, calls } = fakeFetch({
      "GET /api/v1/endpoints": { json: { endpoints: [], pagination: { limit: 5, offset: 0, total: 0 } } },
    });
    const client = await connect({ token: "adg_live_x", baseUrl: "https://self.hosted", fetchImpl: impl });
    const res = await client.callTool({
      name: "list_endpoints",
      arguments: { health: "breaking", limit: 5 },
    });
    assert.equal(res.isError, undefined);
    assert.equal(calls[0].url.origin, "https://self.hosted");
    assert.equal(calls[0].url.searchParams.get("health"), "breaking");
    assert.equal(calls[0].url.searchParams.get("limit"), "5");
    assert.equal(calls[0].headers.Authorization, "Bearer adg_live_x");
  });

  it("lead get_diff with the overview sentence", async () => {
    const { impl } = fakeFetch({
      "GET /api/v1/diffs/d1": { json: { diff: { id: "d1", overview: "1 breaking. a removed [breaking].", changes: [] } } },
    });
    const client = await connect({ token: "adg_live_x", fetchImpl: impl });
    const res = await client.callTool({ name: "get_diff", arguments: { id: "d1" } });
    assert.equal(res.content[0].text, "1 breaking. a removed [breaking].");
  });

  it("surface API errors, including the missing scope and Retry-After", async () => {
    const { impl } = fakeFetch({
      "POST /api/v1/diffs/d1/accept": {
        status: 403,
        json: { error: "This token does not have the baselines:write scope." },
      },
      "POST /api/v1/endpoints/e1/check": {
        status: 429,
        json: { error: "Too many requests." },
        headers: { "retry-after": "12" },
      },
    });
    const client = await connect({ token: "adg_live_x", fetchImpl: impl });
    const denied = await client.callTool({ name: "accept_diff", arguments: { id: "d1" } });
    assert.equal(denied.isError, true);
    assert.match(denied.content[0].text, /403: This token does not have the baselines:write scope/);
    const limited = await client.callTool({ name: "run_check", arguments: { id: "e1" } });
    assert.match(limited.content[0].text, /Retry after 12s/);
  });

  it("send add_endpoint's frequency as a schedule and report skipped entries", async () => {
    const { impl, calls } = fakeFetch({
      "POST /api/v1/endpoints": {
        status: 201,
        json: { endpoints: [], created: 0, scheduled: 0, skipped: [{ name: "Orders", reason: "Private address." }] },
      },
    });
    const client = await connect({ token: "adg_live_x", fetchImpl: impl });
    const res = await client.callTool({
      name: "add_endpoint",
      arguments: { name: "Orders", url: "https://10.0.0.1/orders", frequency: "DAILY" },
    });
    assert.deepEqual(JSON.parse(calls[0].body), {
      name: "Orders",
      url: "https://10.0.0.1/orders",
      schedule: { frequency: "DAILY" },
    });
    assert.equal(res.content[0].text, "Not created: Orders (Private address.)");
  });
});
