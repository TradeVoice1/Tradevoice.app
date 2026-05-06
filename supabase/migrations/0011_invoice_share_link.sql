-- =============================================================================
-- Tradevoice — public sharable invoice links
-- =============================================================================
-- When the contractor (owner or tech) clicks "Send" on an invoice, they get a
-- URL like https://app.thetradevoice.com/i/<share_token> that the customer can
-- open without an account to view the invoice + payment instructions.
--
-- Security model:
--   - Each invoice gets a random UUID share_token at insert time.
--   - RLS still locks invoices.SELECT to the owner — the public path uses an
--     RPC function (security definer) that returns one invoice given a token.
--   - The token is 122 bits of entropy → not enumerable.
--   - Anyone with the link can view the invoice; that's the point of the link.
-- =============================================================================

alter table public.invoices
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists invoices_share_token_idx on public.invoices (share_token);

-- Public lookup function — bypasses RLS via security definer. Returns the
-- invoice + a small subset of the owner's profile (company branding + payment
-- instructions). Returns null if no row matches the token.
create or replace function public.get_public_invoice(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  prof record;
begin
  if p_token is null then return null; end if;

  select * into inv from public.invoices where share_token = p_token limit 1;
  if not found then return null; end if;

  -- Pull the owner's branding + payment methods. Don't expose email/auth fields.
  select
    name, company, phone, tagline, license,
    payments, accent_color, logo_url
  into prof
  from public.profiles where id = inv.owner_id;

  return json_build_object(
    'invoice', row_to_json(inv),
    'profile', case when prof is null then null else row_to_json(prof) end
  );
end;
$$;

-- Allow anonymous + authenticated users to call the public lookup.
grant execute on function public.get_public_invoice(uuid) to anon, authenticated;
