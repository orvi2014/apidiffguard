"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

export async function updateProfile(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/settings/profile?error=name");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ name })
    .eq("id", ctx.userId);

  if (error) redirect("/settings/profile?error=save");

  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  redirect("/settings/profile?saved=1");
}

export async function updateWorkspace(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!name || !slug) {
    redirect("/settings/workspace?error=required");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ name, slug })
    .eq("id", ctx.workspaceId);

  if (error) redirect("/settings/workspace?error=save");

  revalidatePath("/settings/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  redirect("/settings/workspace?saved=1");
}
