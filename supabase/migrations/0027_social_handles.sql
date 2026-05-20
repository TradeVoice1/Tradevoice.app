-- =============================================================================
-- Tradevoice — social media handles on contractor profiles
-- =============================================================================
-- Lots of contractors do real marketing on Facebook, Instagram, TikTok, and
-- X — "follow us at @..." on invoices/quotes is a small but real
-- conversion lever for repeat business and referrals. Stores per-platform
-- handle/URL on profiles.social_handles, an open-ended JSONB so adding a
-- new platform later (YouTube, LinkedIn, Threads, etc.) doesn't require
-- another migration.
--
-- Shape:
--   {
--     "facebook":  "https://facebook.com/cornerstonemech" | "cornerstonemech",
--     "twitter":   "@cornerstonemech" | "cornerstonemech",
--     "instagram": "@cornerstonemech" | "cornerstonemech",
--     "tiktok":    "@cornerstonemech" | "cornerstonemech"
--   }
--
-- The front-end normalizes each value into a URL at render time so
-- contractors can paste either a full URL or just their handle.
-- Empty / missing keys are ignored on display (same convention as
-- payment_handles).
-- =============================================================================

alter table public.profiles
  add column if not exists social_handles jsonb not null default '{}'::jsonb;

-- No index needed — this column is read alongside the rest of the profile
-- row (1:1 with id) and never queried independently.

-- ── Re-create get_public_invoice to surface social_handles ──────────────────
-- The public invoice viewer needs the contractor's social handles so it
-- can render the "Follow us on …" footer next to "How to Pay". Mirror
-- of migration 0024's definition, with `social_handles` added to the
-- profile sub-select. All other behavior (viewed_at stamping, status
-- flip on first open, etc.) is unchanged.
create or replace function public.get_public_invoice(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $vi3$
declare
  inv record;
  prof record;
begin
  if p_token is null then return null; end if;

  select * into inv from public.invoices where share_token = p_token limit 1;
  if not found then return null; end if;

  if inv.status = 'sent' then
    update public.invoices
       set status     = 'viewed',
           viewed_at  = coalesce(viewed_at, now())
     where id = inv.id;
    inv.status    := 'viewed';
    inv.viewed_at := coalesce(inv.viewed_at, now());
  elsif inv.viewed_at is null then
    update public.invoices
       set viewed_at = now()
     where id = inv.id and viewed_at is null;
    inv.viewed_at := now();
  end if;

  select
    name, company, phone, tagline, license,
    payments, accent_color, logo_url,
    stripe_account_id, stripe_account_charges_enabled,
    coi_carrier, coi_policy_number, coi_expires_at,
    default_late_fee_policy,
    social_handles
  into prof
  from public.profiles where id = inv.owner_id;

  return json_build_object(
    'invoice', row_to_json(inv),
    'profile', case when prof is null then null else row_to_json(prof) end
  );
end;
$vi3$;

revoke execute on function public.get_public_invoice(uuid) from public;
grant  execute on function public.get_public_invoice(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
