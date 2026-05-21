-- =============================================================================
-- Tradevoice — super-owner (god-mode) account + TOTP gating, Phase 1
-- =============================================================================
-- Phase 1 of the founder admin dashboard. This migration is the security
-- backbone — it adds the `is_super_owner` flag + TOTP-related columns to
-- profiles, plus the RLS policies that let the super-owner SELECT every
-- contractor's account (read-only).
--
-- Architectural notes:
--   • Exactly one account gets is_super_owner = true. The unique partial
--     index below enforces "at most one" at the DB level so a future
--     mistake can't create a second admin by accident.
--   • The super-owner gets READ access to other accounts via additional
--     SELECT policies. INSERT/UPDATE/DELETE policies still require
--     `auth.uid() = owner_id` — even when logged in as super-owner you
--     can't mutate a customer's data through the dashboard. Protects
--     you from accidents while browsing.
--   • TOTP code verification happens in a Phase-2 Edge Function (Deno
--     has otpauth libs; Postgres would have to roll its own HMAC-SHA1).
--     This migration just stores the secret + the last-unlock timestamp.
--   • After deploy, flag the owner account by running THIS in Supabase
--     SQL editor (only works once the matthew@thetradevoice.com account
--     exists in auth.users):
--
--       update public.profiles
--          set is_super_owner = true
--        where id = (select id from auth.users
--                     where email = 'matthew@thetradevoice.com');
--
--   • The Phase-2 Edge Function will reject any unlock attempt where
--     the caller's profile has is_super_owner = false, so flagging is
--     the explicit handshake that turns the feature on.
-- =============================================================================

alter table public.profiles
  add column if not exists is_super_owner               boolean     default false not null,
  -- Base32-encoded TOTP shared secret. NULL until 2FA is set up via
  -- the Phase-2 setup flow. Readable by the user who owns the row
  -- (they need it to re-pair an authenticator app if they lose theirs);
  -- never returned through any public RPC.
  add column if not exists super_owner_totp_secret      text,
  add column if not exists super_owner_totp_enabled_at  timestamptz,
  -- Last successful TOTP verification. The dashboard checks
  -- now() - super_owner_unlock_at < 30 min before rendering data;
  -- otherwise it re-prompts. Updated by the unlock Edge Function.
  add column if not exists super_owner_unlock_at        timestamptz;

-- "At most one super-owner" enforcement. Partial unique index on the
-- boolean (which only has one possible value, true, in the indexed
-- rows) means no second row can be flagged true simultaneously.
create unique index if not exists profiles_single_super_owner_idx
  on public.profiles (is_super_owner) where is_super_owner = true;

-- ── Helper: is_super_owner(uid) ─────────────────────────────────────────────
-- Used inside RLS policies on other tables. Marked SECURITY DEFINER so
-- the lookup against profiles bypasses RLS (otherwise we'd recurse:
-- profiles policy calls is_super_owner, which queries profiles, which
-- triggers the policy again, infinite loop). `stable` because the
-- result doesn't change within a single statement.
create or replace function public.is_super_owner(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce(
    (select is_super_owner from public.profiles where id = uid),
    false
  );
$func$;

revoke all on function public.is_super_owner(uuid) from public;
grant execute on function public.is_super_owner(uuid) to authenticated;

-- ── profiles RLS: extend SELECT to allow super-owner ────────────────────────
-- Original policy only allowed reading your own profile. Now extends
-- to: own profile OR the requester is the super-owner. INSERT/UPDATE
-- policies are untouched — even super-owner can only mutate THEIR
-- OWN profile row (no editing customers from the dashboard).
drop policy if exists "profiles: read own"           on public.profiles;
drop policy if exists "profiles: read own or super" on public.profiles;
create policy "profiles: read own or super"
  on public.profiles for select
  using (auth.uid() = id OR public.is_super_owner(auth.uid()));

-- ── team_members RLS: super-owner can SELECT all rows ───────────────────────
-- For the dashboard's "tech seats per account" tally. Existing
-- "team: owner manage" (for all) and "team: self read" (for select)
-- policies stay in place — RLS combines policies with OR so adding
-- a third SELECT-only policy just widens read access for the super
-- account. Owners and techs are unaffected.
create policy "team: super owner read"
  on public.team_members for select
  using (public.is_super_owner(auth.uid()));

-- ── invoices / quotes / jobs RLS: super-owner read for tallies + drill-down
-- These power the per-account drill-down (Phase 4) — total invoiced,
-- total jobs scheduled, etc. Add SELECT-only policies for the super
-- owner; the existing "for all" owner policies stay intact.
create policy "invoices: super owner read"
  on public.invoices for select
  using (public.is_super_owner(auth.uid()));

create policy "quotes: super owner read"
  on public.quotes for select
  using (public.is_super_owner(auth.uid()));

create policy "jobs: super owner read"
  on public.jobs for select
  using (public.is_super_owner(auth.uid()));

notify pgrst, 'reload schema';
