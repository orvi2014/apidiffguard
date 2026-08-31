"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreBaselineAction } from "@/app/actions/endpoints";
import { Button } from "@/components/ui/button";

export function RestoreBaselineButton({
  endpointId,
  baselineId,
}: {
  endpointId: string;
  baselineId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        // Swapping the active baseline changes what every future check compares
        // against and resets the drift counters — the same weight as "Accept
        // baseline", which has always confirmed.
        if (
          !confirm(
            "Set this baseline as the active one? Future checks will compare against it."
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await restoreBaselineAction(endpointId, baselineId);
          if (result?.error) {
            setError(result.error);
            return;
          }
          setError(null);
          router.refresh();
        });
      }}
    >
      {pending ? "Restoring…" : "Restore as active"}
    </Button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
