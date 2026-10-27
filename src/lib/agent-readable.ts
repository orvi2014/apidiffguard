/**
 * The agent-facing helpers from the diff engine package.
 *
 * Re-exported from the package source rather than copied into src/lib, as the
 * diff engine itself once was: one definition, used by the API here and by
 * the published package that the CLI and MCP server install.
 */
export {
  inferSchema,
  mergeSchemas,
  type JsonSchema,
} from "../../packages/diff-engine/src/schema";
export { describeChanges } from "../../packages/diff-engine/src/describe";
