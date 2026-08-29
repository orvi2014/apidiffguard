-- The last-owner guard also fired on cascades, which made workspaces and user
-- accounts permanently undeletable.
--
-- Deleting a workspace cascades to its memberships; the guard saw the final
-- OWNER row disappearing and refused. Deleting an auth user cascades to their
-- profile and then their memberships, and the guard refused there too. So a
-- user could not remove their account, and an owner could not close a
-- workspace — a right-to-erasure problem, not just an inconvenience.
--
-- The rule it enforces is real: a *surviving* workspace must keep an owner.
-- It just has nothing to say about a workspace that is itself being removed,
-- or about the last member leaving as part of that removal. Both exemptions
-- are narrow: the workspace must actually be gone, or going.

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

  -- A membership row disappearing because its workspace is disappearing is not
  -- a workspace losing its owner. Postgres removes the parent row before the
  -- cascade reaches the children, so the parent being absent is the signal.
  if tg_op = 'DELETE'
     and not exists (
       select 1 from public.workspaces w where w.id = target_workspace
     )
  then
    return old;
  end if;

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

-- Closing an account should not strand the workspaces it solely owned. They
-- are removed with it; workspaces with another owner are left alone.
create or replace function public.cleanup_sole_owned_workspaces()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.workspaces w
  where w.id in (
    select m.workspace_id
    from public.memberships m
    where m.user_id = old.id
      and m.role = 'OWNER'
  )
  and not exists (
    select 1
    from public.memberships other
    where other.workspace_id = w.id
      and other.role = 'OWNER'
      and other.user_id <> old.id
  );
  return old;
end;
$$;

drop trigger if exists profiles_cleanup_workspaces on public.profiles;
create trigger profiles_cleanup_workspaces
  before delete on public.profiles
  for each row execute function public.cleanup_sole_owned_workspaces();
