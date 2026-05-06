-- =============================================================================
-- Tradevoice — owner-issued tech accounts
-- =============================================================================
-- Tech onboarding model: the owner (master account) buys a "tech seat" for
-- $19.99/mo, fills out the new tech's profile, and the system mints a unique
-- Tech ID + initial password. The owner shares those creds with the tech.
-- The tech signs in with the Tech ID (not an email), is forced to set a new
-- password on first login, and only ever sees the data the owner gave them
-- access to via permissions.
--
-- Why this model:
--   - Owner pays per seat → revenue captures correctly
--   - No rogue signups via leaked company codes
--   - Tech doesn't need an email account
--   - Permissions are set at create-time, not after-the-fact
--
-- Schema additions to team_members:
--   tech_id              — the unique ID the tech enters at login (e.g. TV-T-K3M9R7)
--   branch               — owner-defined location/region tag (e.g. "Houston North")
--   phone                — tech's phone number (optional, for the owner's records)
--   must_change_password — true on creation; flips false after first login.
--                          Used by the front-end to force a password reset.
-- =============================================================================

alter table public.team_members
  add column if not exists tech_id              text unique,
  add column if not exists branch               text,
  add column if not exists phone                text,
  add column if not exists must_change_password boolean default true;

-- Fast lookup by tech_id (used after auth to load tech's profile/perms).
create index if not exists team_members_tech_id_idx on public.team_members (tech_id);

-- The sign-in flow derives the Supabase auth email deterministically from
-- the Tech ID (tech-<id>@tradevoice.app), so we never query team_members
-- pre-auth. Once authenticated, the tech needs to read their OWN row to
-- pick up their permissions + branch + must_change_password flag.
drop policy if exists "team_members: tech read self" on public.team_members;
create policy "team_members: tech read self"
  on public.team_members for select
  using (auth.uid() = user_id);

-- And update self — needed to flip must_change_password to false after the
-- tech sets a new password.
drop policy if exists "team_members: tech update self" on public.team_members;
create policy "team_members: tech update self"
  on public.team_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
