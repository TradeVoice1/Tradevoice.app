-- =============================================================================
-- Tradevoice — lock down is_super_owner / TOTP columns against client writes
-- =============================================================================
-- Defense-in-depth for the super-owner system. Migration 0030 added the
-- flag + RLS policies; migration 0031 added the dashboard RPC. Both are
-- safe IF the flag itself can't be spoofed.
--
-- The gap: RLS on profiles allows a user to UPDATE their own row
-- ("profiles: update own"). That policy doesn't restrict WHICH columns
-- can change — by default it lets the user write any field, including
-- is_super_owner. The unique partial index ensures only one row can
-- have the flag = true at a time, but if the founder's account ever
-- got deleted (cascade), the index would release and a racing
-- attacker could set their own flag = true → instant cross-customer
-- data read access via the RLS super_owner OR-clauses.
--
-- This trigger blocks ALL client-side modification of the super-owner
-- and TOTP columns. The Supabase SQL editor (which runs as
-- service_role / supabase_admin / postgres roles) bypasses the
-- guard — that's how the founder flips the flag via manual UPDATE.
-- Phase 2's TOTP-unlock Edge Function will also use service_role,
-- so it can write super_owner_unlock_at through the trigger.
-- =============================================================================

create or replace function public.guard_super_owner_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $func$
declare
  cur_role text;
begin
  cur_role := current_user;

  -- Privileged roles bypass the guard. service_role is how Supabase
  -- Edge Functions write with elevated privs; postgres / supabase_admin
  -- is how the Supabase SQL editor talks to the DB; authenticator is
  -- the parent role PostgREST uses before switching to authenticated.
  -- Anything routed through the normal client SDK lands as
  -- 'authenticated' or 'anon' and gets blocked below.
  if cur_role in ('service_role', 'supabase_admin', 'postgres', 'authenticator') then
    return new;
  end if;

  -- INSERT path: client must NEVER set these on creation. The
  -- handle_new_user trigger inserts profile rows with defaults
  -- (is_super_owner = false), so blocking a non-false / non-null
  -- value here closes the "create my profile with flag = true"
  -- attack vector.
  if tg_op = 'INSERT' then
    if new.is_super_owner is true then
      raise exception 'is_super_owner cannot be set during INSERT via the client API'
        using errcode = '42501', hint = 'Set this flag via the Supabase SQL editor only.';
    end if;
    if new.super_owner_totp_secret      is not null then
      raise exception 'super_owner_totp_secret cannot be set during INSERT via the client API'
        using errcode = '42501';
    end if;
    if new.super_owner_totp_enabled_at  is not null then
      raise exception 'super_owner_totp_enabled_at cannot be set during INSERT via the client API'
        using errcode = '42501';
    end if;
    if new.super_owner_unlock_at        is not null then
      raise exception 'super_owner_unlock_at cannot be set during INSERT via the client API'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE path: any change to a super-owner column from a non-
  -- privileged role gets rejected. Using `is distinct from` so NULL
  -- vs NULL doesn't trip the guard.
  if tg_op = 'UPDATE' then
    if new.is_super_owner is distinct from old.is_super_owner then
      raise exception 'is_super_owner cannot be modified via the client API'
        using errcode = '42501', hint = 'Use the Supabase SQL editor (service_role).';
    end if;
    if new.super_owner_totp_secret is distinct from old.super_owner_totp_secret then
      raise exception 'super_owner_totp_secret can only be updated by the founder TOTP setup Edge Function'
        using errcode = '42501';
    end if;
    if new.super_owner_totp_enabled_at is distinct from old.super_owner_totp_enabled_at then
      raise exception 'super_owner_totp_enabled_at can only be updated by the founder TOTP setup Edge Function'
        using errcode = '42501';
    end if;
    if new.super_owner_unlock_at is distinct from old.super_owner_unlock_at then
      raise exception 'super_owner_unlock_at can only be updated by the founder TOTP unlock Edge Function'
        using errcode = '42501';
    end if;
    return new;
  end if;

  return new;
end;
$func$;

drop trigger if exists guard_super_owner_columns_trigger on public.profiles;
create trigger guard_super_owner_columns_trigger
  before insert or update on public.profiles
  for each row execute function public.guard_super_owner_columns();

-- Sanity verification you can run manually after deploying this
-- migration to prove the lockdown works (expected: all four raise
-- exceptions when logged in as a normal user via the JS SDK).
--
-- In a browser console while signed in as a NON-super account:
--
--   supabase.from('profiles')
--           .update({ is_super_owner: true })
--           .eq('id', (await supabase.auth.getUser()).data.user.id);
--
-- Expected response: 42501 / permission-style error referencing this
-- function. Migration 0030's unique partial index would have caught
-- this too, but only because matthew already holds the flag — once
-- the trigger is in place, NEITHER situation matters; the write is
-- rejected before the index is consulted.

notify pgrst, 'reload schema';
