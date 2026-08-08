"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canEditWorkspace,
  planAllowsSchedules,
  planEndpointLimit,
} from "@/lib/plans";
import { getWorkspaceContext } from "@/lib/workspace";

const FREQUENCIES = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"] as const;
type Frequency = (typeof FREQUENCIES)[number];

function isFrequency(value: string): value is Frequency {
  return (FREQUENCIES as readonly string[]).includes(value);
}

export type FormState = { error?: string; ok?: boolean };

/** Returns `{ error }` instead of `?error=code` — see createAlertChannel. */
export async function createSchedule(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/schedules");
  if (!canEditWorkspace(ctx.role)) {
    return { error: "Your role cannot manage schedules." };
  }
  if (!planAllowsSchedules(ctx.plan)) {
    return {
      error:
        "Scheduled checks need a Starter plan or above. Upgrade in Settings → Billing.",
    };
  }

  const endpointId = String(formData.get("endpoint_id") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "DAILY").toUpperCase();

  if (!endpointId || !isFrequency(frequency)) {
    return { error: "Pick an endpoint and a valid frequency." };
  }

  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("id")
    .eq("id", endpointId)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (!endpoint) {
    return { error: "That endpoint doesn’t exist in this workspace." };
  }

  // One schedule per endpoint (also enforced by a unique index), and a cap on
  // how many an workspace can run — otherwise a Starter plan could schedule the
  // same endpoint a hundred times and multiply its outbound traffic.
  const { data: existing } = await supabase
    .from("schedules")
    .select("id")
    .eq("endpoint_id", endpointId)
    .maybeSingle();

  if (existing) {
    return { error: "That endpoint already has a schedule." };
  }

  const limit = planEndpointLimit(ctx.plan);
  if (limit != null) {
    const { count } = await supabase
      .from("schedules")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId);
    if ((count ?? 0) >= limit) {
      return {
        error: `Your ${ctx.plan} plan allows ${limit} schedules. Upgrade to add more.`,
      };
    }
  }

  const { error } = await supabase.from("schedules").insert({
    workspace_id: ctx.workspaceId,
    endpoint_id: endpointId,
    frequency,
    enabled: true,
    next_run_at: new Date().toISOString(),
  });

  if (error) {
    return { error: "Couldn’t save that schedule. Try again." };
  }

  revalidatePath("/schedules");
  revalidatePath("/dashboard");
  return { ok: true };
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
