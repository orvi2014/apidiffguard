-- Harden membership INSERT: block self-join to arbitrary workspaces.
-- Signup still works via security-definer handle_new_user().

drop policy if exists "Users can insert themselves as owner on create"
  on public.memberships;

-- Only owners/admins may insert memberships (covers invites).
-- Signup trigger bypasses RLS as SECURITY DEFINER.

create or replace function public.create_workspace(workspace_name text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ws public.workspaces;
  ws_slug text;
  cleaned text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  cleaned := nullif(trim(workspace_name), '');
  if cleaned is null then
    raise exception 'Workspace name is required';
  end if;
  if char_length(cleaned) > 80 then
    raise exception 'Workspace name too long';
  end if;

  ws_slug := lower(regexp_replace(cleaned, '[^a-zA-Z0-9]+', '-', 'g'));
  ws_slug := trim(both '-' from ws_slug);
  if ws_slug = '' or ws_slug is null then
    ws_slug := 'workspace';
  end if;
  ws_slug := ws_slug || '-' || substr(replace(uid::text, '-', ''), 1, 8)
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.workspaces (name, slug)
  values (cleaned, ws_slug)
  returning * into ws;

  insert into public.memberships (role, joined_at, user_id, workspace_id)
  values ('OWNER', now(), uid, ws.id);

  insert into public.activities (type, title, description, workspace_id)
  values (
    'workspace_created',
    'Workspace created',
    cleaned,
    ws.id
  );

  return ws;
end;
$$;

revoke all on function public.create_workspace(text) from public;
grant execute on function public.create_workspace(text) to authenticated;

-- Hide key hashes from general membership reads
drop policy if exists "Members can view api_keys" on public.api_keys;
create policy "Members can view api_keys"
  on public.api_keys for select
  to authenticated
  using (
    private.is_workspace_member(workspace_id)
    and private.workspace_role(workspace_id) in ('OWNER', 'ADMIN')
  );

-- Hot-path indexes
create index if not exists endpoints_workspace_updated_idx
  on public.endpoints (workspace_id, updated_at desc);

create index if not exists activities_workspace_created_idx
  on public.activities (workspace_id, created_at desc);

create index if not exists checks_endpoint_started_idx
  on public.checks (endpoint_id, started_at desc);

create index if not exists memberships_user_joined_idx
  on public.memberships (user_id, joined_at);
