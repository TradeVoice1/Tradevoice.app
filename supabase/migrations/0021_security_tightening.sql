-- =============================================================================
-- Tradevoice — security tightening from Supabase Security Advisor warnings
-- =============================================================================
-- Two fixes:
--
--   1. Storage buckets (company-logos, job-photos) previously had a
--      wide-open "select using bucket_id = ..." policy. That permitted
--      anonymous LIST requests against the bucket, which lets a scraper
--      enumerate every file ever uploaded across all contractors.
--      Job photos can contain customer property shots — not great.
--
--      Replace with "authenticated only" SELECT. Direct file access via
--      the public CDN URL (/storage/v1/object/public/...) bypasses RLS,
--      so invoice/quote pages rendered for anonymous customers continue
--      to display the embedded logo + photos. Only the LIST endpoint and
--      the authenticated-read endpoint are now gated.
--
--   2. Three trigger functions from migration 0012 don't pin search_path.
--      They're trigger-only so the exploit surface is tiny, but pinning
--      it removes the Security Advisor warning and is good hygiene.
-- =============================================================================

-- ── Storage: company-logos ──────────────────────────────────────────────────
drop policy if exists "logos: public read" on storage.objects;
create policy "logos: authenticated read"
  on storage.objects for select
  using (
    bucket_id = 'company-logos'
    and auth.role() = 'authenticated'
  );

-- ── Storage: job-photos ─────────────────────────────────────────────────────
drop policy if exists "job-photos: public read" on storage.objects;
create policy "job-photos: authenticated read"
  on storage.objects for select
  using (
    bucket_id = 'job-photos'
    and auth.role() = 'authenticated'
  );

-- ── Function search_path pinning (migration 0012 trigger functions) ─────────
-- Using ALTER ... SET so we don't need to re-declare the function body. The
-- guards below are belt-and-suspenders in case any function was renamed
-- between environments.
do $sec1$
begin
  if exists (select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'assign_invoice_number') then
    execute 'alter function public.assign_invoice_number() set search_path = public';
  end if;
  if exists (select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'assign_quote_number') then
    execute 'alter function public.assign_quote_number() set search_path = public';
  end if;
  if exists (select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'set_updated_at') then
    execute 'alter function public.set_updated_at() set search_path = public';
  end if;
end $sec1$;
