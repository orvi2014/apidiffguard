import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractOperationResponseSchema,
  validateAgainstSchema,
} from "./contract-validate";
import { parseOpenAPIDocument } from "./openapi";

const petSchemaSpec = `
openapi: 3.0.3
info:
  title: Pets
  version: 1.0.0
paths:
  /pet/{petId}:
    get:
      operationId: getPet
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
components:
  schemas:
    Pet:
      type: object
      required: [id, name, status]
      properties:
        id:
          type: integer
        name:
          type: string
        status:
          type: string
          enum: [available, pending, sold]
`;

describe("validateAgainstSchema", () => {
  it("passes a valid body", () => {
    const changes = validateAgainstSchema(
      { id: 1, name: "doggie", status: "available" },
      {
        type: "object",
        required: ["id", "name", "status"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          status: { type: "string", enum: ["available", "pending", "sold"] },
        },
      }
    );
    assert.equal(changes.length, 0);
  });

  it("flags missing required, type mismatch, and enum violations", () => {
    const changes = validateAgainstSchema(
      { id: "1", status: "lost" },
      {
        type: "object",
        required: ["id", "name", "status"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          status: { type: "string", enum: ["available", "pending", "sold"] },
        },
      }
    );
    const paths = changes.map((c) => c.path);
    assert.ok(paths.includes("name"));
    assert.ok(paths.includes("id"));
    assert.ok(paths.includes("status"));
    assert.ok(changes.every((c) => c.type === "contract_violation"));
  });
});

describe("extractOperationResponseSchema", () => {
  it("resolves $ref from OpenAPI components", () => {
    const spec = parseOpenAPIDocument(petSchemaSpec);
    const ep = spec.endpoints.find((e) => e.operationId === "getPet");
    assert.ok(ep?.responseSchema);
    assert.equal(ep?.responseSchema?.type, "object");
    assert.deepEqual(ep?.responseSchema?.required, ["id", "name", "status"]);
  });

  it("extracts inline swagger-style schema", () => {
    const schema = extractOperationResponseSchema(
      {
        responses: {
          "200": {
            schema: { type: "object", properties: { ok: { type: "boolean" } } },
          },
        },
      },
      { swagger: "2.0" }
    );
    assert.equal(schema?.type, "object");
  });
});
