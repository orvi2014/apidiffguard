import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, type PlanId } from "@/lib/plans";

export type WorkspaceContext = {
  userId: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
  plan: PlanId;
  stripeCustomerId: string | null;
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

/** Deduped per React request — layout + pages share one workspace lookup. */
export const getWorkspaceContext = cache(
  async (): Promise<WorkspaceContext | null> => {
    const { supabase, user } = await requireUser().catch(() => ({
      supabase: null,
      user: null,
    }));
    if (!supabase || !user) return null;

    const { data: membership } = await supabase
      .from("memberships")
      .select(
        "role, workspace_id, workspaces(id, name, slug, plan, stripe_customer_id)"
      )
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!membership) return null;

    const workspace = Array.isArray(membership.workspaces)
      ? membership.workspaces[0]
      : membership.workspaces;

    if (!workspace) return null;

    const ws = workspace as {
      id: string;
      name: string;
      slug: string;
      plan?: string | null;
      stripe_customer_id?: string | null;
    };

    return {
      userId: user.id,
      email: user.email ?? "",
      workspaceId: ws.id,
      workspaceName: ws.name,
      workspaceSlug: ws.slug,
      role: membership.role,
      plan: normalizePlan(ws.plan ?? "free"),
      stripeCustomerId: ws.stripe_customer_id ?? null,
    };
  }
);
