"use client";

import { useTransition } from "react";
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

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await restoreBaselineAction(endpointId, baselineId);
          if (result?.error) {
            alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      {pending ? "Restoring…" : "Restore as active"}
    </Button>
  );
}
