import { parseAndAssertPublicUrl } from "@/lib/safe-url";

/**
 * Webhook-style channels and the shape of a valid destination for each.
 *
 * Kept out of the server-action module so it can be unit tested: every export
 * of a `"use server"` file has to be an async server action, which a predicate
 * like this is not.
 */
export const WEBHOOK_CHANNELS = [
  "SLACK",
  "DISCORD",
  "MATTERMOST",
  "WEBHOOK",
] as const;

export type WebhookChannel = (typeof WEBHOOK_CHANNELS)[number];

export function isWebhookChannel(value: string): value is WebhookChannel {
  return (WEBHOOK_CHANNELS as readonly string[]).includes(value);
}

/**
 * Validate a destination against the channel it is actually being saved as, so
 * a Discord URL saved as a Slack channel fails here rather than at delivery.
 */
export function isValidTarget(channel: WebhookChannel, target: string): boolean {
  let url: URL;
  try {
    url = parseAndAssertPublicUrl(target, { requireHttps: true });
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase();
  switch (channel) {
    case "SLACK":
      return (
        (host === "hooks.slack.com" || host.endsWith(".slack.com")) &&
        url.pathname.startsWith("/services/")
      );
    case "DISCORD":
      return (
        (host === "discord.com" ||
          host === "discordapp.com" ||
          host.endsWith(".discord.com") ||
          host.endsWith(".discordapp.com")) &&
        /^\/api\/webhooks\//.test(url.pathname)
      );
    case "MATTERMOST":
      // Self-hosted, so the host is whatever the customer runs — there is no
      // vendor domain to match on. The path is the stable signal: incoming
      // webhooks always live under /hooks/<key>.
      return /^\/hooks\/[^/]+/.test(url.pathname);
    case "WEBHOOK":
      return true;
  }
}
