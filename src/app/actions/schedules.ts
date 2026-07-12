"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

const FREQUENCIES = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"] as const;
type Frequency = (typeof FREQUENCIES)[number];

function isFrequency(value: string): value is Frequency {
  return (FREQUENCIES as readonly string[]).includes(value);
}

function computeNextRunAt(frequency: Frequency, from = new Date()): string {
  const next = new Date(from);
  switch (frequency) {
    case "HOURLY":
      next.setHours(next.getHours() + 1);
      break;
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next.toISOString();
}

export async function createSchedule(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/schedules");

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
    next_run_at: computeNextRunAt(frequency),
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

  const id = String(formData.get("id") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const frequency = String(formData.get("frequency") ?? "DAILY").toUpperCase();
  if (!id) redirect("/schedules?error=invalid");

  const supabase = await createClient();
  const patch: {
    enabled: boolean;
    next_run_at?: string | null;
  } = { enabled: !enabled };

  if (!enabled && isFrequency(frequency)) {
    patch.next_run_at = computeNextRunAt(frequency);
  }
  if (enabled) {
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
