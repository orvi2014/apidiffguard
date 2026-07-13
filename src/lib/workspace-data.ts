import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceEndpointSummary = {
  id: string;
  name: string;
  url?: string;
  method?: string;
  environment?: string;
  tags?: string[];
  description?: string | null;
  health?: string;
  auth_type?: string;
  last_checked_at?: string | null;
  response_time?: number | null;
  baseline_version?: number | null;
  breaking_count?: number | null;
  warning_count?: number | null;
  updated_at?: string;
};

/** Deduped per request — layout, dashboard, schedules share one endpoints read. */
export const listWorkspaceEndpointIds = cache(async (workspaceId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("endpoints")
    .select("id")
    .eq("workspace_id", workspaceId);
  return data?.map((e) => e.id) ?? [];
});

export const listWorkspaceEndpointsForPalette = cache(
  async (workspaceId: string) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("endpoints")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .order("name")
      .limit(40);
    return data ?? [];
  }
);

export const listWorkspaceEndpointsForDashboard = cache(
  async (workspaceId: string) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("endpoints")
      .select(
        "id, name, url, method, environment, tags, description, health, auth_type, last_checked_at, response_time, baseline_version, breaking_count, warning_count"
      )
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(50);
    return data ?? [];
  }
);

export const countChecksToday = cache(async (workspaceId: string) => {
  const ids = await listWorkspaceEndpointIds(workspaceId);
  if (!ids.length) return 0;

  const supabase = await createClient();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("checks")
    .select("id", { count: "exact", head: true })
    .in("endpoint_id", ids)
    .gte("started_at", dayStart.toISOString());
  return count ?? 0;
});

export const getLatestDiffId = cache(async (workspaceId: string) => {
  const ids = await listWorkspaceEndpointIds(workspaceId);
  if (!ids.length) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("diffs")
    .select("id")
    .in("endpoint_id", ids)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
});
