"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, WORKSPACE_COOKIE } from "@/lib/workspace";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Switch the active workspace.
 *
 * Membership is re-checked here rather than trusted from the form: the cookie
 * is user-controlled, and this action is what makes it authoritative for every
 * subsequent request.
 */
export async function switchWorkspace(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  if (!workspaceId) redirect("/dashboard");

  const { supabase, user } = await requireUser().catch(() => ({
    supabase: null,
    user: null,
  }));
  if (!supabase || !user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    // Not a member: leave the current selection alone rather than clearing it.
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  // Back to the dashboard rather than the current page: ids in the URL belong
  // to the workspace being left, so staying put would 404 or leak a not-found.
  redirect("/dashboard");
}

/** Create a workspace and switch to it. */
export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/settings/workspace?error=name-required");
  if (name.length > 80) redirect("/settings/workspace?error=name-too-long");

  const { user } = await requireUser().catch(() => ({ user: null }));
  if (!user) redirect("/login");

  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const slug = `${slugBase || "workspace"}-${Math.abs(
    [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)
  ).toString(36)}`;

  const supabase = await createClient();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error || !workspace) {
    redirect("/settings/workspace?error=create-failed");
  }

  // The owner membership is what the per-account workspace quota trigger
  // counts, so a rejection here surfaces as a create failure.
  const { error: membershipError } = await supabase
    .from("memberships")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "OWNER",
    });

  if (membershipError) {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    redirect("/settings/workspace?error=quota");
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  redirect("/dashboard");
}

/**
 * Delete a workspace and everything in it.
 *
 * Owner-only, and gated on the operator typing the workspace name — this
 * removes endpoints, baselines, diffs, schedules, alert channels, and tokens by
 * cascade, and none of it is recoverable.
 *
 * The active-workspace cookie is re-pointed at another membership afterwards,
 * because leaving it aimed at a deleted row logs the user into nothing.
 */
export async function deleteWorkspace(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const typedName = String(formData.get("confirm_name") ?? "").trim();
  if (!workspaceId) redirect("/settings/workspace?error=delete-failed");

  const { user, supabase } = await requireUser();

  // Re-read the role rather than trusting the form: this is the only thing
  // standing between an admin and everyone else's data.
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "OWNER") {
    redirect("/settings/workspace?error=delete-forbidden");
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!workspace) redirect("/settings/workspace?error=delete-failed");
  if (typedName !== workspace.name) {
    redirect("/settings/workspace?error=delete-name-mismatch");
  }

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (error) redirect("/settings/workspace?error=delete-failed");

  // Land on whichever workspace remains, or let the app create a fresh one.
  const { data: remaining } = await supabase
    .from("memberships")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const cookieStore = await cookies();
  if (remaining?.workspace_id) {
    cookieStore.set(WORKSPACE_COOKIE, remaining.workspace_id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
    });
  } else {
    cookieStore.delete(WORKSPACE_COOKIE);
  }

  redirect("/dashboard?deleted=workspace");
}
