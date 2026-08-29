/**
 * Browser error reporting. Inert until NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * A separate public variable from the server DSN: this one is inlined into the
 * client bundle and is therefore public by construction, so it should be a
 * deliberate choice rather than the server value leaking into the browser.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = dsn
  ? Sentry.captureRouterTransitionStart
  : undefined;
