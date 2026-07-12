import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
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

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const ids = endpoints?.map((e) => e.id) ?? [];
  const { count: checksToday } = ids.length
    ? await supabase
        .from("checks")
        .select("id", { count: "exact", head: true })
        .in("endpoint_id", ids)
        .gte("started_at", dayStart.toISOString())
    : { count: 0 };

  return (
    <AppShell
      workspaceName={ctx.workspaceName}
      workspaceSlug={ctx.workspaceSlug}
      email={ctx.email}
      checksToday={checksToday ?? 0}
      endpoints={endpoints ?? []}
    >
      {children}
    </AppShell>
  );
}
