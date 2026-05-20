-- =============================================================================
-- Tradevoice — re-ensure handle_new_user trigger
-- =============================================================================
-- Live testing on 2026-05-19 surfaced "Cannot coerce the result to a single
-- JSON object" errors at signup. Root cause: the handle_new_user trigger
-- that's supposed to auto-create a profiles row when a new auth.users
-- row is inserted wasn't firing — either it was never applied from
-- migration 0001 in this Supabase project, or it got dropped manually
-- via the dashboard at some point.
--
-- Without the trigger:
--   1. signUp() creates a row in auth.users (Supabase Auth)
--   2. NO matching row gets created in public.profiles
--   3. Front-end then tries to UPDATE the profile and gets 0 rows
--   4. .single() throws "Cannot coerce..." → user sees a cryptic error
--
-- This migration re-installs the function + trigger idempotently. Safe
-- to run regardless of whether the trigger currently exists. Same
-- contents as the original definition in 0001_init.sql — just packaged
-- as a standalone migration so future re-deploys / fresh environments
-- have it guaranteed.
-- =============================================================================

-- Function: create a profile row for a newly-inserted auth user. Runs as
-- SECURITY DEFINER so it can write to public.profiles regardless of
-- which role triggered the insert (Supabase Auth uses the service role
-- internally). search_path explicitly set so the function can't be
-- hijacked by a malicious search_path elsewhere.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Defensive: if a row already exists for this id (e.g. the trigger
  -- ran once before and is being re-fired for some reason), do nothing
  -- rather than error. ON CONFLICT DO NOTHING gets us idempotent
  -- behavior at the row level.
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Lock down EXECUTE on the function — triggers run regardless of
-- grants, so revoking from anon/authenticated/public is safe and
-- clears the Supabase linter warning about a SECURITY DEFINER function
-- being callable by everyone.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- Trigger: fires on every new auth.users INSERT.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Backfill: catch any auth users that signed up while the trigger was
-- missing and don't have a profile row yet. INSERT-with-ON-CONFLICT
-- means already-correct users are untouched; only the orphaned ones
-- (no profile row) get a fresh row created. Idempotent.
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

notify pgrst, 'reload schema';
