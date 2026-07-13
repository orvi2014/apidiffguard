/**
 * Live smoke: fetch real APIs and exercise schema-only, array identity,
 * status class, and OpenAPI contract validation.
 *
 * Run: npm run test:live
 *
 * Uses curl when Node TLS fails (corporate proxies / custom CAs).
 */
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import {
  compareJson,
  compareStatusCodes,
  summarizeChanges,
} from "../src/lib/diff-engine";
import { validateAgainstSchema } from "../src/lib/contract-validate";
import { parseOpenAPIDocument } from "../src/lib/openapi";

function curlText(url: string): string {
  return execFileSync("curl", ["-sS", "-L", url], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function curlJson(url: string): unknown {
  return JSON.parse(curlText(url)) as unknown;
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  } catch (err) {
    console.log(`  (node fetch failed, using curl for ${url})`);
    void err;
    return curlJson(url);
  }
}

async function main() {
  console.log("→ Fetching jsonplaceholder users…");
  const users = (await fetchJson(
    "https://jsonplaceholder.typicode.com/users"
  )) as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(users) && users.length >= 2);

  const baseline = { users: users.slice(0, 3) };
  const reordered = {
    users: [users[2]!, users[0]!, users[1]!].map((u) => ({
      ...u,
      username: `${String(u.username)}-mutated`,
    })),
  };

  const schemaQuiet = compareJson(baseline, reordered, {
    schemaOnly: true,
    arrayIdentity: true,
  });
  console.log(
    `  schemaOnly + arrayIdentity changes: ${schemaQuiet.length} (expect 0)`
  );
  assert.equal(schemaQuiet.length, 0);

  const fullNoise = compareJson(baseline, reordered, {
    schemaOnly: false,
    arrayIdentity: true,
  });
  console.log(`  full mode value changes: ${fullNoise.length} (expect > 0)`);
  assert.ok(fullNoise.length > 0);

  const removed = compareJson(
    baseline,
    { users: [users[0]!, users[1]!] },
    { schemaOnly: true, arrayIdentity: true }
  );
  assert.ok(removed.some((c) => c.type === "removed"));
  console.log(`  removed identity item: ${removed[0]?.path}`);

  const sameClass = compareStatusCodes(200, 201);
  const classBreak = compareStatusCodes(200, 404);
  assert.equal(sameClass?.severity, "warning");
  assert.equal(classBreak?.severity, "breaking");
  console.log("  status class severities ok");

  console.log("→ Fetching Petstore OpenAPI (contract extract)…");
  const openapiText = curlText(
    "https://petstore3.swagger.io/api/v3/openapi.json"
  );
  const spec = parseOpenAPIDocument(openapiText, {
    serverUrl: "https://petstore3.swagger.io/api/v3",
  });
  const getPet = spec.endpoints.find(
    (e) => e.method === "GET" && e.path === "/pet/{petId}"
  );
  assert.ok(getPet?.responseSchema, "expected pet response schema from OpenAPI");
  console.log(
    `  extracted Pet schema required: ${JSON.stringify(getPet!.responseSchema?.required ?? [])}`
  );

  // Petstore live endpoints are flaky; validate live jsonplaceholder user
  // against a contract shaped like the imported schema style.
  console.log("→ Validating live user against OpenAPI-style contract…");
  const user = users[0]!;
  const userSchema = {
    type: "object",
    required: ["id", "name", "email", "username"],
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
      email: { type: "string" },
      username: { type: "string" },
      phone: { type: "string" },
    },
  };
  const liveOk = validateAgainstSchema(user, userSchema);
  assert.equal(liveOk.length, 0);
  console.log("  live user passes contract");

  const broken = validateAgainstSchema(
    { id: "x", status: "not-a-status" },
    getPet!.responseSchema!
  );
  assert.ok(broken.length > 0);
  console.log(
    `  intentional Pet schema break: ${broken.length} violations · ${summarizeChanges(broken).breakingCount} breaking`
  );

  console.log("\nLive smoke passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
