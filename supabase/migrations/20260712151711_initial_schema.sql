-- APIDiffGuard production schema
-- Auth: Supabase auth.users
-- Data protection: RLS on all public tables

-- Enums
create type public.member_role as enum ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
create type public.http_method as enum ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS');
create type public.auth_type as enum ('NONE', 'BEARER', 'API_KEY', 'BASIC', 'OAUTH', 'CUSTOM');
create type public.health_status as enum ('HEALTHY', 'WARNING', 'BREAKING', 'UNKNOWN', 'CHECKING');
create type public.severity as enum ('INFO', 'WARNING', 'BREAKING');
create type public.schedule_frequency as enum ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');
create type public.check_status as enum ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'TIMEOUT');
create type public.alert_channel as enum ('EMAIL', 'SLACK', 'DISCORD', 'WEBHOOK');
create type public.alert_status as enum ('PENDING', 'SENT', 'FAILED', 'RETRYING');

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  role public.member_role not null default 'MEMBER',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  unique (user_id, workspace_id)
);

create index memberships_workspace_id_idx on public.memberships (workspace_id);
create index memberships_user_id_idx on public.memberships (user_id);

create table public.endpoints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  method public.http_method not null default 'GET',
  headers jsonb not null default '{}'::jsonb,
  auth_type public.auth_type not null default 'NONE',
  auth_config jsonb not null default '{}'::jsonb,
  environment text not null default 'production',
  tags text[] not null default '{}',
  description text,
  health public.health_status not null default 'UNKNOWN',
  timeout_ms integer not null default 10000,
  baseline_version integer,
  response_time integer,
  last_checked_at timestamptz,
  breaking_count integer not null default 0,
  warning_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade
);

create index endpoints_workspace_id_idx on public.endpoints (workspace_id);
create index endpoints_health_idx on public.endpoints (health);

create table public.baselines (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  status_code integer not null,
  headers jsonb not null default '{}'::jsonb,
  body jsonb,
  response_time integer not null default 0,
  content_size integer not null default 0,
  notes text,
  approved boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  endpoint_id uuid not null references public.endpoints (id) on delete cascade,
  unique (endpoint_id, version)
);

create index baselines_endpoint_active_idx on public.baselines (endpoint_id, is_active);

create table public.checks (
  id uuid primary key default gen_random_uuid(),
  status public.check_status not null default 'PENDING',
  status_code integer,
  headers jsonb,
  body jsonb,
  response_time integer,
  content_size integer,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  endpoint_id uuid not null references public.endpoints (id) on delete cascade
);

create index checks_endpoint_started_idx on public.checks (endpoint_id, started_at desc);

create table public.diffs (
  id uuid primary key default gen_random_uuid(),
  summary jsonb not null default '{}'::jsonb,
  changes jsonb not null default '[]'::jsonb,
  breaking_count integer not null default 0,
  warning_count integer not null default 0,
  info_count integer not null default 0,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  endpoint_id uuid not null references public.endpoints (id) on delete cascade,
  baseline_id uuid references public.baselines (id) on delete set null,
  check_id uuid references public.checks (id) on delete set null
);

create index diffs_endpoint_created_idx on public.diffs (endpoint_id, created_at desc);

create table public.ignore_rules (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  reason text,
  created_at timestamptz not null default now(),
  endpoint_id uuid not null references public.endpoints (id) on delete cascade
);

create index ignore_rules_endpoint_id_idx on public.ignore_rules (endpoint_id);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  frequency public.schedule_frequency not null default 'DAILY',
  cron text,
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  endpoint_id uuid references public.endpoints (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade
);

create index schedules_workspace_id_idx on public.schedules (workspace_id);
create index schedules_next_run_at_idx on public.schedules (next_run_at);

create table public.alert_configs (
  id uuid primary key default gen_random_uuid(),
  channel public.alert_channel not null,
  config jsonb not null default '{}'::jsonb,
  min_severity public.severity not null default 'WARNING',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade
);

create index alert_configs_workspace_id_idx on public.alert_configs (workspace_id);

create table public.alert_history (
  id uuid primary key default gen_random_uuid(),
  status public.alert_status not null default 'PENDING',
  severity public.severity not null,
  message text not null,
  payload jsonb,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  alert_config_id uuid not null references public.alert_configs (id) on delete cascade
);

create index alert_history_config_created_idx on public.alert_history (alert_config_id, created_at desc);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null,
  prefix text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade
);

create index api_keys_workspace_id_idx on public.api_keys (workspace_id);
create index api_keys_prefix_idx on public.api_keys (prefix);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  resource text not null,
  resource_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  user_id uuid references public.profiles (id) on delete set null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade
);

create index audit_logs_workspace_created_idx on public.audit_logs (workspace_id, created_at desc);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade
);

create index activities_workspace_created_idx on public.activities (workspace_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  read boolean not null default false,
  href text,
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (id) on delete cascade
);

create index notifications_user_read_created_idx on public.notifications (user_id, read, created_at desc);

-- Helpers for RLS (security definer in private schema)
create schema if not exists private;

create or replace function private.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.workspace_id = ws_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function private.workspace_role(ws_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.memberships m
  where m.workspace_id = ws_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.can_edit_workspace(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.workspace_id = ws_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER', 'ADMIN', 'MEMBER')
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public;
revoke all on function private.workspace_role(uuid) from public;
revoke all on function private.can_edit_workspace(uuid) from public;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.workspace_role(uuid) to authenticated;
grant execute on function private.can_edit_workspace(uuid) to authenticated;

-- Auto-create profile + default workspace on signup
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
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'User'
  );

  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    display_name,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  ws_slug := lower(regexp_replace(display_name, '[^a-zA-Z0-9]+', '-', 'g'));
  ws_slug := trim(both '-' from ws_slug);
  if ws_slug = '' or ws_slug is null then
    ws_slug := 'workspace';
  end if;
  ws_slug := ws_slug || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.workspaces (name, slug)
  values (display_name || '''s workspace', ws_slug)
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger endpoints_updated_at before update on public.endpoints
  for each row execute function public.set_updated_at();
create trigger schedules_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();
create trigger alert_configs_updated_at before update on public.alert_configs
  for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.endpoints enable row level security;
alter table public.baselines enable row level security;
alter table public.checks enable row level security;
alter table public.diffs enable row level security;
alter table public.ignore_rules enable row level security;
alter table public.schedules enable row level security;
alter table public.alert_configs enable row level security;
alter table public.alert_history enable row level security;
alter table public.api_keys enable row level security;
alter table public.audit_logs enable row level security;
alter table public.activities enable row level security;
alter table public.notifications enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Workspaces
create policy "Members can view workspaces"
  on public.workspaces for select
  to authenticated
  using (private.is_workspace_member(id));

create policy "Editors can update workspaces"
  on public.workspaces for update
  to authenticated
  using (private.can_edit_workspace(id))
  with check (private.can_edit_workspace(id));

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert
  to authenticated
  with check (true);

-- Memberships
create policy "Members can view memberships"
  on public.memberships for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "Owners and admins can manage memberships"
  on public.memberships for all
  to authenticated
  using (private.workspace_role(workspace_id) in ('OWNER', 'ADMIN'))
  with check (private.workspace_role(workspace_id) in ('OWNER', 'ADMIN'));

create policy "Users can insert themselves as owner on create"
  on public.memberships for insert
  to authenticated
  with check (user_id = auth.uid());

-- Endpoints
create policy "Members can view endpoints"
  on public.endpoints for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "Editors can insert endpoints"
  on public.endpoints for insert
  to authenticated
  with check (private.can_edit_workspace(workspace_id));

create policy "Editors can update endpoints"
  on public.endpoints for update
  to authenticated
  using (private.can_edit_workspace(workspace_id))
  with check (private.can_edit_workspace(workspace_id));

create policy "Editors can delete endpoints"
  on public.endpoints for delete
  to authenticated
  using (private.can_edit_workspace(workspace_id));

-- Child tables via endpoint workspace
create policy "Members can view baselines"
  on public.baselines for select to authenticated
  using (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.is_workspace_member(e.workspace_id)
    )
  );

create policy "Editors can manage baselines"
  on public.baselines for all to authenticated
  using (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.can_edit_workspace(e.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.can_edit_workspace(e.workspace_id)
    )
  );

create policy "Members can view checks"
  on public.checks for select to authenticated
  using (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.is_workspace_member(e.workspace_id)
    )
  );

create policy "Editors can manage checks"
  on public.checks for all to authenticated
  using (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.can_edit_workspace(e.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.can_edit_workspace(e.workspace_id)
    )
  );

create policy "Members can view diffs"
  on public.diffs for select to authenticated
  using (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.is_workspace_member(e.workspace_id)
    )
  );

create policy "Editors can manage diffs"
  on public.diffs for all to authenticated
  using (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.can_edit_workspace(e.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.can_edit_workspace(e.workspace_id)
    )
  );

create policy "Members can view ignore_rules"
  on public.ignore_rules for select to authenticated
  using (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.is_workspace_member(e.workspace_id)
    )
  );

create policy "Editors can manage ignore_rules"
  on public.ignore_rules for all to authenticated
  using (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.can_edit_workspace(e.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.endpoints e
      where e.id = endpoint_id and private.can_edit_workspace(e.workspace_id)
    )
  );

create policy "Members can view schedules"
  on public.schedules for select to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "Editors can manage schedules"
  on public.schedules for all to authenticated
  using (private.can_edit_workspace(workspace_id))
  with check (private.can_edit_workspace(workspace_id));

create policy "Members can view alert_configs"
  on public.alert_configs for select to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "Editors can manage alert_configs"
  on public.alert_configs for all to authenticated
  using (private.can_edit_workspace(workspace_id))
  with check (private.can_edit_workspace(workspace_id));

create policy "Members can view alert_history"
  on public.alert_history for select to authenticated
  using (
    exists (
      select 1 from public.alert_configs c
      where c.id = alert_config_id and private.is_workspace_member(c.workspace_id)
    )
  );

create policy "Editors can manage alert_history"
  on public.alert_history for all to authenticated
  using (
    exists (
      select 1 from public.alert_configs c
      where c.id = alert_config_id and private.can_edit_workspace(c.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.alert_configs c
      where c.id = alert_config_id and private.can_edit_workspace(c.workspace_id)
    )
  );

create policy "Members can view api_keys"
  on public.api_keys for select to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "Editors can manage api_keys"
  on public.api_keys for all to authenticated
  using (private.can_edit_workspace(workspace_id))
  with check (private.can_edit_workspace(workspace_id) and user_id = auth.uid());

create policy "Members can view audit_logs"
  on public.audit_logs for select to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "Editors can insert audit_logs"
  on public.audit_logs for insert to authenticated
  with check (private.can_edit_workspace(workspace_id));

create policy "Members can view activities"
  on public.activities for select to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "Editors can insert activities"
  on public.activities for insert to authenticated
  with check (private.can_edit_workspace(workspace_id));

create policy "Users can view own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can insert own notifications"
  on public.notifications for insert to authenticated
  with check (user_id = auth.uid());
