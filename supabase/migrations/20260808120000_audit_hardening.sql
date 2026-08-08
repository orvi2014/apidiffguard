-- Audit hardening: schedule claiming + backoff, API key revocation/scopes,
-- Stripe idempotency + ordering, workspace/endpoint/schedule quotas, alert
-- cooldown, stuck-check reaper, and retention.

--------------------------------------------------------------------------------
-- Schedules: atomic claiming, failure backoff, per-endpoint dedupe
--------------------------------------------------------------------------------

alter table public.schedules
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists claimed_at timestamptz;

-- One schedule per endpoint. Cleans up any pre-existing duplicates first,
-- keeping the oldest row.
delete from public.schedules s
using public.schedules keep
where s.endpoint_id is not null
  and s.endpoint_id = keep.endpoint_id
  and s.created_at > keep.created_at;

create unique index if not exists schedules_endpoint_unique_idx
  on public.schedules (endpoint_id)
  where endpoint_id is not null;

/*
 * Claim due schedules atomically.
 *
 * `for update skip locked` plus an immediate next_run_at push means two
 * overlapping cron ticks can never hand the same schedule to runEndpointCheck.
 * The lease is a placeholder — the worker overwrites next_run_at with the real
 * cadence once the check finishes, and a crashed worker just retries after the
 * lease expires.
 */
create or replace function public.claim_due_schedules(
  batch_size integer default 25,
  lease_seconds integer default 300
)
returns table (
  id uuid,
  workspace_id uuid,
  endpoint_id uuid,
  frequency text,
  due_at timestamptz,
  consecutive_failures integer,
  plan text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    -- Capture the original next_run_at here: it is the slot this run was *due*
    -- at, and the worker anchors the next cadence step on it. Reading it back
    -- after the UPDATE would return the lease instead and reintroduce drift.
    select s.id, s.next_run_at as due_at
    from public.schedules s
    where s.enabled = true
      and s.next_run_at is not null
      and s.next_run_at <= now()
      and s.endpoint_id is not null
    order by s.next_run_at asc
    limit greatest(1, least(batch_size, 200))
    for update skip locked
  ),
  bumped as (
    update public.schedules s
    set claimed_at = now(),
        next_run_at = now() + make_interval(secs => greatest(60, lease_seconds))
    from claimed c
    where s.id = c.id
    returning
      s.id,
      s.workspace_id,
      s.endpoint_id,
      s.frequency::text as frequency,
      c.due_at,
      s.consecutive_failures
  )
  select
    b.id,
    b.workspace_id,
    b.endpoint_id,
    b.frequency,
    b.due_at,
    b.consecutive_failures,
    w.plan
  from bumped b
  join public.workspaces w on w.id = b.workspace_id;
end;
$$;

revoke all on function public.claim_due_schedules(integer, integer) from public;
revoke all on function public.claim_due_schedules(integer, integer) from authenticated;

--------------------------------------------------------------------------------
-- API keys: revocation state and scopes
--------------------------------------------------------------------------------

alter table public.api_keys
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles (id) on delete set null,
  add column if not exists scopes text[] not null default array['checks:run', 'endpoints:read'];

create index if not exists api_keys_active_idx
  on public.api_keys (prefix)
  where revoked_at is null;

/*
 * key_hash must not be selectable, even by owners/admins — a leaked session
 * shouldn't hand over offline-crackable material. Grant per column instead of
 * relying on RLS, which is row- not column-scoped.
 */
revoke select on public.api_keys from authenticated;
grant select (
  id, name, prefix, last_used_at, expires_at, created_at,
  user_id, workspace_id, revoked_at, revoked_by, scopes
) on public.api_keys to authenticated;

--------------------------------------------------------------------------------
-- Stripe: idempotency + out-of-order protection
--------------------------------------------------------------------------------

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  -- Stripe's per-object version counter; lets us drop events that arrive late.
  object_id text,
  event_created_at timestamptz not null,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_events_object_idx
  on public.stripe_events (object_id, event_created_at desc);

alter table public.stripe_events enable row level security;
-- No policies: service role only.

-- Track the newest subscription event we've applied per workspace so a stale
-- `customer.subscription.updated` can't downgrade an active workspace.
alter table public.workspaces
  add column if not exists billing_event_at timestamptz,
  add column if not exists payment_failed_at timestamptz;

--------------------------------------------------------------------------------
-- Quotas: workspaces per user, endpoints per plan, schedules per plan
--------------------------------------------------------------------------------

create or replace function public.plan_endpoint_limit(plan_name text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(plan_name, 'free'))
    when 'starter' then 20
    when 'pro' then 100
    when 'team' then null
    else 3
  end;
$$;

/*
 * Enforce the endpoint cap in the database. The application does a count-then-
 * insert, which two parallel requests can both pass.
 */
create or replace function public.enforce_endpoint_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_count integer;
  current_count integer;
begin
  select public.plan_endpoint_limit(w.plan) into limit_count
  from public.workspaces w
  where w.id = new.workspace_id;

  if limit_count is null then
    return new;
  end if;

  select count(*) into current_count
  from public.endpoints e
  where e.workspace_id = new.workspace_id;

  if current_count >= limit_count then
    raise exception 'Endpoint limit reached for this plan (%).', limit_count
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists endpoints_enforce_limit on public.endpoints;
create trigger endpoints_enforce_limit
  before insert on public.endpoints
  for each row execute function public.enforce_endpoint_limit();

/*
 * Cap workspaces per user. Plan limits are per-workspace, so unlimited
 * workspace creation is an unlimited free tier.
 */
create or replace function public.enforce_workspace_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owned integer;
begin
  select count(*) into owned
  from public.memberships m
  where m.user_id = new.user_id and m.role = 'OWNER';

  if owned >= 5 then
    raise exception 'Workspace limit reached (5 per account).'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists memberships_enforce_workspace_quota on public.memberships;
create trigger memberships_enforce_workspace_quota
  before insert on public.memberships
  for each row when (new.role = 'OWNER')
  execute function public.enforce_workspace_quota();

--------------------------------------------------------------------------------
-- Alert cooldown: stop re-alerting every run on a permanently broken endpoint
--------------------------------------------------------------------------------

alter table public.alert_configs
  add column if not exists cooldown_minutes integer not null default 60;

create table if not exists public.alert_cooldowns (
  alert_config_id uuid not null references public.alert_configs (id) on delete cascade,
  endpoint_id uuid not null references public.endpoints (id) on delete cascade,
  fingerprint text not null,
  last_sent_at timestamptz not null default now(),
  suppressed_count integer not null default 0,
  primary key (alert_config_id, endpoint_id, fingerprint)
);

alter table public.alert_cooldowns enable row level security;

create policy "Members can view alert_cooldowns"
  on public.alert_cooldowns for select
  to authenticated
  using (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.is_workspace_member(e.workspace_id)
    )
  );

--------------------------------------------------------------------------------
-- Reaper: checks stuck in CHECKING / PENDING
--------------------------------------------------------------------------------

create or replace function public.reap_stuck_checks(older_than_minutes integer default 15)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reaped integer;
begin
  with stale as (
    update public.checks c
    set status = 'FAILED',
        error = coalesce(c.error, 'Check timed out and was reaped.'),
        finished_at = now()
    where c.status in ('PENDING', 'RUNNING')
      and c.started_at < now() - make_interval(mins => greatest(1, older_than_minutes))
    returning c.endpoint_id
  )
  select count(*) into reaped from stale;

  -- Release endpoints left showing CHECKING by a worker that died mid-run.
  update public.endpoints e
  set health = 'UNKNOWN'
  where e.health = 'CHECKING'
    and (e.last_checked_at is null
         or e.last_checked_at < now() - make_interval(mins => greatest(1, older_than_minutes)));

  return reaped;
end;
$$;

revoke all on function public.reap_stuck_checks(integer) from public;
revoke all on function public.reap_stuck_checks(integer) from authenticated;

--------------------------------------------------------------------------------
-- Retention: response bodies dominate storage, so trim them first
--------------------------------------------------------------------------------

create or replace function public.apply_retention(
  check_body_days integer default 30,
  check_days integer default 90,
  diff_days integer default 180,
  activity_days integer default 180,
  alert_history_days integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bodies_trimmed integer;
  checks_deleted integer;
  diffs_deleted integer;
  activities_deleted integer;
  alerts_deleted integer;
begin
  -- Drop payloads well before dropping the rows: the timing/status history
  -- stays useful long after the body itself does.
  with trimmed as (
    update public.checks
    set body = null, headers = null
    where started_at < now() - make_interval(days => check_body_days)
      and (body is not null or headers is not null)
    returning 1
  )
  select count(*) into bodies_trimmed from trimmed;

  with removed as (
    delete from public.checks
    where started_at < now() - make_interval(days => check_days)
    returning 1
  )
  select count(*) into checks_deleted from removed;

  with removed as (
    delete from public.diffs
    where created_at < now() - make_interval(days => diff_days)
      and accepted = false
    returning 1
  )
  select count(*) into diffs_deleted from removed;

  with removed as (
    delete from public.activities
    where created_at < now() - make_interval(days => activity_days)
    returning 1
  )
  select count(*) into activities_deleted from removed;

  with removed as (
    delete from public.alert_history
    where created_at < now() - make_interval(days => alert_history_days)
    returning 1
  )
  select count(*) into alerts_deleted from removed;

  return jsonb_build_object(
    'bodiesTrimmed', bodies_trimmed,
    'checksDeleted', checks_deleted,
    'diffsDeleted', diffs_deleted,
    'activitiesDeleted', activities_deleted,
    'alertHistoryDeleted', alerts_deleted
  );
end;
$$;

revoke all on function public.apply_retention(integer, integer, integer, integer, integer) from public;
revoke all on function public.apply_retention(integer, integer, integer, integer, integer) from authenticated;

--------------------------------------------------------------------------------
-- Indexes for the retention sweep and the dashboard's date-bounded queries
--------------------------------------------------------------------------------

create index if not exists checks_started_at_idx on public.checks (started_at);
create index if not exists diffs_created_at_idx on public.diffs (created_at);
create index if not exists activities_created_at_idx on public.activities (created_at);
create index if not exists alert_history_created_at_idx on public.alert_history (created_at);
