-- Tradevoice — restore handle_new_user after it was overwritten
-- =============================================================================
-- Found during the pre-launch smoke test on 2026-06-11: EVERY signup failed
-- with "Database error saving new user" at the card step.
--
-- Root cause: the live handle_new_user() function had been replaced with a
-- generic Supabase-boilerplate version written against a schema Tradevoice
-- has never used:
--
--     INSERT INTO public.profiles (user_id, email, first_name, last_name)
--     VALUES (NEW.id, NEW.email, ...)
--
-- public.profiles has none of those columns — its PK is `id` (FK to
-- auth.users) and the display name lives in `name`. So the INSERT raised
-- undefined_column, the trigger aborted, and because the trigger fires
-- inside the auth.users INSERT transaction, Supabase rolled the whole
-- signup back and surfaced its generic "Database error saving new user".
--
-- Not applied from this repo — every committed definition (0001, 0028) is
-- the correct one-column insert. It was almost certainly pasted into the
-- dashboard SQL editor (boilerplate or an AI suggestion) at some point.
--
-- This restores the 0028 definition verbatim. Idempotent: `create or
-- replace` plus `on conflict do nothing`, and the trigger is only created
-- if it's missing.
-- =============================================================================

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

-- Triggers run regardless of EXECUTE grants, so keep this function
-- unreachable from the client roles (mirrors migration 0022).
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- Re-attach the trigger if it went missing along with the definition.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created' and not tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;
