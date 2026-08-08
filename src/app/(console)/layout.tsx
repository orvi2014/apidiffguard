import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ChecksTodayCount } from "@/components/layout/console-chrome-data";
import { canEditWorkspace } from "@/lib/plans";
import { getWorkspaceContext, listUserWorkspaces } from "@/lib/workspace";
import { PaymentFailedBanner } from "@/components/billing/payment-failed-banner";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  const workspaces = await listUserWorkspaces();

  return (
    <AppShell
      workspaceName={ctx.workspaceName}
      workspaceSlug={ctx.workspaceSlug}
      workspaceId={ctx.workspaceId}
      workspaces={workspaces}
      email={ctx.email}
      canEdit={canEditWorkspace(ctx.role)}
      checksTodaySlot={
        <Suspense
          fallback={
            <span className="ml-auto font-mono tabular-nums text-muted/70">
              … checks today
            </span>
          }
        >
          <ChecksTodayCount workspaceId={ctx.workspaceId} />
        </Suspense>
      }
    >
      {ctx.paymentFailedAt ? (
        <PaymentFailedBanner failedAt={ctx.paymentFailedAt} />
      ) : null}
      {children}
    </AppShell>
  );
}
