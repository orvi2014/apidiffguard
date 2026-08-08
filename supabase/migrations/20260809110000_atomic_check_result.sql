-- Record a completed check as one transaction.
--
-- The worker previously issued four independent writes: insert the check,
-- insert the diff, update the endpoint's health and counters, insert the
-- activity row. Any failure between them left the database describing a state
-- that never happened -- a check with no diff, a diff whose endpoint still
-- shows the previous health, counters that disagree with the newest diff. On a
-- serverless runtime the process can also simply vanish mid-sequence.
--
-- A plpgsql function body runs inside the caller's transaction, so this is
-- all-or-nothing without needing an explicit BEGIN.
--
-- Deliberately SECURITY INVOKER: RLS then applies exactly as it does to the
-- individual statements it replaces, so this cannot become a way for a member
-- of one workspace to write rows into another. The service role bypasses RLS
-- as usual.

create or replace function public.record_check_result(
  p_endpoint_id uuid,
  p_workspace_id uuid,
  p_baseline_id uuid,
  p_check_status text,
  p_status_code integer,
  p_headers jsonb,
  p_body jsonb,
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
  -- Cheap guard against a caller pairing an endpoint with the wrong workspace;
  -- RLS already stops cross-workspace writes, this makes the mistake loud.
  if not exists (
    select 1 from public.endpoints e
    where e.id = p_endpoint_id and e.workspace_id = p_workspace_id
  ) then
    raise exception 'Endpoint % does not belong to workspace %',
      p_endpoint_id, p_workspace_id
      using errcode = 'raise_exception';
  end if;

  insert into public.checks (
    endpoint_id, status, status_code, headers, body,
    response_time, content_size, finished_at
  )
  values (
    p_endpoint_id, p_check_status::check_status, p_status_code, p_headers, p_body,
    p_response_time, p_content_size, now()
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
  uuid, uuid, uuid, text, integer, jsonb, jsonb, integer, integer, text,
  jsonb, jsonb, integer, integer, integer, text, text, text
) from public;

grant execute on function public.record_check_result(
  uuid, uuid, uuid, text, integer, jsonb, jsonb, integer, integer, text,
  jsonb, jsonb, integer, integer, integer, text, text, text
) to authenticated, service_role;
