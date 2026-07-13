import { createClient } from "@/lib/supabase/server";

export async function ChecksTodayCount({
  endpointIds,
}: {
  endpointIds: string[];
}) {
  if (!endpointIds.length) {
    return (
      <span className="ml-auto font-mono tabular-nums">0 checks today</span>
    );
  }

  const supabase = await createClient();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("checks")
    .select("id", { count: "exact", head: true })
    .in("endpoint_id", endpointIds)
    .gte("started_at", dayStart.toISOString());

  return (
    <span className="ml-auto font-mono tabular-nums">
      {count ?? 0} checks today
    </span>
  );
}
