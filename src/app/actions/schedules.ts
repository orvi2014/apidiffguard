"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEditWorkspace, planAllowsSchedules } from "@/lib/plans";
import { getWorkspaceContext } from "@/lib/workspace";

const FREQUENCIES = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"] as const;
type Frequency = (typeof FREQUENCIES)[number];

function isFrequency(value: string): value is Frequency {
  return (FREQUENCIES as readonly string[]).includes(value);
}

export async function createSchedule(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/schedules");
  if (!canEditWorkspace(ctx.role)) {
    redirect("/schedules?error=forbidden");
  }
  if (!planAllowsSchedules(ctx.plan)) {
    redirect("/schedules?error=plan");
  }

  const endpointId = String(formData.get("endpoint_id") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "DAILY").toUpperCase();

  if (!endpointId || !isFrequency(frequency)) {
    redirect("/schedules?error=invalid");
  }

  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("id")
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (!endpoint) {
    redirect("/schedules?error=invalid");
  }

  const { error } = await supabase.from("schedules").insert({
    workspace_id: ctx.workspaceId,
    endpoint_id: endpointId,
    frequency,
    enabled: true,
    next_run_at: new Date().toISOString(),
  });

  if (error) {
    redirect("/schedules?error=save-failed");
  }

  revalidatePath("/schedules");
  revalidatePath("/dashboard");
  redirect("/schedules?created=1");
}

export async function toggleSchedule(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/schedules");
  if (!canEditWorkspace(ctx.role)) {
    redirect("/schedules?error=forbidden");
  }

  const id = String(formData.get("id") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!id) redirect("/schedules?error=invalid");

  // Enabling: require paid plan
  if (!enabled && !planAllowsSchedules(ctx.plan)) {
    redirect("/schedules?error=plan");
  }

  const supabase = await createClient();
  const patch: {
    enabled: boolean;
    next_run_at?: string | null;
  } = { enabled: !enabled };

  if (!enabled) {
    // Turning ON — run on next cron tick
    patch.next_run_at = new Date().toISOString();
  }
  if (enabled) {
    // Turning OFF
    patch.next_run_at = null;
  }

  const { error } = await supabase
    .from("schedules")
    .update(patch)
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);

  if (error) {
    redirect("/schedules?error=save-failed");
  }

  revalidatePath("/schedules");
  revalidatePath("/dashboard");
}

export async function deleteSchedule(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/schedules");
  if (!canEditWorkspace(ctx.role)) {
    redirect("/schedules?error=forbidden");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/schedules?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);

  if (error) {
    redirect("/schedules?error=save-failed");
  }

  revalidatePath("/schedules");
  revalidatePath("/dashboard");
  redirect("/schedules?deleted=1");
}
