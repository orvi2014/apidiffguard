"use client";

import { createSchedule } from "@/app/actions/schedules";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { Label } from "@/components/ui/label";

type EndpointOption = { id: string; name: string };

export function AddScheduleForm({
  endpoints,
}: {
  endpoints: EndpointOption[];
}) {
  if (!endpoints.length) {
    return (
      <p className="mt-4 text-sm text-muted">
        Create an endpoint first, then you can schedule recurring checks.
      </p>
    );
  }

  return (
    <form action={createSchedule} className="mt-4 grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="endpoint_id">Endpoint</Label>
        <select
          id="endpoint_id"
          name="endpoint_id"
          required
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          defaultValue={endpoints[0]?.id}
        >
          {endpoints.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="frequency">Frequency</Label>
        <select
          id="frequency"
          name="frequency"
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          defaultValue="DAILY"
        >
          <option value="HOURLY">Hourly</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </div>
      <PendingSubmitButton className="min-h-9" pendingLabel="Creating…">
        Create schedule
      </PendingSubmitButton>
    </form>
  );
}
