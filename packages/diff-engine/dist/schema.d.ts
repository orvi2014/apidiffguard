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
export type JsonType = "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
export interface InferSchemaOptions {
    /**
     * Array items examined per array. Large lists are usually uniform, and
     * walking all of them buys little but time.
     */
    maxArrayItems?: number;
    /** Nesting deeper than this collapses to an untyped schema. */
    maxDepth?: number;
}
/** Merge two schemas so the result accepts anything either accepted. */
export declare function mergeSchemas(a: JsonSchema, b: JsonSchema): JsonSchema;
export declare function inferSchema(value: unknown, options?: InferSchemaOptions): JsonSchema;
