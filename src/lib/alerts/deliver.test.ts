import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderChannelPayload } from "@/lib/alerts/deliver";

const STRUCTURED = {
  source: "apidiffguard",
  event: "diff.detected",
  severity: "BREAKING",
  message: "Billing API: 2 breaking",
  sentAt: "2026-08-09T00:00:00.000Z",
};

describe("renderChannelPayload", () => {
  it("sends Slack a text field", () => {
    const payload = renderChannelPayload("SLACK", "2 breaking", STRUCTURED);
    assert.equal(typeof payload.text, "string");
    assert.match(String(payload.text), /2 breaking/);
  });

  it("gives Mattermost the identical shape as Slack", () => {
    // Mattermost incoming webhooks are Slack-compatible; if these ever diverge
    // the Mattermost channel starts 400ing, which is exactly the bug that made
    // "just save it as a generic webhook" fail.
    const slack = renderChannelPayload("SLACK", "2 breaking", STRUCTURED);
    const mattermost = renderChannelPayload(
      "MATTERMOST",
      "2 breaking",
      STRUCTURED,
    );
    assert.deepEqual(mattermost, slack);
  });

  it("always gives Mattermost a non-empty text key", () => {
    const payload = renderChannelPayload("MATTERMOST", "drift", STRUCTURED);
    assert.ok("text" in payload, "Mattermost rejects a body without `text`");
    assert.ok(String(payload.text).length > 0);
  });

  it("sends Discord a content field instead", () => {
    const payload = renderChannelPayload("DISCORD", "2 breaking", STRUCTURED);
    assert.equal(typeof payload.content, "string");
    assert.ok(!("text" in payload));
  });

  it("passes the structured body through for a generic webhook", () => {
    const payload = renderChannelPayload("WEBHOOK", "2 breaking", STRUCTURED);
    assert.deepEqual(payload, STRUCTURED);
    // The reason a Mattermost URL cannot simply be saved as WEBHOOK.
    assert.ok(!("text" in payload));
  });
});
