-- =============================================================================
-- Tradevoice — company logo storage
-- =============================================================================
-- Creates the public "company-logos" bucket and locks down who can write.
-- Path convention: <userId>/logo-<timestamp>.<ext>
-- The first folder segment (userId) is what RLS keys off of.
-- =============================================================================

-- Bucket: public so logos render in <img> tags without signed URLs.
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- Optional: cap individual files at 2 MB.
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp','image/gif']
 where id = 'company-logos';

-- Wipe any prior policies before re-creating.
drop policy if exists "logos: public read"        on storage.objects;
drop policy if exists "logos: owner upload"       on storage.objects;
drop policy if exists "logos: owner update"       on storage.objects;
drop policy if exists "logos: owner delete"       on storage.objects;

-- Anyone can READ logo files (so the public-facing invoice page can show them).
create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'company-logos');

-- A user can INSERT a file ONLY into their own folder (first path segment must equal their auth.uid()).
create policy "logos: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Same for UPDATE.
create policy "logos: owner update"
  on storage.objects for update
  using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Same for DELETE — used to clean up old logos when a user replaces theirs.
create policy "logos: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
