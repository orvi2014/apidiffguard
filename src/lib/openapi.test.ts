import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractEndpointsFromOpenAPI,
  parseOpenAPIDocument,
} from "./openapi";

const sampleOpenAPI3 = `
openapi: 3.1.0
info:
  title: Demo API
  version: 1.2.0
servers:
  - url: https://api.example.com/v1
paths:
  /users:
    get:
      operationId: listUsers
      summary: List users
      tags: [users]
      responses:
        "200":
          description: ok
    post:
      operationId: createUser
      tags: [users]
      security: []
      responses:
        "201":
          description: created
  /users/{id}:
    get:
      operationId: getUser
      tags: [users]
      responses:
        "200":
          description: ok
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
security:
  - bearerAuth: []
`;

const sampleSwagger2 = `{
  "swagger": "2.0",
  "info": { "title": "Legacy", "version": "2.0" },
  "host": "legacy.example.com",
  "basePath": "/api",
  "schemes": ["https"],
  "paths": {
    "/health": {
      "get": { "summary": "Health", "responses": { "200": { "description": "ok" } } }
    }
  }
}`;

describe("parseOpenAPIDocument", () => {
  it("parses OpenAPI 3 YAML and extracts operations", () => {
    const spec = parseOpenAPIDocument(sampleOpenAPI3);
    assert.equal(spec.title, "Demo API");
    assert.equal(spec.endpoints.length, 3);
    assert.equal(spec.authType, "bearer");
    assert.ok(spec.endpoints.some((e) => e.method === "GET" && e.path === "/users"));
    assert.equal(
      spec.endpoints.find((e) => e.operationId === "listUsers")?.url,
      "https://api.example.com/v1/users"
    );
  });

  it("parses Swagger 2 JSON", () => {
    const spec = parseOpenAPIDocument(sampleSwagger2);
    assert.equal(spec.title, "Legacy");
    assert.equal(spec.endpoints.length, 1);
    assert.equal(spec.endpoints[0]?.url, "https://legacy.example.com/api/health");
  });

  it("allows server override", () => {
    const content = parseOpenAPIDocument(sampleOpenAPI3, {
      serverUrl: "https://custom.example.com",
    });
    assert.ok(
      content.endpoints.every((e) =>
        e.url.startsWith("https://custom.example.com")
      )
    );
  });

  it("rejects documents without paths", () => {
    assert.throws(
      () =>
        extractEndpointsFromOpenAPI({
          openapi: "3.0.0",
          info: { title: "Empty", version: "1" },
        }),
      /no paths/i
    );
  });

  it("extracts swaggerDoc from NestJS swagger-ui-init.js", () => {
    const initJs = `
window.onload = function() {
  var options = {
  "swaggerDoc": {
    "openapi": "3.0.0",
    "info": { "title": "AgencyHandy API Docs", "version": "1.0.0" },
    "servers": [{ "url": "https://api-stage.example.com/api/v1" }],
    "paths": {
      "/accounts/signup": {
        "post": { "summary": "Sign up", "tags": ["Account"] }
      }
    }
  },
  "customOptions": {}
  };
};
`;
    const spec = parseOpenAPIDocument(initJs);
    assert.equal(spec.title, "AgencyHandy API Docs");
    assert.equal(spec.endpoints.length, 1);
    assert.equal(spec.endpoints[0]?.path, "/accounts/signup");
  });

  it("rejects bare Swagger UI HTML with a clear error", () => {
    assert.throws(
      () =>
        parseOpenAPIDocument(`<!DOCTYPE html><html><head><title>Swagger UI</title></head></html>`),
      /Swagger UI page/i
    );
  });
});
