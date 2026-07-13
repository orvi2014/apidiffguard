import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { listWorkspaceEndpointsForPalette } from "@/lib/workspace-data";

export async function GET() {
  const ctx = await getWorkspaceContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const endpoints = await listWorkspaceEndpointsForPalette(ctx.workspaceId);
  return NextResponse.json({ endpoints });
}
