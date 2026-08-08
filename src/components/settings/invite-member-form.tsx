"use client";

import * as React from "react";
import { useActionState } from "react";
import { inviteMember } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { copyText } from "@/lib/clipboard";

export function InviteMemberForm({
  seatsRemaining,
}: {
  seatsRemaining: number | null;
}) {
  const [state, formAction] = useActionState(inviteMember, {});
  const [copied, setCopied] = React.useState(false);

  const full = seatsRemaining !== null && seatsRemaining <= 0;

  if (full) {
    return (
      <p className="mt-3 rounded-md border border-border bg-surface px-3 py-3 text-sm text-muted">
        Every seat on this plan is in use. Upgrade in{" "}
        <a href="/settings/billing" className="underline hover:text-foreground">
          Billing
        </a>{" "}
        or remove a member to invite someone new.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="teammate@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            name="role"
            defaultValue="MEMBER"
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm transition-colors sm:w-32"
          >
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
            <option value="ADMIN">Admin</option>
            {/* Owner is deliberately absent: ownership is transferred from the
                member list, not handed out at invite time. */}
          </select>
        </div>
      </div>

      {seatsRemaining !== null ? (
        <p className="text-xs text-muted">
          {seatsRemaining} seat{seatsRemaining === 1 ? "" : "s"} remaining on
          this plan.
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok && !state.inviteUrl ? (
        <p role="status" className="text-sm text-success">
          Invite sent.
        </p>
      ) : null}

      {state.inviteUrl ? (
        <div
          role="status"
          className="space-y-2 rounded-md border border-border bg-surface px-3 py-3"
        >
          <p className="text-xs text-muted">
            Share this link with them — it expires in seven days.
          </p>
          <code className="block break-all rounded bg-background px-2 py-1.5 font-mono text-[11px]">
            {state.inviteUrl}
          </code>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={async () => {
              const ok = await copyText(state.inviteUrl!);
              setCopied(ok);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      ) : null}

      <PendingSubmitButton size="sm" pendingLabel="Inviting…">
        Send invite
      </PendingSubmitButton>
    </form>
  );
}
