import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";

/**
 * Dunning notice.
 *
 * A failed invoice used to only reach a server log, so the first thing a user
 * knew about it was the subscription being cancelled. Stripe retries for days —
 * this is the window in which the user can actually fix it.
 */
export function PaymentFailedBanner({ failedAt }: { failedAt: string }) {
  const failed = new Date(failedAt);
  const validDate = !Number.isNaN(failed.getTime());

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border-b border-danger/30 bg-danger-muted px-4 py-2.5 text-sm"
    >
      <TriangleAlertIcon
        className="size-4 shrink-0 text-danger"
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-foreground">
        <span className="font-medium">We couldn&apos;t process your payment</span>
        {validDate ? (
          <>
            {" "}
            <span className="text-muted">
              (last attempt{" "}
              {failed.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              )
            </span>
          </>
        ) : null}
        <span className="text-muted">
          {" "}
          — update your card before the subscription is cancelled.
        </span>
      </p>
      <Link
        href="/settings/billing"
        className="shrink-0 rounded-md border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
      >
        Update payment method
      </Link>
    </div>
  );
}
