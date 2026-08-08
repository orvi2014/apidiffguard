import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidEmail,
  renderAlertEmail,
  renderVerificationEmail,
} from "@/lib/alerts/email";

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    for (const value of [
      "alerts@example.com",
      "first.last+tag@sub.example.co.uk",
    ]) {
      assert.equal(isValidEmail(value), true, value);
    }
  });

  it("rejects malformed addresses", () => {
    for (const value of [
      "",
      "not-an-email",
      "@example.com",
      "user@",
      "user@example",
      "user name@example.com",
      "user@exam ple.com",
    ]) {
      assert.equal(isValidEmail(value), false, value);
    }
  });

  it("rejects an address past the RFC length limit", () => {
    assert.equal(isValidEmail(`${"a".repeat(250)}@example.com`), false);
  });
});

describe("renderAlertEmail", () => {
  it("titles breaking changes differently from drift", () => {
    const breaking = renderAlertEmail({
      severity: "BREAKING",
      message: "2 breaking",
      endpointName: "Billing API",
    });
    const warning = renderAlertEmail({
      severity: "WARNING",
      message: "1 warning",
      endpointName: "Billing API",
    });
    assert.match(breaking.subject, /^Breaking API change: Billing API$/);
    assert.match(warning.subject, /^API drift detected: Billing API$/);
  });

  it("escapes hostile content in the message", () => {
    const rendered = renderAlertEmail({
      severity: "WARNING",
      message: '<script>alert("xss")</script>',
      endpointName: "API",
    });
    assert.ok(!rendered.html.includes("<script>"));
    assert.ok(rendered.html.includes("&lt;script&gt;"));
  });

  it("includes a diff link only when there is a diff", () => {
    const withDiff = renderAlertEmail({
      severity: "WARNING",
      message: "m",
      diffUrl: "https://app.example.com/diff/abc",
    });
    const without = renderAlertEmail({ severity: "WARNING", message: "m" });
    assert.ok(withDiff.html.includes("https://app.example.com/diff/abc"));
    assert.ok(withDiff.text.includes("https://app.example.com/diff/abc"));
    assert.ok(!without.html.includes("View the diff"));
  });

  it("always produces a plain-text alternative", () => {
    const rendered = renderAlertEmail({ severity: "BREAKING", message: "hi" });
    assert.ok(rendered.text.includes("hi"));
    assert.ok(!rendered.text.includes("<"));
  });
});

describe("renderVerificationEmail", () => {
  it("carries the confirmation link and escapes the workspace name", () => {
    const rendered = renderVerificationEmail({
      workspaceName: '<b>Acme</b> & Co',
      verifyUrl: "https://app.example.com/api/alerts/verify?c=1&t=tok",
    });
    assert.ok(rendered.html.includes("&lt;b&gt;Acme&lt;/b&gt; &amp; Co"));
    assert.ok(!rendered.html.includes("<b>Acme"));
    assert.ok(rendered.text.includes("https://app.example.com/api/alerts/verify"));
  });
});
