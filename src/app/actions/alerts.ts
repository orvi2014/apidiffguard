"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

const CHANNELS = ["EMAIL", "SLACK", "DISCORD", "WEBHOOK"] as const;
const SEVERITIES = ["INFO", "WARNING", "BREAKING"] as const;

export type AlertChannel = (typeof CHANNELS)[number];
export type AlertSeverity = (typeof SEVERITIES)[number];

function isChannel(value: string): value is AlertChannel {
  return (CHANNELS as readonly string[]).includes(value);
}

function isSeverity(value: string): value is AlertSeverity {
  return (SEVERITIES as readonly string[]).includes(value);
}

export async function createAlertChannel(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/alerts/channels");

  const channel = String(formData.get("channel") ?? "").toUpperCase();
  const target = String(formData.get("target") ?? "").trim();
  const minSeverity = String(formData.get("min_severity") ?? "WARNING").toUpperCase();

  if (!isChannel(channel) || !target) {
    redirect("/alerts/channels?error=invalid");
  }
  if (!isSeverity(minSeverity)) {
    redirect("/alerts/channels?error=invalid");
  }

  const config =
    channel === "EMAIL"
      ? { email: target }
      : channel === "WEBHOOK"
        ? { url: target }
        : channel === "SLACK"
          ? { webhookUrl: target }
          : { webhookUrl: target };

  const supabase = await createClient();
  const { error } = await supabase.from("alert_configs").insert({
    workspace_id: ctx.workspaceId,
    channel,
    min_severity: minSeverity,
    enabled: true,
    config,
  });

  if (error) {
    redirect("/alerts/channels?error=save-failed");
  }

  revalidatePath("/alerts");
  revalidatePath("/alerts/channels");
  redirect("/alerts/channels?created=1");
}

export async function toggleAlertChannel(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/alerts/channels");

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
  redirect("/alerts/channels");
}

export async function deleteAlertChannel(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/alerts/channels");

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

  const supabase = await createClient();
  const { data: configs } = await supabase
    .from("alert_configs")
    .select("id, enabled")
    .eq("workspace_id", ctx.workspaceId)
    .eq("enabled", true)
    .limit(1);

  const config = configs?.[0];
  if (!config) {
    redirect("/alerts/channels?error=no-channel");
  }

  const { error } = await supabase.from("alert_history").insert({
    alert_config_id: config.id,
    status: "SENT",
    severity: "INFO",
    message: "Test notification from APIDiffGuard console",
    sent_at: new Date().toISOString(),
  });

  if (error) {
    redirect("/alerts?error=test-failed");
  }

  revalidatePath("/alerts");
  redirect("/alerts?tested=1");
}
