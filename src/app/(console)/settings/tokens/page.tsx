import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiTokensManager } from "@/components/settings/api-tokens-manager";
import { Button } from "@/components/ui/button";
import { canEditWorkspace } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "API tokens" };

export default async function TokensPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login?next=/settings/tokens");

  const supabase = await createClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, prefix, created_at, last_used_at, scopes")
    .eq("workspace_id", ctx.workspaceId)
    // Revoked keys are kept for audit but must not look active here.
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-base font-medium">API tokens</h2>
        <p className="mt-1 text-sm text-muted">
          Authenticate{" "}
          <code className="font-mono text-xs">
            POST /api/v1/endpoints/:id/check
          </code>{" "}
          from CI. Tokens are shown once at creation.
        </p>
      </div>

      <ApiTokensManager
        keys={keys ?? []}
        canEdit={canEditWorkspace(ctx.role)}
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link href="/docs/api">API docs</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href="/docs/cli">CLI docs</Link>
        </Button>
      </div>
    </div>
  );
}
