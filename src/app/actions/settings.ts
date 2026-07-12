"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

export async function updateProfile(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ name }).eq("id", ctx.userId);

  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
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

  if (!name || !slug) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ name, slug })
    .eq("id", ctx.workspaceId);

  if (error) return;

  revalidatePath("/settings/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}
