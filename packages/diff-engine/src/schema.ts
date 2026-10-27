/**
 * Infer a JSON Schema from a sample response.
 *
 * This is what an agent needs before writing code against an API it does not
 * control: the shape, not the data. Values are never copied into the schema —
 * a response can carry customer records, and the types are what a caller
 * codes against.
 *
 * Arrays are merged across every item, so a field present on some rows and
 * absent on others comes out optional rather than required, and a field that
 * is a number on one row and null on another comes out as both.
 */

export type JsonSchema = {
  type?: JsonType | JsonType[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  format?: string;
};

export type JsonType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null";

export interface InferSchemaOptions {
  /**
   * Array items examined per array. Large lists are usually uniform, and
   * walking all of them buys little but time.
   */
  maxArrayItems?: number;
  /** Nesting deeper than this collapses to an untyped schema. */
  maxDepth?: number;
}

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URI = /^https?:\/\/\S+$/;

function stringFormat(value: string): string | undefined {
  if (ISO_DATE_TIME.test(value)) return "date-time";
  if (ISO_DATE.test(value)) return "date";
  if (UUID.test(value)) return "uuid";
  if (EMAIL.test(value)) return "email";
  if (URI.test(value)) return "uri";
  return undefined;
}

function typesOf(schema: JsonSchema): JsonType[] {
  if (schema.type === undefined) return [];
  return Array.isArray(schema.type) ? schema.type : [schema.type];
}

function withTypes(schema: JsonSchema, types: JsonType[]): JsonSchema {
  // integer is a subset of number; keeping both says nothing extra.
  const set = new Set(types);
  if (set.has("number")) set.delete("integer");
  const list = [...set];
  const rest = { ...schema };
  delete rest.type;
  if (list.length === 0) return rest;
  return { ...rest, type: list.length === 1 ? list[0] : list };
}

/** Merge two schemas so the result accepts anything either accepted. */
export function mergeSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
  const merged: JsonSchema = withTypes({}, [...typesOf(a), ...typesOf(b)]);

  if (a.properties || b.properties) {
    const props: Record<string, JsonSchema> = {};
    const keys = new Set([
      ...Object.keys(a.properties ?? {}),
      ...Object.keys(b.properties ?? {}),
    ]);
    for (const key of keys) {
      const left = a.properties?.[key];
      const right = b.properties?.[key];
      props[key] = left && right ? mergeSchemas(left, right) : (left ?? right)!;
    }
    merged.properties = props;
    // Required only if every side that is an object required it. A side that
    // was never an object (say, null) does not weaken the object's contract.
    const aObject = typesOf(a).includes("object");
    const bObject = typesOf(b).includes("object");
    const required =
      aObject && bObject
        ? (a.required ?? []).filter((k) => (b.required ?? []).includes(k))
        : aObject
          ? (a.required ?? [])
          : (b.required ?? []);
    if (required.length) merged.required = required;
  }

  if (a.items || b.items) {
    merged.items =
      a.items && b.items ? mergeSchemas(a.items, b.items) : (a.items ?? b.items);
  }

  // A format survives only if both sides agree on it.
  if (a.format && a.format === b.format) merged.format = a.format;
  else if (a.format && !typesOf(b).includes("string")) merged.format = a.format;
  else if (b.format && !typesOf(a).includes("string")) merged.format = b.format;

  return merged;
}

function infer(value: unknown, depth: number, opts: Required<InferSchemaOptions>): JsonSchema {
  if (value === null) return { type: "null" };
  if (depth > opts.maxDepth) return {};

  if (Array.isArray(value)) {
    const sample = value.slice(0, opts.maxArrayItems);
    if (sample.length === 0) return { type: "array" };
    let items = infer(sample[0], depth + 1, opts);
    for (const item of sample.slice(1)) {
      items = mergeSchemas(items, infer(item, depth + 1, opts));
    }
    return { type: "array", items };
  }

  switch (typeof value) {
    case "string": {
      const format = stringFormat(value);
      return format ? { type: "string", format } : { type: "string" };
    }
    case "number":
      return { type: Number.isInteger(value) ? "integer" : "number" };
    case "boolean":
      return { type: "boolean" };
    case "object": {
      const record = value as Record<string, unknown>;
      const properties: Record<string, JsonSchema> = {};
      for (const [key, child] of Object.entries(record)) {
        properties[key] = infer(child, depth + 1, opts);
      }
      const keys = Object.keys(properties);
      return keys.length
        ? { type: "object", properties, required: keys }
        : { type: "object" };
    }
    default:
      return {};
  }
}

export function inferSchema(value: unknown, options: InferSchemaOptions = {}): JsonSchema {
  return infer(value, 0, {
    maxArrayItems: options.maxArrayItems ?? 50,
    maxDepth: options.maxDepth ?? 32,
  });
}
