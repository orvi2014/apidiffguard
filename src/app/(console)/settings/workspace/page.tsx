import { redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/form/confirm-submit-button";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { InviteMemberForm } from "@/components/settings/invite-member-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { canManageWorkspace, getPlan } from "@/lib/plans";
import { getWorkspaceContext } from "@/lib/workspace";
import { updateWorkspace } from "@/app/actions/settings";
import {
  changeMemberRole,
  removeMember,
  revokeInvite,
} from "@/app/actions/members";
import { DeleteWorkspace } from "@/components/settings/delete-workspace";
import { createWorkspace } from "@/app/actions/workspaces";

export const metadata = { title: "Workspace" };

export default async function WorkspaceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; members?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  const canManage = canManageWorkspace(ctx.role);
  const isOwner = ctx.role.toUpperCase() === "OWNER";

  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("memberships")
      .select("user_id, role, profiles(name, email)")
      .eq("workspace_id", ctx.workspaceId),
    supabase
      .from("workspace_invites")
      .select("id, email, role, expires_at, accepted_at")
      .eq("workspace_id", ctx.workspaceId)
      .is("accepted_at", null)
      // Expiry is filtered by the database clock rather than this process's:
      // it is the same clock that decides whether the invite still redeems.
      .gt("expires_at", "now()")
      .order("created_at", { ascending: false }),
  ]);

  const memberRows = members ?? [];
  const { count: endpointCount } = await supabase
    .from("endpoints")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspaceId);
  const ownerCount = memberRows.filter(
    (m) => String(m.role).toUpperCase() === "OWNER"
  ).length;
  const pendingInvites = invites ?? [];

  const seatLimit = getPlan(ctx.plan).seatLimit;
  const seatsRemaining =
    seatLimit == null
      ? null
      : Math.max(0, seatLimit - memberRows.length - pendingInvites.length);

  return (
    <div className="max-w-lg space-y-10">
      <div>
        <h2 className="text-base font-medium">Workspace</h2>
        <p className="mt-1 text-sm text-muted">
          Workspace name and members.
        </p>
      </div>

      {params.saved ? (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm"
        >
          Workspace updated.
        </p>
      ) : null}
      {params.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
        >
          {params.error === "required"
            ? "Name and slug are required."
            : params.error === "forbidden"
              ? "Only owners and admins can update workspace settings."
              : params.error === "last-owner"
                ? "A workspace must keep at least one owner. Promote someone else first."
                : params.error === "invalid-role"
                  ? "Only an owner can hand out ownership."
                  : params.error === "quota"
                    ? "You've reached the limit of workspaces per account."
                    : params.error === "name-required"
                      ? "Give the new workspace a name."
                      : params.error === "create-failed"
                        ? "Could not create the workspace. Try again."
                        : params.error === "delete-forbidden"
                          ? "Only an owner can delete a workspace."
                          : params.error === "delete-name-mismatch"
                            ? "The name didn't match, so nothing was deleted."
                            : params.error === "delete-failed"
                              ? "Could not delete the workspace. Nothing was removed."
                              : "Could not update workspace. The slug may already be taken."}
        </p>
      ) : null}
      {params.members ? (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm"
        >
          {params.members === "role-updated"
            ? "Role updated."
            : params.members === "removed"
              ? "Member removed."
              : "Invite revoked."}
        </p>
      ) : null}

      {canManage ? (
        <form action={updateWorkspace} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ws">Workspace name</Label>
            <Input
              id="ws"
              name="name"
              defaultValue={ctx.workspaceName}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={ctx.workspaceSlug}
              className="font-mono"
              required
            />
          </div>
          <PendingSubmitButton type="submit" pendingLabel="Saving…">
            Update workspace
          </PendingSubmitButton>
        </form>
      ) : (
        <div className="space-y-2 rounded-md border border-border bg-surface px-3 py-3 text-sm text-muted">
          <p>
            <span className="font-medium text-foreground">
              {ctx.workspaceName}
            </span>{" "}
            · <span className="font-mono text-xs">{ctx.workspaceSlug}</span>
          </p>
          <p>Only owners and admins can rename this workspace.</p>
        </div>
      )}

      <section aria-labelledby="members-heading">
        <h3 id="members-heading" className="text-sm font-medium">
          Members
        </h3>
        <p className="mt-1 text-xs text-muted">
          {seatLimit == null
            ? `${memberRows.length} members · unlimited seats`
            : `${memberRows.length} of ${seatLimit} seat${seatLimit === 1 ? "" : "s"} used`}
        </p>

        <ul className="mt-3 divide-y divide-border border-y border-border">
          {memberRows.map((m) => {
            const profile = Array.isArray(m.profiles)
              ? m.profiles[0]
              : m.profiles;
            const isSelf = m.user_id === ctx.userId;
            const role = String(m.role).toUpperCase();
            // The last owner cannot be demoted or removed — the database
            // rejects it either way, so don't offer the control.
            const lastOwner = role === "OWNER" && ownerCount <= 1;

            return (
              <li
                key={m.user_id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    {profile?.name ?? "Member"}
                    {isSelf ? (
                      <span className="ml-1.5 text-xs text-muted">(you)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {profile?.email}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canManage && !lastOwner ? (
                    <form action={changeMemberRole} className="flex gap-1.5">
                      <input
                        type="hidden"
                        name="user_id"
                        value={m.user_id}
                      />
                      <select
                        name="role"
                        defaultValue={role}
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                        aria-label={`Role for ${profile?.email ?? "member"}`}
                      >
                        {/* Always rendered so defaultValue={role} can match an
                            owner's actual role. Disabled for non-owners, who
                            may see the value but must not assign it —
                            previously the option was absent, the select fell
                            back to "Admin", and saving silently demoted an
                            owner. */}
                        <option value="OWNER" disabled={!isOwner}>
                          Owner
                        </option>
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <ConfirmSubmitButton
                        size="sm"
                        variant="secondary"
                        pendingLabel="Saving…"
                        confirmMessage={`Change ${
                          profile?.email ?? "this member"
                        }'s role? This takes effect immediately.`}
                      >
                        Save
                      </ConfirmSubmitButton>
                    </form>
                  ) : (
                    <span className="text-xs capitalize text-muted">
                      {role.toLowerCase()}
                    </span>
                  )}

                  {(canManage || isSelf) && !lastOwner ? (
                    <form action={removeMember}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <ConfirmSubmitButton
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        pendingLabel="Removing…"
                        confirmMessage={
                          isSelf
                            ? "Leave this workspace? You'll lose access until someone invites you back."
                            : "Remove this member from the workspace?"
                        }
                      >
                        {isSelf ? "Leave" : "Remove"}
                      </ConfirmSubmitButton>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {canManage ? (
          <div className="mt-6">
            <h4 className="text-sm font-medium">Invite someone</h4>
            <InviteMemberForm seatsRemaining={seatsRemaining} />
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">
            Only owners and admins can invite or remove members.
          </p>
        )}

        {canManage && pendingInvites.length ? (
          <div className="mt-6">
            <h4 className="text-sm font-medium">Pending invites</h4>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{invite.email}</p>
                    <p className="text-xs text-muted">
                      {String(invite.role).toLowerCase()} · expires{" "}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <form action={revokeInvite}>
                    <input type="hidden" name="invite_id" value={invite.id} />
                    <PendingSubmitButton
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      pendingLabel="Revoking…"
                    >
                      Revoke
                    </PendingSubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="create-workspace-heading" id="create">
        <h3 id="create-workspace-heading" className="text-sm font-medium">
          New workspace
        </h3>
        <p className="mt-1 text-xs text-muted">
          Workspaces have separate endpoints, billing, and members.
        </p>
        <form action={createWorkspace} className="mt-3 flex flex-wrap gap-2">
          <Input
            name="name"
            required
            maxLength={80}
            placeholder="Acme production"
            className="max-w-xs"
            aria-label="New workspace name"
          />
          <PendingSubmitButton size="sm" pendingLabel="Creating…">
            Create workspace
          </PendingSubmitButton>
        </form>
      </section>

      {/* Owners only: an admin can manage members but must not be able to
          destroy everyone's data. */}
      {isOwner ? (
        <DeleteWorkspace
          workspaceId={ctx.workspaceId}
          workspaceName={ctx.workspaceName}
          endpointCount={endpointCount ?? 0}
          memberCount={memberRows.length}
        />
      ) : null}
    </div>
  );
}
