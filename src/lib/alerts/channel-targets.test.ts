import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidTarget,
  isWebhookChannel,
} from "@/lib/alerts/channel-targets";

describe("isWebhookChannel", () => {
  it("accepts the supported chat channels", () => {
    for (const channel of ["SLACK", "DISCORD", "MATTERMOST", "WEBHOOK"]) {
      assert.equal(isWebhookChannel(channel), true, channel);
    }
  });

  it("rejects EMAIL, which is not a webhook channel", () => {
    assert.equal(isWebhookChannel("EMAIL"), false);
    assert.equal(isWebhookChannel("TEAMS"), false);
  });
});

describe("isValidTarget — MATTERMOST", () => {
  it("accepts a self-hosted incoming webhook on any domain", () => {
    for (const url of [
      "https://mattermost.example.com/hooks/abc123xyz",
      "https://chat.acme.co.uk/hooks/kf9s-1a2b-3c4d",
      "https://mm.example.com/subpath/../hooks/abc123",
    ]) {
      assert.equal(isValidTarget("MATTERMOST", url), true, url);
    }
  });

  it("rejects a URL without a hook key", () => {
    for (const url of [
      "https://mattermost.example.com/hooks",
      "https://mattermost.example.com/hooks/",
      "https://mattermost.example.com/",
      "https://mattermost.example.com/api/v4/posts",
    ]) {
      assert.equal(isValidTarget("MATTERMOST", url), false, url);
    }
  });

  it("refuses plain http", () => {
    assert.equal(
      isValidTarget("MATTERMOST", "http://mattermost.example.com/hooks/abc"),
      false,
    );
  });

  it("refuses an internal Mattermost that the checker could not reach anyway", () => {
    // Self-hosted chat often lives on a private network. The SSRF guard blocks
    // it, so saving it would only produce a channel that always fails.
    for (const url of [
      "https://localhost/hooks/abc",
      "https://10.0.0.5/hooks/abc",
      "https://192.168.1.10/hooks/abc",
      "https://mattermost.internal/hooks/abc",
    ]) {
      assert.equal(isValidTarget("MATTERMOST", url), false, url);
    }
  });
});

describe("isValidTarget — the other channels still discriminate", () => {
  it("does not let a Mattermost URL pass as Slack or Discord", () => {
    const mattermost = "https://mattermost.example.com/hooks/abc123";
    assert.equal(isValidTarget("SLACK", mattermost), false);
    assert.equal(isValidTarget("DISCORD", mattermost), false);
  });

  it("still accepts genuine Slack and Discord webhooks", () => {
    assert.equal(
      isValidTarget("SLACK", "https://hooks.slack.com/services/T0/B0/xxxx"),
      true,
    );
    assert.equal(
      isValidTarget("DISCORD", "https://discord.com/api/webhooks/123/abc"),
      true,
    );
  });

  it("accepts any public https URL for a generic webhook", () => {
    assert.equal(isValidTarget("WEBHOOK", "https://example.com/anything"), true);
    assert.equal(isValidTarget("WEBHOOK", "https://127.0.0.1/anything"), false);
  });
});
