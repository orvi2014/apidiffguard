"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error/error-state";

export default function AppError({
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
      digest={error.digest}
      onRetry={() => unstable_retry()}
      homeHref="/"
      homeLabel="Back to home"
    />
  );
}
