import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  isHealthValue,
  readPagination,
} from "./api-v1-params";

const at = (qs: string) => new URL(`https://example.com/api/v1/endpoints${qs}`);

describe("readPagination", () => {
  it("defaults when the parameters are absent", () => {
    // Regression: `Number(null)` is 0, not NaN, so an absent limit used to
    // clamp to the minimum of 1 and silently return a single row.
    assert.deepEqual(readPagination(at("")), {
      limit: DEFAULT_LIMIT,
      offset: 0,
    });
  });

  it("treats an empty parameter as absent for the same reason", () => {
    assert.equal(readPagination(at("?limit=&offset=")).limit, DEFAULT_LIMIT);
  });

  it("honours explicit values", () => {
    assert.deepEqual(readPagination(at("?limit=10&offset=40")), {
      limit: 10,
      offset: 40,
    });
  });

  it("clamps above the maximum and below the minimum", () => {
    assert.equal(readPagination(at("?limit=9999")).limit, MAX_LIMIT);
    assert.equal(readPagination(at("?limit=0")).limit, 1);
    assert.equal(readPagination(at("?limit=-5")).limit, 1);
    assert.equal(readPagination(at("?offset=-5")).offset, 0);
  });

  it("falls back on junk rather than producing NaN in a range query", () => {
    assert.equal(readPagination(at("?limit=abc")).limit, DEFAULT_LIMIT);
    assert.equal(readPagination(at("?limit=Infinity")).limit, DEFAULT_LIMIT);
    assert.equal(readPagination(at("?offset=NaN")).offset, 0);
  });

  it("truncates fractional values", () => {
    assert.equal(readPagination(at("?limit=7.9")).limit, 7);
  });
});

describe("isHealthValue", () => {
  it("accepts the documented values in any casing", () => {
    assert.equal(isHealthValue("breaking"), true);
    assert.equal(isHealthValue("BREAKING"), true);
  });
  it("rejects anything else", () => {
    assert.equal(isHealthValue("bogus"), false);
    assert.equal(isHealthValue(""), false);
  });
});
