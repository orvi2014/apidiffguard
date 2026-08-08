-- Per-workspace outbound check quota.
--
-- Every check is an HTTP request we make on a customer's behalf, from our IP,
-- to an address they chose. Unmetered, a single free workspace can point a
-- hundred endpoints at a target and schedule them hourly, and the traffic
-- leaves our infrastructure looking like a denial-of-service we are running.
-- It is also an uncapped cost centre.
--
-- The counter lives in the database rather than in memory because the app runs
-- on serverless instances that share nothing: an in-process count would reset
-- on every cold start and be per-instance besides.

create table if not exists public.workspace_usage (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- First day of the UTC month this row counts. Anchoring on a stored date
  -- rather than "last 30 days" keeps the quota legible on an invoice.
  period_start date not null,
  checks_run integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, period_start)
);

alter table public.workspace_usage enable row level security;

create policy "Members can view workspace_usage"
  on public.workspace_usage for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create or replace function public.plan_check_quota(plan_name text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(plan_name, 'free'))
    when 'starter' then 5000
    when 'pro' then 25000
    when 'team' then null
    else 250
  end;
$$;

/*
 * Reserve one outbound check.
 *
 * `for update` on the usage row serialises concurrent checks in the same
 * workspace, so the read-then-increment cannot be won twice by parallel cron
 * workers. Returns the decision plus the numbers, so the caller can put a real
 * "487 of 500 used" in front of the user instead of a bare refusal.
 */
create or replace function public.consume_check_quota(p_workspace_id uuid)
returns table (allowed boolean, used integer, quota integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', now() at time zone 'utc')::date;
  v_quota integer;
  v_used integer;
begin
  select public.plan_check_quota(w.plan) into v_quota
  from public.workspaces w
  where w.id = p_workspace_id;

  if not found then
    raise exception 'Unknown workspace %', p_workspace_id
      using errcode = 'raise_exception';
  end if;

  -- SECURITY DEFINER, so the membership check RLS would normally do has to be
  -- made explicitly: otherwise any signed-in user could call this in a loop and
  -- burn a stranger's monthly quota. auth.uid() is null for the service role
  -- (the cron worker), which is trusted.
  if auth.uid() is not null and not private.is_workspace_member(p_workspace_id) then
    raise exception 'Not a member of workspace %', p_workspace_id
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.workspace_usage (workspace_id, period_start)
  values (p_workspace_id, v_period)
  on conflict (workspace_id, period_start) do nothing;

  select u.checks_run into v_used
  from public.workspace_usage u
  where u.workspace_id = p_workspace_id and u.period_start = v_period
  for update;

  if v_quota is not null and v_used >= v_quota then
    allowed := false;
    used := v_used;
    quota := v_quota;
    return next;
    return;
  end if;

  update public.workspace_usage u
  set checks_run = u.checks_run + 1,
      updated_at = now()
  where u.workspace_id = p_workspace_id and u.period_start = v_period
  returning u.checks_run into v_used;

  allowed := true;
  used := v_used;
  quota := v_quota;
  return next;
end;
$$;

revoke all on function public.consume_check_quota(uuid) from public;
grant execute on function public.consume_check_quota(uuid) to authenticated, service_role;

/*
 * Read-only view of the current period, for the billing page.
 *
 * SECURITY INVOKER: the RLS policies on workspace_usage and workspaces already
 * scope this to the caller's own workspaces, and a definer function taking a
 * workspace id would leak every other workspace's usage.
 */
create or replace function public.current_check_usage(p_workspace_id uuid)
returns table (used integer, quota integer)
language sql
stable
set search_path = public
as $$
  select
    coalesce(
      (select u.checks_run from public.workspace_usage u
        where u.workspace_id = p_workspace_id
          and u.period_start = date_trunc('month', now() at time zone 'utc')::date),
      0
    )::integer as used,
    public.plan_check_quota((select w.plan from public.workspaces w where w.id = p_workspace_id)) as quota;
$$;

revoke all on function public.current_check_usage(uuid) from public;
grant execute on function public.current_check_usage(uuid) to authenticated, service_role;
