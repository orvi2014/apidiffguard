import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { canManageWorkspace } from "@/lib/plans";
import { getWorkspaceContext } from "@/lib/workspace";
import { updateWorkspace } from "@/app/actions/settings";

export const metadata = { title: "Workspace" };

export default async function WorkspaceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  const canManage = canManageWorkspace(ctx.role);

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("memberships")
    .select("role, profiles(name, email)")
    .eq("workspace_id", ctx.workspaceId);

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
              : "Could not update workspace. The slug may already be taken."}
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

      <div>
        <h3 className="text-sm font-medium">Members</h3>
        <p className="mt-1 text-xs text-muted">
          Invite links and role changes are coming soon.
        </p>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {(members ?? []).map((m, i) => {
            const profile = Array.isArray(m.profiles)
              ? m.profiles[0]
              : m.profiles;
            return (
              <li
                key={profile?.email ?? i}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm">{profile?.name ?? "Member"}</p>
                  <p className="text-xs text-muted">{profile?.email}</p>
                </div>
                <span className="text-xs capitalize text-muted">
                  {String(m.role).toLowerCase()}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
