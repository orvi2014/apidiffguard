import type { DiffChange } from "./types";

export type JsonSchema = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function resolveRef(
  schema: JsonSchema,
  root: JsonSchema,
  seen: Set<string>
): JsonSchema {
  const ref = schema.$ref;
  if (typeof ref !== "string" || !ref.startsWith("#/")) return schema;
  if (seen.has(ref)) return schema;
  seen.add(ref);

  const parts = ref
    .slice(2)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  let cur: unknown = root;
  for (const part of parts) {
    if (!isRecord(cur) || !(part in cur)) return schema;
    cur = cur[part];
  }
  if (!isRecord(cur)) return schema;
  return resolveRef(cur, root, seen);
}

function allowedTypes(schema: JsonSchema): string[] {
  const types: string[] = [];
  if (typeof schema.type === "string") types.push(schema.type);
  else if (Array.isArray(schema.type)) {
    for (const t of schema.type) {
      if (typeof t === "string") types.push(t);
    }
  }
  if (schema.nullable === true && !types.includes("null")) types.push("null");
  return types;
}

function pushViolation(
  changes: DiffChange[],
  path: string,
  message: string,
  extra: Partial<DiffChange> = {}
) {
  changes.push({
    id: `chg_contract_${changes.length + 1}`,
    path: path || "$",
    type: "contract_violation",
    severity: "breaking",
    message,
    ...extra,
  });
}

/**
 * Lightweight OpenAPI / JSON Schema validation for response bodies.
 * Covers type, required, properties, items, enum, nullable, and local $ref.
 */
export function validateAgainstSchema(
  value: unknown,
  schema: unknown,
  options: { root?: JsonSchema; path?: string } = {}
): DiffChange[] {
  if (!isRecord(schema)) return [];
  const root = options.root ?? schema;
  const path = options.path ?? "";
  const changes: DiffChange[] = [];

  const walk = (data: unknown, rawSchema: JsonSchema, current: string) => {
    const resolved = resolveRef(rawSchema, root, new Set());
    const types = allowedTypes(resolved);

    if (Array.isArray(resolved.enum) && resolved.enum.length > 0) {
      const ok = resolved.enum.some((candidate) => Object.is(candidate, data));
      if (!ok) {
        pushViolation(
          changes,
          current || "$",
          `Value not in enum at ${current || "$"}`,
          { newValue: data, oldValue: resolved.enum }
        );
        return;
      }
    }

    if (types.length > 0) {
      const actual = jsonType(data);
      const matches =
        types.includes(actual) ||
        (types.includes("integer") &&
          actual === "number" &&
          Number.isInteger(data));
      if (!matches) {
        pushViolation(
          changes,
          current || "$",
          `Schema type mismatch at ${current || "$"}: expected ${types.join("|")}, got ${actual}`,
          { newValue: data, newType: actual, oldType: types.join("|") }
        );
        return;
      }
    }

    if (data === null || data === undefined) return;

    if (isRecord(data) && (resolved.type === "object" || resolved.properties || resolved.required)) {
      const required = Array.isArray(resolved.required)
        ? resolved.required.filter((k): k is string => typeof k === "string")
        : [];
      for (const key of required) {
        if (!(key in data) || data[key] === undefined) {
          pushViolation(
            changes,
            current ? `${current}.${key}` : key,
            `Missing required field ${current ? `${current}.` : ""}${key}`
          );
        }
      }

      const properties = isRecord(resolved.properties)
        ? (resolved.properties as Record<string, JsonSchema>)
        : {};
      for (const [key, childSchema] of Object.entries(properties)) {
        if (!(key in data)) continue;
        walk(data[key], childSchema, current ? `${current}.${key}` : key);
      }

      if (resolved.additionalProperties === false) {
        for (const key of Object.keys(data)) {
          if (!(key in properties)) {
            pushViolation(
              changes,
              current ? `${current}.${key}` : key,
              `Unexpected field ${current ? `${current}.` : ""}${key}`
            );
          }
        }
      }
      return;
    }

    if (Array.isArray(data) && (resolved.type === "array" || resolved.items)) {
      const items = resolved.items;
      if (isRecord(items)) {
        data.forEach((item, index) => {
          walk(item, items, `${current}[${index}]`);
        });
      }
    }
  };

  walk(value, schema, path);
  return changes;
}

/**
 * Pull the primary JSON response schema from an OpenAPI 3 / Swagger 2 operation.
 */
export function extractOperationResponseSchema(
  operation: unknown,
  doc: unknown,
  preferredStatuses: string[] = ["200", "201", "default"]
): JsonSchema | null {
  if (!isRecord(operation) || !isRecord(doc)) return null;
  const responses = operation.responses;
  if (!isRecord(responses)) return null;

  const tryStatus = (status: string): JsonSchema | null => {
    const response = responses[status];
    if (!isRecord(response)) return null;

    // OpenAPI 3 content
    const content = response.content;
    if (isRecord(content)) {
      const json =
        content["application/json"] ??
        content["application/vnd.api+json"] ??
        Object.values(content).find((c) => isRecord(c) && "schema" in c);
      if (isRecord(json) && isRecord(json.schema)) {
        return resolveRef(json.schema, doc as JsonSchema, new Set());
      }
    }

    // Swagger 2 schema
    if (isRecord(response.schema)) {
      return resolveRef(response.schema, doc as JsonSchema, new Set());
    }
    return null;
  };

  for (const status of preferredStatuses) {
    const schema = tryStatus(status);
    if (schema) return schema;
  }

  for (const status of Object.keys(responses)) {
    if (preferredStatuses.includes(status)) continue;
    const schema = tryStatus(status);
    if (schema) return schema;
  }

  return null;
}
