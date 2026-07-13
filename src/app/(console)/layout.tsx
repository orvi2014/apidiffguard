import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ChecksTodayCount } from "@/components/layout/console-chrome-data";
import { getWorkspaceContext } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: endpoints } = await supabase
    .from("endpoints")
    .select("id, name")
    .eq("workspace_id", ctx.workspaceId)
    .order("name")
    .limit(40);

  return (
    <AppShell
      workspaceName={ctx.workspaceName}
      workspaceSlug={ctx.workspaceSlug}
      email={ctx.email}
      endpoints={endpoints ?? []}
      checksTodaySlot={
        <Suspense
          fallback={
            <span className="ml-auto font-mono tabular-nums text-muted/70">
              … checks today
            </span>
          }
        >
          <ChecksTodayCount
            endpointIds={(endpoints ?? []).map((e) => e.id)}
          />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
