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
