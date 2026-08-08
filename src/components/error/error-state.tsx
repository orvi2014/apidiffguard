"use client";

import Link from "next/link";
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared fallback UI for route-level error boundaries.
 *
 * `digest` is the only server-side detail Next exposes in production — surface
 * it so a user can quote it in a support request and it can be matched against
 * server logs.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  digest,
  onRetry,
  homeHref = "/dashboard",
  homeLabel = "Back to dashboard",
}: {
  title?: string;
  description?: string;
  digest?: string;
  onRetry?: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-danger-muted text-danger">
        <TriangleAlertIcon className="size-5" aria-hidden="true" />
      </div>

      <h1 className="mt-5 text-lg font-semibold text-foreground">{title}</h1>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description ??
          "This page failed to load. The issue has been logged — trying again often clears it."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button onClick={onRetry}>
            <RotateCcwIcon className="size-4" aria-hidden="true" />
            Try again
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>

      {digest ? (
        <p className="mt-6 font-mono text-xs text-muted-foreground">
          Reference: {digest}
        </p>
      ) : null}
    </div>
  );
}
