import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, type PlanId } from "@/lib/plans";
import {
  AUTH_USER_HEADER,
  AUTH_VERIFIED_HEADER,
} from "@/lib/auth-headers";

export type WorkspaceContext = {
  userId: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
  plan: PlanId;
  stripeCustomerId: string | null;
  polarCustomerId: string | null;
  /** Set by the Stripe webhook when an invoice fails; cleared on a good charge. */
  paymentFailedAt: string | null;
};

export async function requireUser() {
  const supabase = await createClient();
  const h = await headers();
  const verified = h.get(AUTH_VERIFIED_HEADER) === "1";
  const verifiedUserId = h.get(AUTH_USER_HEADER);

  // Middleware already validated the JWT — reuse the local session when it matches.
  if (verified && verifiedUserId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id === verifiedUserId) {
      return { supabase, user: session.user };
    }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  return { supabase, user };
}

/**
 * Cookie holding the workspace the user last selected.
 *
 * Workspace identity used to be implicit — whichever membership sorted first —
 * so a user in two workspaces could only ever see one of them, and which one
 * depended on join order. Making the choice explicit is what allows a switcher
 * to exist at all.
 */
export const WORKSPACE_COOKIE = "adg_workspace";

const MEMBERSHIP_SELECT =
  "role, workspace_id, workspaces(id, name, slug, plan, stripe_customer_id, polar_customer_id, payment_failed_at)";

type MembershipRow = {
  role: string;
  workspace_id: string;
  workspaces:
    | {
        id: string;
        name: string;
        slug: string;
        plan?: string | null;
        stripe_customer_id?: string | null;
        polar_customer_id?: string | null;
        payment_failed_at?: string | null;
      }
    | Array<{
        id: string;
        name: string;
        slug: string;
        plan?: string | null;
        stripe_customer_id?: string | null;
        polar_customer_id?: string | null;
        payment_failed_at?: string | null;
      }>
    | null;
};

/** Deduped per React request — layout + pages share one workspace lookup. */
export const getWorkspaceContext = cache(
  async (): Promise<WorkspaceContext | null> => {
    const { supabase, user } = await requireUser().catch(() => ({
      supabase: null,
      user: null,
    }));
    if (!supabase || !user) return null;

    const cookieStore = await cookies();
    const selectedId = cookieStore.get(WORKSPACE_COOKIE)?.value;

    let membership: MembershipRow | null = null;

    if (selectedId) {
      // Filtering on user_id *and* the requested workspace is the membership
      // check: a cookie naming someone else's workspace matches nothing and
      // falls through to the default below.
      const { data } = await supabase
        .from("memberships")
        .select(MEMBERSHIP_SELECT)
        .eq("user_id", user.id)
        .eq("workspace_id", selectedId)
        .maybeSingle();
      membership = (data as MembershipRow | null) ?? null;
    }

    if (!membership) {
      const { data } = await supabase
        .from("memberships")
        .select(MEMBERSHIP_SELECT)
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      membership = (data as MembershipRow | null) ?? null;
    }

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
      polar_customer_id?: string | null;
      payment_failed_at?: string | null;
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
      polarCustomerId: ws.polar_customer_id ?? null,
      paymentFailedAt: ws.payment_failed_at ?? null,
    };
  }
);

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

/** Every workspace the signed-in user belongs to, for the switcher. */
export const listUserWorkspaces = cache(
  async (): Promise<WorkspaceSummary[]> => {
    const { supabase, user } = await requireUser().catch(() => ({
      supabase: null,
      user: null,
    }));
    if (!supabase || !user) return [];

    const { data } = await supabase
      .from("memberships")
      .select("role, workspaces(id, name, slug)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true, nullsFirst: false });

    const rows = (data ?? []) as Array<{
      role: string;
      workspaces:
        | { id: string; name: string; slug: string }
        | Array<{ id: string; name: string; slug: string }>
        | null;
    }>;

    return rows.flatMap((row) => {
      const ws = Array.isArray(row.workspaces)
        ? row.workspaces[0]
        : row.workspaces;
      if (!ws) return [];
      return [{ id: ws.id, name: ws.name, slug: ws.slug, role: row.role }];
    });
  }
);
