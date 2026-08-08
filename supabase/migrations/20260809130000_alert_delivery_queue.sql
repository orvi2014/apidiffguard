-- Durable retry queue for alert delivery.
--
-- Delivery used to be a single inline attempt inside the check run: if Slack
-- was rate-limiting, the webhook host was briefly down, or the process was
-- killed mid-POST, the alert was simply lost. The failure was recorded in
-- alert_history and never acted on again. For a product whose entire value is
-- telling you when your API broke, a dropped alert is the worst possible bug.
--
-- Failed attempts are now parked here and drained by the maintenance cron with
-- exponential backoff, then dead-lettered so a permanently bad destination
-- stops consuming attempts and becomes visible instead.

create table if not exists public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_config_id uuid not null references public.alert_configs (id) on delete cascade,
  endpoint_id uuid references public.endpoints (id) on delete set null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  severity text not null,
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  fingerprint text,
  status alert_status not null default 'RETRYING',
  attempts integer not null default 0,
  max_attempts integer not null default 6,
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

-- Drives the drain query: only pending work, oldest first.
create index if not exists alert_deliveries_due_idx
  on public.alert_deliveries (next_attempt_at)
  where status = 'RETRYING';

create index if not exists alert_deliveries_workspace_idx
  on public.alert_deliveries (workspace_id, created_at desc);

alter table public.alert_deliveries enable row level security;

create policy "Members can view alert_deliveries"
  on public.alert_deliveries for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

/*
 * Claim a batch of due retries.
 *
 * `for update skip locked` plus a lease push means overlapping cron ticks can
 * never hand the same delivery to two workers and send an alert twice.
 */
create or replace function public.claim_alert_deliveries(
  batch_size integer default 20,
  lease_seconds integer default 120
)
returns table (
  id uuid,
  alert_config_id uuid,
  endpoint_id uuid,
  workspace_id uuid,
  severity text,
  message text,
  meta jsonb,
  attempts integer,
  max_attempts integer,
  channel text,
  config jsonb,
  verified boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select d.id
    from public.alert_deliveries d
    where d.status = 'RETRYING'
      and d.next_attempt_at <= now()
    order by d.next_attempt_at asc
    limit greatest(1, least(batch_size, 100))
    for update skip locked
  ),
  leased as (
    update public.alert_deliveries d
    set claimed_at = now(),
        next_attempt_at = now() + make_interval(secs => greatest(30, lease_seconds))
    from claimed c
    where d.id = c.id
    returning
      d.id, d.alert_config_id, d.endpoint_id, d.workspace_id,
      d.severity, d.message, d.meta, d.attempts, d.max_attempts
  )
  select
    l.id, l.alert_config_id, l.endpoint_id, l.workspace_id,
    l.severity, l.message, l.meta, l.attempts, l.max_attempts,
    ac.channel::text,
    ac.config,
    (ac.verified_at is not null) as verified
  from leased l
  join public.alert_configs ac on ac.id = l.alert_config_id
  -- A channel switched off after the failure should not keep retrying.
  where ac.enabled = true;
end;
$$;

revoke all on function public.claim_alert_deliveries(integer, integer) from public;
revoke all on function public.claim_alert_deliveries(integer, integer) from authenticated;

-- Retention: drained rows are audit noise after a while. alert_history keeps
-- the durable record.
create index if not exists alert_deliveries_created_at_idx
  on public.alert_deliveries (created_at);
