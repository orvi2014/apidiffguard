"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-url";
import { appUrl } from "@/lib/app-url";

export type AuthResult = { error?: string; success?: boolean };

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function oauthStartError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("provider is not enabled") ||
    lower.includes("unsupported provider")
  ) {
    return "GitHub sign-in isn’t enabled yet. Ask an admin to turn on the GitHub provider in Supabase Auth.";
  }
  return message;
}

/**
 * GitHub is the only way in.
 *
 * Email + password was removed rather than kept as a second option: the
 * project runs with `mailer_autoconfirm` on, so anyone could have registered
 * under an address they did not control — for a product whose whole job is
 * emailing you about breaking changes, that is the wrong front door. GitHub
 * hands us a verified address and an avatar, and there is no password to
 * reset, leak, or store.
 */
export async function signInWithGitHub(formData?: FormData) {
  const supabase = await createClient();
  const origin = appUrl();
  const next = safeNextPath(
    formData ? String(formData.get("next") ?? "/dashboard") : "/dashboard"
  );
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: oauthStartError(error.message) };
  if (data.url) redirect(data.url);
  return { error: "Could not start GitHub login." };
}
