import { Polar } from "@polar-sh/sdk";

/**
 * Polar client, configured from the environment.
 *
 * `server` matters more here than with most SDKs: sandbox and production are
 * entirely separate worlds with separate product ids and separate access
 * tokens, and pointing a live token at the sandbox host fails in confusing
 * ways. It is explicit, and defaults to sandbox so a half-configured
 * deployment cannot accidentally take real money.
 */

export type PolarServer = "sandbox" | "production";

export function polarServer(): PolarServer {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

let cached: Polar | null = null;
let cachedToken: string | null = null;

export function getPolar(): Polar | null {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) return null;
  if (cached && cachedToken === accessToken) return cached;
  cached = new Polar({ accessToken, server: polarServer() });
  cachedToken = accessToken;
  return cached;
}

/**
 * Configured means: we can call the API *and* we know which product maps to at
 * least one paid plan. A token with no product mapping would render a checkout
 * button that always fails.
 */
export function isPolarConfigured(): boolean {
  return Boolean(
    process.env.POLAR_ACCESS_TOKEN &&
      (process.env.POLAR_PRODUCT_STARTER || process.env.POLAR_PRODUCT_PRO)
  );
}

export function isPolarWebhookConfigured(): boolean {
  return Boolean(process.env.POLAR_WEBHOOK_SECRET);
}
