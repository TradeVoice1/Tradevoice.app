-- =============================================================================
-- Tradevoice — tech visibility on jobs
-- =============================================================================
-- The original "jobs: owner all" RLS policy only let the owner see/edit jobs.
-- That blocks the tech-side schedule view. This migration replaces it with two
-- policies: owner has full control, assigned tech can read + update their own
-- jobs (the UI restricts what they can change).
-- =============================================================================

drop policy if exists "jobs: owner all"        on public.jobs;
drop policy if exists "jobs: owner manage"     on public.jobs;
drop policy if exists "jobs: tech read"        on public.jobs;
drop policy if exists "jobs: tech update"      on public.jobs;

-- Owner: full control over all jobs in their company.
create policy "jobs: owner manage"
  on public.jobs for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Tech: can read jobs assigned to them.
create policy "jobs: tech read"
  on public.jobs for select
  using (auth.uid() = tech_user_id);

-- Tech: can update jobs assigned to them. UI is responsible for limiting which
-- fields they touch (in practice: status, notes, completion timestamp).
create policy "jobs: tech update"
  on public.jobs for update
  using (auth.uid() = tech_user_id)
  with check (auth.uid() = tech_user_id);
