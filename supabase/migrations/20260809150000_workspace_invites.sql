-- Member and invite management.
--
-- The schema has supported multiple members and four roles since the beginning,
-- and the whole permission model is written against them, but there was no way
-- to add anyone: every workspace was permanently a party of one. This is the
-- missing half.

create or replace function private.can_manage_workspace(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER', 'ADMIN')
  );
$$;

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role member_role not null default 'MEMBER',
  -- Hashed like every other bearer token here: the raw value only ever exists
  -- in the invite link.
  token_hash text not null,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null
);

-- One outstanding invite per address per workspace; re-inviting replaces it.
create unique index if not exists workspace_invites_pending_idx
  on public.workspace_invites (workspace_id, lower(email))
  where accepted_at is null;

create index if not exists workspace_invites_workspace_idx
  on public.workspace_invites (workspace_id, created_at desc);

alter table public.workspace_invites enable row level security;

create policy "Members can view invites"
  on public.workspace_invites for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "Admins can manage invites"
  on public.workspace_invites for all
  to authenticated
  using (private.can_manage_workspace(workspace_id))
  with check (private.can_manage_workspace(workspace_id));

-- token_hash is offline-crackable material for a credential that grants
-- workspace access; members can see that an invite exists, not its secret.
revoke select on public.workspace_invites from authenticated;
grant select (
  id, workspace_id, email, role, invited_by,
  created_at, expires_at, accepted_at, accepted_by
) on public.workspace_invites to authenticated;

--------------------------------------------------------------------------------
-- Seats
--------------------------------------------------------------------------------

create or replace function public.plan_seat_limit(plan_name text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(plan_name, 'free'))
    when 'starter' then 3
    when 'pro' then 10
    when 'team' then null
    else 1
  end;
$$;

/*
 * Cap members per workspace by plan.
 *
 * Enforced in the database because the accept flow and the invite flow are
 * separate requests: two people accepting at the same moment would both pass an
 * application-level count.
 */
create or replace function public.enforce_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seat_limit integer;
  seats_used integer;
begin
  select public.plan_seat_limit(w.plan) into seat_limit
  from public.workspaces w
  where w.id = new.workspace_id;

  if seat_limit is null then
    return new;
  end if;

  select count(*) into seats_used
  from public.memberships m
  where m.workspace_id = new.workspace_id;

  if seats_used >= seat_limit then
    raise exception 'Seat limit reached for this plan (%).', seat_limit
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists memberships_enforce_seat_limit on public.memberships;
create trigger memberships_enforce_seat_limit
  before insert on public.memberships
  for each row execute function public.enforce_seat_limit();

--------------------------------------------------------------------------------
-- Last-owner protection
--------------------------------------------------------------------------------

/*
 * A workspace with no owner cannot be renamed, billed, or have members managed
 * ever again -- it is unrecoverable without support intervention. Block the
 * write that would cause it rather than trying to detect it later.
 */
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_owners integer;
  target_workspace uuid;
begin
  target_workspace := coalesce(old.workspace_id, new.workspace_id);

  if tg_op = 'UPDATE' and old.role = 'OWNER' and new.role <> 'OWNER' then
    select count(*) into remaining_owners
    from public.memberships m
    where m.workspace_id = target_workspace
      and m.role = 'OWNER'
      and m.user_id <> old.user_id;

    if remaining_owners = 0 then
      raise exception 'A workspace must keep at least one owner.'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'DELETE' and old.role = 'OWNER' then
    select count(*) into remaining_owners
    from public.memberships m
    where m.workspace_id = target_workspace
      and m.role = 'OWNER'
      and m.user_id <> old.user_id;

    if remaining_owners = 0 then
      raise exception 'A workspace must keep at least one owner.'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists memberships_protect_last_owner on public.memberships;
create trigger memberships_protect_last_owner
  before update or delete on public.memberships
  for each row execute function public.protect_last_owner();

--------------------------------------------------------------------------------
-- Accepting an invite
--------------------------------------------------------------------------------

/*
 * Redeem an invite for the calling user.
 *
 * SECURITY DEFINER because the invitee is by definition not yet a member, so
 * no RLS policy on memberships or workspace_invites can admit them. The token
 * hash is the authorisation, and the address on the invite must match the
 * address on the account so a leaked link cannot be redeemed by whoever finds
 * it.
 */
create or replace function public.accept_workspace_invite(p_token_hash text)
returns table (workspace_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.workspace_invites%rowtype;
  v_email text;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    workspace_id := null; status := 'unauthenticated'; return next; return;
  end if;

  select p.email into v_email from public.profiles p where p.id = v_user;

  select * into v_invite
  from public.workspace_invites i
  where i.token_hash = p_token_hash
  limit 1;

  if not found then
    workspace_id := null; status := 'invalid'; return next; return;
  end if;

  if v_invite.accepted_at is not null then
    workspace_id := v_invite.workspace_id; status := 'already-accepted'; return next; return;
  end if;

  if v_invite.expires_at < now() then
    workspace_id := v_invite.workspace_id; status := 'expired'; return next; return;
  end if;

  if lower(coalesce(v_email, '')) <> lower(v_invite.email) then
    workspace_id := v_invite.workspace_id; status := 'wrong-account'; return next; return;
  end if;

  if exists (
    select 1 from public.memberships m
    where m.workspace_id = v_invite.workspace_id and m.user_id = v_user
  ) then
    update public.workspace_invites
    set accepted_at = now(), accepted_by = v_user
    where id = v_invite.id;
    workspace_id := v_invite.workspace_id; status := 'already-member'; return next; return;
  end if;

  -- The seat-limit trigger can still reject this; the exception propagates and
  -- the caller reports a full workspace.
  insert into public.memberships (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_user, v_invite.role);

  update public.workspace_invites
  set accepted_at = now(), accepted_by = v_user
  where id = v_invite.id;

  workspace_id := v_invite.workspace_id;
  status := 'accepted';
  return next;
end;
$$;

revoke all on function public.accept_workspace_invite(text) from public;
grant execute on function public.accept_workspace_invite(text) to authenticated;
