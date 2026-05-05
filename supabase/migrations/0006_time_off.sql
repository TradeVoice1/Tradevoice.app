-- =============================================================================
-- Tradevoice — tech time-off / availability
-- =============================================================================
-- Block out periods when a tech is unavailable (vacation, sick, training).
-- Schedule UI uses this to:
--   1. Disable the tech in the AddJobModal dropdown when the chosen date falls
--      inside any of their time-off ranges.
--   2. Warn the owner when they drag-reschedule a job onto an off-day.
--   3. Surface "Off MM/DD–MM/DD" tags in the calendar sidebar so the owner
--      sees who's out at a glance.
-- Owner controls all entries; techs can READ their own (so a future
-- "my time off" tab in tech mode can list it).
-- =============================================================================

create table if not exists public.time_off (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  tech_user_id  uuid references auth.users(id) on delete cascade,
  -- Snapshot of the tech name at create time so display still works if the
  -- team_members row is later renamed or deleted.
  tech_name     text,
  start_date    date not null,
  end_date      date not null,
  reason        text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  constraint time_off_range_valid check (end_date >= start_date)
);

create index if not exists time_off_owner_idx on public.time_off (owner_id, start_date);
create index if not exists time_off_tech_idx  on public.time_off (tech_user_id);

alter table public.time_off enable row level security;

drop policy if exists "time_off: owner all"      on public.time_off;
drop policy if exists "time_off: tech read own"  on public.time_off;

create policy "time_off: owner all"
  on public.time_off for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- A tech can read their own off entries (for a future "my time off" view).
create policy "time_off: tech read own"
  on public.time_off for select
  using (auth.uid() = tech_user_id);

-- Reuse the updated_at trigger.
drop trigger if exists set_updated_at on public.time_off;
create trigger set_updated_at before update on public.time_off
  for each row execute function public.set_updated_at();
