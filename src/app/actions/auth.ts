"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-url";

export type AuthResult = { error?: string; success?: boolean };

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const workspace = String(formData.get("workspace") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? "/dashboard"));
  const plan = String(formData.get("plan") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split("@")[0],
        workspace_name: workspace || undefined,
      },
    },
  });

  if (error) return { error: error.message };

  if (plan && ["/settings/billing", "/dashboard"].includes(next)) {
    redirect(`/settings/billing?upgrade=${encodeURIComponent(plan)}`);
  }
  redirect(next);
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(safeNextPath(String(formData.get("next") ?? "/dashboard")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signInWithGitHub(formData?: FormData) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const next = safeNextPath(
    formData ? String(formData.get("next") ?? "/dashboard") : "/dashboard"
  );
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { error: "Could not start GitHub login." };
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/update-password")}`,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/dashboard?password=updated");
}
