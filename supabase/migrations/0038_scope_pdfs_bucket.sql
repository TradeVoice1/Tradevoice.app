-- =============================================================================
-- Tradevoice — scope-analysis PDF storage bucket (Elite feature)
-- =============================================================================
-- Contractors on the Elite tier can drop a PDF into the QuoteEditor scope
-- tab and have Claude + Perplexity collaborate on extracting a precise
-- scope of work. The PDF needs to live somewhere that:
--   • The browser can upload to directly (avoids the 4.5MB Vercel
--     serverless body limit — blueprints often run 10-25MB)
--   • The analysis Edge Function can read with service-role privs
--   • RLS scopes uploads to the owner so contractors can't peek at
--     each other's files
--   • Files can be cleaned up after analysis (these are transient —
--     once Claude has read them, we don't need to keep them around)
--
-- Bucket naming follows the existing pattern (logos = 'company-logos',
-- job photos = 'job-photos'). RLS pattern mirrors company-logos
-- (migration 0004): folder structure is <userId>/<file-name>, policy
-- checks the first path segment matches auth.uid().
-- =============================================================================

insert into storage.buckets (id, name, public)
  values ('scope-pdfs', 'scope-pdfs', false)
  on conflict (id) do nothing;

-- File-size cap at the bucket level (Supabase setting). 30MB to give
-- a little headroom over the 25MB front-end limit so legitimate
-- uploads aren't rejected by a tiny encoding delta.
update storage.buckets
   set file_size_limit = 31457280, -- 30 MB in bytes
       allowed_mime_types = array['application/pdf']
 where id = 'scope-pdfs';

-- Owner-scoped RLS — pattern matches company-logos.
drop policy if exists "scope_pdfs_owner_read"   on storage.objects;
drop policy if exists "scope_pdfs_owner_insert" on storage.objects;
drop policy if exists "scope_pdfs_owner_delete" on storage.objects;

create policy "scope_pdfs_owner_read"
  on storage.objects for select
  using (bucket_id = 'scope-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scope_pdfs_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'scope-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scope_pdfs_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'scope-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── AI Scope Analyzer consent timestamp ─────────────────────────────────────
-- One-time consent gate (Terms section 10 "AI-Assisted Features"). The
-- contractor agrees before first use that AI output is advisory, that
-- they will verify all output before using, and that we're not liable
-- for AI errors. After the timestamp is stamped, subsequent uses show
-- a persistent inline reminder banner but don't re-prompt the full
-- consent modal. NULL = never agreed yet → show the consent modal.
alter table public.profiles
  add column if not exists ai_scope_terms_accepted_at timestamptz;
