import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createAlertChannel,
  deleteAlertChannel,
  toggleAlertChannel,
} from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Alert channels" };

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

function targetFromConfig(channel: string, config: unknown): string {
  if (!config || typeof config !== "object") return "—";
  const c = config as Record<string, unknown>;
  if (typeof c.email === "string") return c.email;
  if (typeof c.url === "string") return c.url;
  if (typeof c.webhookUrl === "string") return c.webhookUrl;
  return "—";
}

export default async function AlertChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/alerts/channels");

  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("alert_configs")
    .select("id, channel, config, min_severity, enabled, created_at")
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-5 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            <Link href="/alerts" className="hover:text-foreground">
              ← Alerts
            </Link>
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            Alert channels
          </h1>
          <p className="mt-1 text-sm text-muted">
            Route breaking and warning drift to Slack, Discord, email, or a
            webhook.
          </p>
        </div>
      </div>

      {params.created ? (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm"
        >
          Channel added.
        </p>
      ) : null}
      {params.deleted ? (
        <p
          role="status"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          Channel removed.
        </p>
      ) : null}
      {params.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
        >
          {params.error === "no-channel"
            ? "Add a channel before sending a test notification."
            : params.error === "invalid"
              ? "Choose a channel and enter a valid destination."
              : "Could not save channel. Try again."}
        </p>
      ) : null}

      <section
        aria-labelledby="add-channel-heading"
        className="border border-border bg-surface p-4 sm:p-5"
      >
        <h2 id="add-channel-heading" className="text-sm font-medium">
          Add channel
        </h2>
        <form action={createAlertChannel} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="channel">Channel</Label>
              <select
                id="channel"
                name="channel"
                required
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                defaultValue="SLACK"
              >
                {Object.entries(channelMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
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
              placeholder="Webhook URL or email address"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted">
              Slack/Discord/Webhook use a URL. Email uses an address.
            </p>
          </div>
          <Button type="submit" className="min-h-9">
            Add channel
          </Button>
        </form>
      </section>

      <section aria-labelledby="channels-list-heading">
        <h2 id="channels-list-heading" className="text-sm font-medium">
          Configured channels
        </h2>
        <div className="mt-3 divide-y divide-border border border-border">
          {!channels?.length ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              No channels yet. Add Slack, Discord, email, or a webhook above.
            </p>
          ) : (
            channels.map((row) => (
              <article
                key={row.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium">
                      {channelMeta[row.channel]?.label ?? row.channel}
                    </h3>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                        row.enabled
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.enabled ? "On" : "Off"}
                    </span>
                    <span className="text-[11px] text-muted">
                      ≥ {String(row.min_severity).toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted">
                    {targetFromConfig(row.channel, row.config)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleAlertChannel}>
                    <input type="hidden" name="id" value={row.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={row.enabled ? "true" : "false"}
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      {row.enabled ? "Disable" : "Enable"}
                    </Button>
                  </form>
                  <form action={deleteAlertChannel}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Remove
                    </Button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
