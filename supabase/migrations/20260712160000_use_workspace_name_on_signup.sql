-- Prefer workspace_name from signup metadata when creating the default workspace
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  ws_slug text;
  display_name text;
  workspace_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'User'
  );

  workspace_name := nullif(trim(new.raw_user_meta_data ->> 'workspace_name'), '');
  if workspace_name is null then
    workspace_name := display_name || '''s workspace';
  end if;

  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    display_name,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  ws_slug := lower(regexp_replace(workspace_name, '[^a-zA-Z0-9]+', '-', 'g'));
  ws_slug := trim(both '-' from ws_slug);
  if ws_slug = '' or ws_slug is null then
    ws_slug := 'workspace';
  end if;
  ws_slug := ws_slug || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.workspaces (name, slug)
  values (workspace_name, ws_slug)
  returning id into ws_id;

  insert into public.memberships (role, joined_at, user_id, workspace_id)
  values ('OWNER', now(), new.id, ws_id);

  insert into public.activities (type, title, description, workspace_id)
  values (
    'workspace_created',
    'Workspace created',
    'Welcome to APIDiffGuard',
    ws_id
  );

  return new;
end;
$$;
