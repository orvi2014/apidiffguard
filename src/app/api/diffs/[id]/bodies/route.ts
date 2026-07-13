import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getWorkspaceContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("diffs")
    .select(
      `
      id,
      endpoints!inner(workspace_id),
      baselines(body),
      checks(body)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const endpoint = Array.isArray(row.endpoints) ? row.endpoints[0] : row.endpoints;
  if (!endpoint || endpoint.workspace_id !== ctx.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseline = Array.isArray(row.baselines) ? row.baselines[0] : row.baselines;
  const check = Array.isArray(row.checks) ? row.checks[0] : row.checks;

  return NextResponse.json({
    baselineBody: baseline?.body ?? null,
    currentBody: check?.body ?? null,
  });
}
