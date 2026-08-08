"use client";

import { useActionState, useMemo, useState } from "react";
import { createAlertChannel } from "@/app/actions/alerts";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChannelMeta = {
  label: string;
  placeholder: string;
  hint: string;
  inputType?: string;
  mono?: boolean;
};

const channelMeta: Record<string, ChannelMeta> = {
  SLACK: {
    label: "Slack",
    placeholder: "https://hooks.slack.com/services/…",
    hint: "Incoming webhook URL",
    mono: true,
  },
  DISCORD: {
    label: "Discord",
    placeholder: "https://discord.com/api/webhooks/…",
    hint: "Webhook URL",
    mono: true,
  },
  WEBHOOK: {
    label: "Webhook",
    placeholder: "https://example.com/hooks/apidiff",
    hint: "HTTPS endpoint that accepts POST JSON",
    mono: true,
  },
  EMAIL: {
    label: "Email",
    placeholder: "alerts@yourcompany.com",
    hint: "We send a confirmation link first — alerts are withheld until the address confirms.",
    inputType: "email",
  },
};

export function AddChannelForm({
  emailEnabled = false,
}: {
  emailEnabled?: boolean;
}) {
  const [channel, setChannel] = useState("SLACK");
  const options = useMemo(
    () =>
      Object.entries(channelMeta).filter(
        // Hidden rather than shown-and-rejected: the server has no mail
        // credentials, so offering it would only produce a dead end.
        ([value]) => value !== "EMAIL" || emailEnabled
      ),
    [emailEnabled]
  );
  const meta = useMemo(() => channelMeta[channel] ?? channelMeta.SLACK, [channel]);
  const [state, formAction] = useActionState(createAlertChannel, {});

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="channel">Channel</Label>
          <select
            id="channel"
            name="channel"
            required
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm transition-colors"
          >
            {options.map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="min_severity">Minimum severity</Label>
          <select
            id="min_severity"
            name="min_severity"
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            defaultValue="WARNING"
          >
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="BREAKING">Breaking</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="target">Destination</Label>
        <Input
          id="target"
          name="target"
          required
          key={channel}
          type={meta.inputType ?? "text"}
          placeholder={meta.placeholder}
          className={`text-sm transition-opacity${meta.mono ? " font-mono" : ""}`}
        />
        <p className="text-xs text-muted transition-opacity">{meta.hint}</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm text-success">
          Channel added.
        </p>
      ) : null}

      <PendingSubmitButton className="min-h-9" pendingLabel="Adding…">
        Add channel
      </PendingSubmitButton>
    </form>
  );
}
