"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { emailConfigured, isValidEmail, sendEmail } from "@/lib/alerts/email";
import { canManageWorkspace } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { appUrl } from "@/lib/app-url";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;
type InvitableRole = (typeof ROLES)[number];

function isInvitableRole(value: string): value is InvitableRole {
  return (ROLES as readonly string[]).includes(value);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function inviteEmailBody(opts: {
  workspaceName: string;
  inviteUrl: string;
  role: string;
}) {
  const shell =
    "font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" +
    "background:#0b0d10;color:#e6e8eb;padding:32px;border-radius:12px;max-width:520px;margin:0 auto";
  const safeName = opts.workspaceName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return {
    subject: `You've been invited to ${opts.workspaceName} on APIDiffGuard`,
    html: `<div style="${shell}">
  <h1 style="margin:0 0 16px;font-size:18px;font-weight:600">Join ${safeName}</h1>
  <p style="margin:0;line-height:1.6;color:#b6bcc4">
    You've been invited to the ${safeName} workspace as ${opts.role.toLowerCase()}.
  </p>
  <p style="margin:24px 0 0"><a href="${opts.inviteUrl}" style="background:#4F7FFF;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Accept invite</a></p>
  <p style="margin:24px 0 0;font-size:12px;color:#7b828b">This invite expires in 7 days.</p>
</div>`,
    text: `You've been invited to the ${opts.workspaceName} workspace on APIDiffGuard as ${opts.role.toLowerCase()}.\n\nAccept: ${opts.inviteUrl}\n\nThis invite expires in 7 days.`,
  };
}

export type MemberFormState = {
  error?: string;
  ok?: boolean;
  /** Returned when mail is unconfigured so the link can be shared by hand. */
  inviteUrl?: string;
};

export async function inviteMember(
  _prev: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/settings/workspace");
  if (!canManageWorkspace(ctx.role)) {
    return { error: "Only owners and admins can invite members." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "MEMBER").toUpperCase();

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!isInvitableRole(role)) {
    return { error: "Pick a valid role." };
  }

  const supabase = await createClient();

  const { data: existingMember } = await supabase
    .from("memberships")
    .select("user_id, profiles!inner(email)")
    .eq("workspace_id", ctx.workspaceId)
    .eq("profiles.email", email)
    .maybeSingle();

  if (existingMember) {
    return { error: "That person is already a member of this workspace." };
  }

  const token = randomBytes(32).toString("base64url");

  // Replaces any outstanding invite for the same address — the partial unique
  // index only covers unaccepted rows, so this cannot clobber history.
  await supabase
    .from("workspace_invites")
    .delete()
    .eq("workspace_id", ctx.workspaceId)
    .eq("email", email)
    .is("accepted_at", null);

  const { data: invite, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: ctx.workspaceId,
      email,
      role,
      token_hash: hashToken(token),
      invited_by: ctx.userId,
      expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    })
    .select("id")
    .single();

  if (error || !invite) {
    return { error: "Could not create the invite. Try again." };
  }

  const inviteUrl = `${appUrl()}/invite/${token}`;
  revalidatePath("/settings/workspace");

  if (!emailConfigured()) {
    // No mail configured is not a reason to block the feature: hand the link
    // back so it can be sent however the admin likes.
    return { ok: true, inviteUrl };
  }

  const sent = await sendEmail({
    to: email,
    ...inviteEmailBody({
      workspaceName: ctx.workspaceName,
      inviteUrl,
      role,
    }),
  });

  if (!sent.ok) {
    return {
      ok: true,
      inviteUrl,
      error: `Invite created, but the email could not be sent (${sent.error}). Share this link instead.`,
    };
  }

  return { ok: true };
}

export async function revokeInvite(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/settings/workspace");
  if (!canManageWorkspace(ctx.role)) {
    redirect("/settings/workspace?error=forbidden");
  }

  const id = String(formData.get("invite_id") ?? "").trim();
  if (!id) redirect("/settings/workspace?error=invalid");

  const supabase = await createClient();
  await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .is("accepted_at", null);

  revalidatePath("/settings/workspace");
  redirect("/settings/workspace?members=invite-revoked");
}

export async function changeMemberRole(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/settings/workspace");
  if (!canManageWorkspace(ctx.role)) {
    redirect("/settings/workspace?error=forbidden");
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").toUpperCase();
  if (!userId) redirect("/settings/workspace?error=invalid");

  // Only an owner may create another owner; an admin promoting themselves to
  // owner would be a privilege escalation.
  const allowed =
    role === "OWNER"
      ? ctx.role.toUpperCase() === "OWNER"
      : isInvitableRole(role);
  if (!allowed) redirect("/settings/workspace?error=invalid-role");

  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .update({ role })
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", userId);

  revalidatePath("/settings/workspace");
  // The last-owner trigger is the authority here, so a rejection means exactly
  // one thing.
  redirect(
    error
      ? "/settings/workspace?error=last-owner"
      : "/settings/workspace?members=role-updated"
  );
}

export async function removeMember(formData: FormData) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/settings/workspace");

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) redirect("/settings/workspace?error=invalid");

  // Anyone may remove themselves; removing someone else needs management.
  const isSelf = userId === ctx.userId;
  if (!isSelf && !canManageWorkspace(ctx.role)) {
    redirect("/settings/workspace?error=forbidden");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", userId);

  if (error) {
    redirect("/settings/workspace?error=last-owner");
  }

  revalidatePath("/settings/workspace");
  redirect(isSelf ? "/dashboard" : "/settings/workspace?members=removed");
}
