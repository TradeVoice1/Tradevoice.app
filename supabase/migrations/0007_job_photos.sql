-- =============================================================================
-- Tradevoice — job photos
-- =============================================================================
-- Field techs snap before/after photos on a job; photos surface on the
-- invoice that's eventually generated from the job. Files live in the
-- public "job-photos" bucket; metadata (url + label + timestamp) is
-- stored in a JSONB array on the jobs row so we can read it in one query.
--
-- Path convention: <userId>/<jobId>/photo-<timestamp>.<ext>
--   - userId is the auth.uid() of whoever uploaded (owner OR assigned tech)
--   - jobId scopes deletes when a job is removed
-- =============================================================================

-- Photos array on the job. Each entry: { url, label?, addedBy?, addedAt }.
alter table public.jobs
  add column if not exists photos jsonb not null default '[]'::jsonb;

-- ── Storage bucket ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

-- 8 MB cap per file (phone photos can be chunky); allow common image formats.
update storage.buckets
   set file_size_limit = 8388608,
       allowed_mime_types = array['image/png','image/jpeg','image/jpg','image/webp','image/heic','image/heif']
 where id = 'job-photos';

-- Wipe any prior policies before re-creating.
drop policy if exists "job-photos: public read"        on storage.objects;
drop policy if exists "job-photos: owner upload"       on storage.objects;
drop policy if exists "job-photos: owner update"       on storage.objects;
drop policy if exists "job-photos: owner delete"       on storage.objects;

-- Anyone can READ photo files (so the eventual public invoice page can show them).
create policy "job-photos: public read"
  on storage.objects for select
  using (bucket_id = 'job-photos');

-- INSERT: file path's first segment must equal the uploader's auth.uid().
-- Tech accounts get their own auth user, so they upload into their own folder.
create policy "job-photos: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'job-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE: same rule.
create policy "job-photos: owner update"
  on storage.objects for update
  using (
    bucket_id = 'job-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: same rule. Used when removing a single photo from a job.
create policy "job-photos: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'job-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
