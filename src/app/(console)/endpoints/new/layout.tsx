import { redirect } from "next/navigation";
import { canEditWorkspace } from "@/lib/plans";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function NewEndpointLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  if (!canEditWorkspace(ctx.role)) {
    redirect("/endpoints");
  }
  return children;
}
