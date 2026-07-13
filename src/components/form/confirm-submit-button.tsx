"use client";

import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof PendingSubmitButton> & {
  confirmMessage: string;
};

export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...props
}: Props) {
  return (
    <PendingSubmitButton
      {...props}
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
