-- Move large response bodies out of Postgres.
--
-- checks.body and baselines.body are jsonb holding whatever the monitored API
-- returned, capped only by the 2 MB fetch limit. At one row per check per
-- schedule tick, the table that grows fastest is also the one made almost
-- entirely of payloads nobody reads after the diff is computed. That is
-- expensive storage, it bloats every backup, and a `select *` anywhere drags
-- megabytes through the connection.
--
-- Small bodies stay inline: a round trip to object storage costs more than the
-- bytes save for a typical JSON response. Anything large is content-addressed
-- into a private bucket and referenced by key, which also deduplicates the
-- common monitoring case where a healthy endpoint returns byte-identical JSON
-- on every run.

alter table public.checks
  add column if not exists body_ref text;

alter table public.baselines
  add column if not exists body_ref text;

comment on column public.checks.body_ref is
  'Storage object key when the body was too large to keep inline. Exactly one of body / body_ref is set.';
comment on column public.baselines.body_ref is
  'Storage object key when the body was too large to keep inline. Exactly one of body / body_ref is set.';

-- Drives the offload sweep, which looks for oversized inline bodies.
create index if not exists checks_offload_candidates_idx
  on public.checks (started_at)
  where body_ref is null and body is not null;

insert into storage.buckets (id, name, public)
values ('response-bodies', 'response-bodies', false)
on conflict (id) do nothing;

-- No storage policies: the bucket is private and reached only with the service
-- role, from the same server code that already decides who may see a diff.

--------------------------------------------------------------------------------
-- record_check_result gains a body_ref parameter
--------------------------------------------------------------------------------

-- The old signature has to go explicitly; adding a parameter creates an
-- overload rather than replacing it, and PostgREST would not know which to call.
drop function if exists public.record_check_result(
  uuid, uuid, uuid, text, integer, jsonb, jsonb, integer, integer, text,
  jsonb, jsonb, integer, integer, integer, text, text, text
);

create or replace function public.record_check_result(
  p_endpoint_id uuid,
  p_workspace_id uuid,
  p_baseline_id uuid,
  p_check_status text,
  p_status_code integer,
  p_headers jsonb,
  p_body jsonb,
  p_body_ref text,
  p_response_time integer,
  p_content_size integer,
  p_health text,
  p_summary jsonb,
  p_changes jsonb,
  p_breaking_count integer,
  p_warning_count integer,
  p_info_count integer,
  p_activity_type text,
  p_activity_title text,
  p_activity_description text
)
returns table (check_id uuid, diff_id uuid)
language plpgsql
as $$
declare
  v_check_id uuid;
  v_diff_id uuid;
begin
  if not exists (
    select 1 from public.endpoints e
    where e.id = p_endpoint_id and e.workspace_id = p_workspace_id
  ) then
    raise exception 'Endpoint % does not belong to workspace %',
      p_endpoint_id, p_workspace_id
      using errcode = 'raise_exception';
  end if;

  insert into public.checks (
    endpoint_id, status, status_code, headers, body, body_ref,
    response_time, content_size, finished_at
  )
  values (
    p_endpoint_id, p_check_status::check_status, p_status_code, p_headers,
    p_body, p_body_ref, p_response_time, p_content_size, now()
  )
  returning id into v_check_id;

  insert into public.diffs (
    endpoint_id, baseline_id, check_id, summary, changes,
    breaking_count, warning_count, info_count
  )
  values (
    p_endpoint_id, p_baseline_id, v_check_id, p_summary, p_changes,
    p_breaking_count, p_warning_count, p_info_count
  )
  returning id into v_diff_id;

  update public.endpoints
  set health = p_health::health_status,
      response_time = p_response_time,
      last_checked_at = now(),
      breaking_count = p_breaking_count,
      warning_count = p_warning_count
  where id = p_endpoint_id;

  insert into public.activities (type, title, description, workspace_id, metadata)
  values (
    p_activity_type, p_activity_title, p_activity_description, p_workspace_id,
    jsonb_build_object('diffId', v_diff_id, 'endpointId', p_endpoint_id)
  );

  check_id := v_check_id;
  diff_id := v_diff_id;
  return next;
end;
$$;

revoke all on function public.record_check_result(
  uuid, uuid, uuid, text, integer, jsonb, jsonb, text, integer, integer, text,
  jsonb, jsonb, integer, integer, integer, text, text, text
) from public;

grant execute on function public.record_check_result(
  uuid, uuid, uuid, text, integer, jsonb, jsonb, text, integer, integer, text,
  jsonb, jsonb, integer, integer, integer, text, text, text
) to authenticated, service_role;

--------------------------------------------------------------------------------
-- Retention must clear the reference too
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
  -- body_ref is cleared alongside body; the orphaned objects are swept by the
  -- maintenance job, which can talk to storage.
  with trimmed as (
    update public.checks
    set body = null, headers = null, body_ref = null
    where started_at < now() - make_interval(days => check_body_days)
      and (body is not null or headers is not null or body_ref is not null)
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
