import { createClient } from "@/lib/supabase/server";

export type WorkspaceContext = {
  userId: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
};

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  return { supabase, user };
}

export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const { supabase, user } = await requireUser().catch(() => ({
    supabase: null,
    user: null,
  }));
  if (!supabase || !user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, workspace_id, workspaces(id, name, slug)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const workspace = Array.isArray(membership.workspaces)
    ? membership.workspaces[0]
    : membership.workspaces;

  if (!workspace) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    role: membership.role,
  };
}
