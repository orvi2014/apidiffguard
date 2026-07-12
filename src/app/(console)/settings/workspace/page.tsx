import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { updateWorkspace } from "@/app/actions/settings";

export const metadata = { title: "Workspace" };

export default async function WorkspaceSettingsPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

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
          Name, members, and invitations.
        </p>
      </div>

      <form action={updateWorkspace} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ws">Workspace name</Label>
          <Input id="ws" name="name" defaultValue={ctx.workspaceName} required />
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
        <Button type="submit">Update workspace</Button>
      </form>

      <div>
        <h3 className="text-sm font-medium">Members</h3>
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
