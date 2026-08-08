"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error/error-state";

export default function ConsoleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="This view failed to load"
      description="Your endpoints and history are safe. Retrying usually resolves a transient database or network error."
      digest={error.digest}
      onRetry={() => unstable_retry()}
    />
  );
}
