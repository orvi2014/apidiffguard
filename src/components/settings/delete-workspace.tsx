"use client";

import * as React from "react";
import { deleteWorkspace } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";

/**
 * Deleting a workspace destroys every endpoint, baseline, diff, schedule,
 * alert channel, and API token in it.
 *
 * A native confirm() is not enough for that: it is one keystroke away from
 * dismissal and says nothing about what is lost. The name has to be typed, and
 * the button stays disabled until it matches exactly.
 */
export function DeleteWorkspace({
  workspaceId,
  workspaceName,
  endpointCount,
  memberCount,
}: {
  workspaceId: string;
  workspaceName: string;
  endpointCount: number;
  memberCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const matches = typed === workspaceName;
  const inputId = React.useId();

  return (
    <section
      aria-labelledby="danger-zone-heading"
      className="mt-10 rounded-lg border border-danger/30 bg-danger/[0.03]"
    >
      <div className="border-b border-danger/20 px-4 py-3 sm:px-5">
        <h2
          id="danger-zone-heading"
          className="text-sm font-medium text-danger"
        >
          Danger zone
        </h2>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {!open ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-md">
              <p className="text-sm">Delete this workspace</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Removes {endpointCount === 1 ? "1 endpoint" : `${endpointCount} endpoints`}
                {" "}and their baselines, diffs, schedules, alert channels, and
                API tokens.
                {memberCount > 1
                  ? ` ${memberCount - 1} other member${
                      memberCount > 2 ? "s" : ""
                    } will lose access.`
                  : ""}{" "}
                This cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setOpen(true)}
            >
              Delete workspace
            </Button>
          </div>
        ) : (
          <form action={deleteWorkspace} className="space-y-3">
            <input type="hidden" name="workspace_id" value={workspaceId} />
            <p className="text-sm">
              This deletes{" "}
              <strong className="font-medium">{workspaceName}</strong> and
              everything in it, permanently.
            </p>
            <div>
              <label htmlFor={inputId} className="text-xs text-muted">
                Type <span className="font-mono text-foreground">{workspaceName}</span>{" "}
                to confirm
              </label>
              <Input
                id={inputId}
                name="confirm_name"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-describedby={`${inputId}-hint`}
                className="mt-1 font-mono"
              />
              <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted">
                {matches
                  ? "Names match."
                  : "The name must match exactly, including case."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PendingSubmitButton
                size="sm"
                variant="destructive"
                disabled={!matches}
                pendingLabel="Deleting…"
              >
                Delete this workspace
              </PendingSubmitButton>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  setTyped("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
