import { countChecksToday } from "@/lib/workspace-data";

export async function ChecksTodayCount({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const count = await countChecksToday(workspaceId);
  return (
    <span className="ml-auto font-mono tabular-nums">
      {count} checks today
    </span>
  );
}
