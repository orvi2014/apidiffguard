/**
 * Server and edge error reporting.
 *
 * Everything is gated on SENTRY_DSN being present. Until it is set the SDK is
 * never initialised, so this is inert rather than half-configured — the app
 * had no error reporting at all, and eleven console.error sites whose output
 * nobody would ever read.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    // Traces are the expensive part and this is a monitoring tool, not a
    // latency-sensitive app; errors are what we are here for.
    tracesSampleRate: 0,
    // Endpoint URLs and diff bodies can carry customer data.
    sendDefaultPii: false,
  });
}

export async function onRequestError(
  ...args: Parameters<
    typeof import("@sentry/nextjs").captureRequestError
  >
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
