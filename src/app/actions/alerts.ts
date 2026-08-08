"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isValidTarget,
  isWebhookChannel,
  type WebhookChannel,
} from "@/lib/alerts/channel-targets";
import { deliverAlert, type DeliverableChannel } from "@/lib/alerts/deliver";
import { emailConfigured, isValidEmail } from "@/lib/alerts/email";
import { startEmailVerification } from "@/lib/alerts/email-verification";
import { canEditWorkspace } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

const SEVERITIES = ["INFO", "WARNING", "BREAKING"] as const;

export type AlertChannel = WebhookChannel | "EMAIL";
export type AlertSeverity = (typeof SEVERITIES)[number];

/** Whether the server can send mail at all — drives the channel picker. */
export async function isEmailChannelAvailable(): Promise<boolean> {
  return emailConfigured();
}

function isSeverity(value: string): value is AlertSeverity {
  return (SEVERITIES as readonly string[]).includes(value);
}


export type FormState = { error?: string; ok?: boolean };

/**
 * Returns `{ error }` rather than redirecting with `?error=code`.
 *
 * Query-string errors were bookmarkable, shareable, and forced every page to
 * hand-decode an opaque code far from the field that caused it. useActionState
 * keeps the message next to the form.
 */
export async function createAlertChannel(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/alerts/channels");
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Your role cannot manage alert channels." };
  }

  const channel = String(formData.get("channel") ?? "").toUpperCase();
  const target = String(formData.get("target") ?? "").trim();
  const minSeverity = String(
    formData.get("min_severity") ?? "WARNING"
  ).toUpperCase();

  if (!isSeverity(minSeverity)) {
    return { error: "Pick a valid minimum severity." };
  }

  if (channel === "EMAIL") {
    if (!emailConfigured()) {
      return {
        error:
          "Email delivery isn’t configured on this server. Use Slack, Discord, Mattermost, or a webhook.",
      };
    }
    if (!isValidEmail(target)) {
      return { error: "Enter a valid email address." };
    }

    const supabase = await createClient();
    const { data: created, error } = await supabase
      .from("alert_configs")
      .insert({
        workspace_id: ctx.workspaceId,
        channel: "EMAIL",
        min_severity: minSeverity,
        enabled: true,
        config: { email: target.trim() },
      })
      .select("id")
      .single();

    if (error || !created) {
      return { error: "Couldn’t save that channel. Try again." };
    }

    // The channel exists but stays inert until the address confirms, so a
    // failure to send the confirmation is reported without losing the row.
    const started = await startEmailVerification({
      alertConfigId: created.id,
      email: target.trim(),
      workspaceName: ctx.workspaceName,
    });

    revalidatePath("/alerts");
    revalidatePath("/alerts/channels");

    if (!started.ok) {
      return {
        error: `Channel saved, but the confirmation email could not be sent: ${started.error}`,
      };
    }
    return { ok: true };
  }

  if (!isWebhookChannel(channel)) {
    return { error: "Pick a supported channel." };
  }
  if (!target) {
    return { error: "Enter the webhook URL for this channel." };
  }
  if (!isValidTarget(channel, target)) {
    return {
      error:
        channel === "SLACK"
          ? "That doesn’t look like a Slack incoming webhook (https://hooks.slack.com/services/…)."
          : channel === "DISCORD"
            ? "That doesn’t look like a Discord webhook (https://discord.com/api/webhooks/…)."
            : channel === "MATTERMOST"
              ? "That doesn’t look like a Mattermost incoming webhook (https://your-server/hooks/…). It must be reachable from the public internet."
              : "Enter a public https URL.",
    };
  }
  const config =
    channel === "WEBHOOK" ? { url: target } : { webhookUrl: target };

  const supabase = await createClient();
  const { error } = await supabase.from("alert_configs").insert({
    workspace_id: ctx.workspaceId,
    channel,
    min_severity: minSeverity,
    enabled: true,
    config,
  });

  if (error) {
    return { error: "Couldn’t save that channel. Try again." };
  }

  revalidatePath("/alerts");
  revalidatePath("/alerts/channels");
  return { ok: true };
}

export async function toggleAlertChannel(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/alerts/channels");
  if (!canEditWorkspace(ctx.role)) {
    redirect("/alerts/channels?error=forbidden");
  }

  const id = String(formData.get("id") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!id) redirect("/alerts/channels?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("alert_configs")
    .update({ enabled: !enabled })
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);

  if (error) {
    redirect("/alerts/channels?error=save-failed");
  }

  revalidatePath("/alerts");
  revalidatePath("/alerts/channels");
}

/** Re-issue a confirmation link for an unverified email channel. */
export async function resendChannelVerification(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/alerts/channels");
  if (!canEditWorkspace(ctx.role)) {
    redirect("/alerts/channels?error=forbidden");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/alerts/channels?error=invalid");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("alert_configs")
    .select("id, channel, config, verified_at")
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (!row || row.channel !== "EMAIL") {
    redirect("/alerts/channels?error=invalid");
  }
  if (row.verified_at) {
    redirect("/alerts/channels?verify=already-verified");
  }

  const email = (row.config as Record<string, unknown> | null)?.email;
  if (typeof email !== "string" || !isValidEmail(email)) {
    redirect("/alerts/channels?error=invalid");
  }

  const started = await startEmailVerification({
    alertConfigId: row.id,
    email,
    workspaceName: ctx.workspaceName,
  });

  revalidatePath("/alerts/channels");
  redirect(
    started.ok
      ? "/alerts/channels?verify=resent"
      : "/alerts/channels?error=verify-send-failed"
  );
}

export async function deleteAlertChannel(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/alerts/channels");
  if (!canEditWorkspace(ctx.role)) {
    redirect("/alerts/channels?error=forbidden");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/alerts/channels?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("alert_configs")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);

  if (error) {
    redirect("/alerts/channels?error=save-failed");
  }

  revalidatePath("/alerts");
  revalidatePath("/alerts/channels");
  redirect("/alerts/channels?deleted=1");
}

export async function testAlertNotification() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/alerts");
  if (!canEditWorkspace(ctx.role)) {
    redirect("/alerts?error=forbidden");
  }

  const supabase = await createClient();
  const { data: configs } = await supabase
    .from("alert_configs")
    .select("id, channel, config, enabled, verified_at")
    .eq("workspace_id", ctx.workspaceId)
    .eq("enabled", true)
    .order("created_at", { ascending: true });

  if (!configs?.length) {
    redirect("/alerts/channels?error=no-channel");
  }

  const message = "Test notification from APIDiffGuard console";
  let anyOk = false;
  let anyFail = false;

  for (const config of configs) {
    const delivery = await deliverAlert({
      channel: config.channel as DeliverableChannel,
      config: (config.config ?? {}) as Record<string, unknown>,
      message,
      severity: "INFO",
      verified: Boolean(config.verified_at),
    });

    await supabase.from("alert_history").insert({
      alert_config_id: config.id,
      status: delivery.status,
      severity: "INFO",
      message,
      payload: delivery.payload ?? null,
      error: delivery.error ?? null,
      sent_at: delivery.ok ? new Date().toISOString() : null,
    });

    if (delivery.ok) anyOk = true;
    else anyFail = true;
  }

  revalidatePath("/alerts");
  if (anyOk && !anyFail) redirect("/alerts?tested=1");
  if (anyOk && anyFail) redirect("/alerts?tested=1&error=partial");
  redirect("/alerts?error=delivery-failed");
}
