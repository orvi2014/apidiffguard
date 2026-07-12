"use client";

import { useMemo, useState } from "react";
import { createAlertChannel } from "@/app/actions/alerts";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const channelMeta: Record<
  string,
  { label: string; placeholder: string; hint: string }
> = {
  EMAIL: {
    label: "Email",
    placeholder: "alerts@yourcompany.com",
    hint: "Destination email address",
  },
  SLACK: {
    label: "Slack",
    placeholder: "https://hooks.slack.com/services/…",
    hint: "Incoming webhook URL",
  },
  DISCORD: {
    label: "Discord",
    placeholder: "https://discord.com/api/webhooks/…",
    hint: "Webhook URL",
  },
  WEBHOOK: {
    label: "Webhook",
    placeholder: "https://example.com/hooks/apidiff",
    hint: "HTTPS endpoint that accepts POST JSON",
  },
};

export function AddChannelForm() {
  const [channel, setChannel] = useState("SLACK");
  const meta = useMemo(() => channelMeta[channel] ?? channelMeta.SLACK, [channel]);

  return (
    <form action={createAlertChannel} className="mt-4 space-y-4">
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
            {Object.entries(channelMeta).map(([value, item]) => (
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
          placeholder={meta.placeholder}
          className="font-mono text-sm transition-opacity"
        />
        <p className="text-xs text-muted transition-opacity">{meta.hint}</p>
      </div>
      <PendingSubmitButton className="min-h-9" pendingLabel="Adding…">
        Add channel
      </PendingSubmitButton>
    </form>
  );
}
